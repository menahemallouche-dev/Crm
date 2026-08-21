import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapTestApp } from "./utils/bootstrap";

describe("Client portal (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const portalPassword = "Client1234!";
  let companyA: { id: string };
  let companyB: { id: string };
  let quoteForCompanyA: { id: string };
  let staffAccessToken: string;
  let portalAccessToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());

    companyA = await prisma.company.create({ data: { name: `Portal Test Co A ${suffix}` } });
    companyB = await prisma.company.create({ data: { name: `Portal Test Co B ${suffix}` } });

    quoteForCompanyA = await prisma.quote.create({
      data: { companyId: companyA.id, reference: `E2E-${suffix}`, amountHt: 1000, vatRate: 20, amountTtc: 1200 },
    });

    const passwordHash = await argon2.hash(portalPassword);
    await prisma.portalUser.create({
      data: { companyId: companyA.id, email: `portal-${suffix}@companyA.fr`, passwordHash },
    });

    // Staff account, used to prove staff tokens are rejected on portal routes and vice versa.
    const staffRegister = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: `staff-${suffix}@gecodis.fr`, password: "Staff1234!", firstName: "Staff", lastName: "E2E", role: "ADMIN" });
    staffAccessToken = staffRegister.body.accessToken;

    const portalLogin = await request(app.getHttpServer())
      .post("/api/portal/auth/login")
      .send({ email: `portal-${suffix}@companyA.fr`, password: portalPassword });
    portalAccessToken = portalLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.portalUser.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.quote.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.user.deleteMany({ where: { email: `staff-${suffix}@gecodis.fr` } });
    await app.close();
  });

  it("logs a portal user in and returns their company", async () => {
    expect(portalAccessToken).toEqual(expect.any(String));
    const res = await request(app.getHttpServer())
      .get("/api/portal/me")
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .expect(200);
    expect(res.body.id).toBe(companyA.id);
  });

  it("rejects portal login with the wrong password", async () => {
    await request(app.getHttpServer())
      .post("/api/portal/auth/login")
      .send({ email: `portal-${suffix}@companyA.fr`, password: "wrong-password" })
      .expect(401);
  });

  it("a portal token is rejected on a staff-only route", async () => {
    await request(app.getHttpServer())
      .get("/api/companies")
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .expect(401);
  });

  it("a staff token is rejected on a portal route", async () => {
    await request(app.getHttpServer())
      .get("/api/portal/me")
      .set("Authorization", `Bearer ${staffAccessToken}`)
      .expect(401);
  });

  it("a portal user sees their own company's quotes", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/portal/quotes")
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .expect(200);
    expect(res.body.map((q: any) => q.id)).toContain(quoteForCompanyA.id);
  });

  it("a portal user cannot fetch a quote belonging to a different company", async () => {
    const otherQuote = await prisma.quote.create({
      data: { companyId: companyB.id, reference: `E2E-OTHER-${suffix}`, amountHt: 500, vatRate: 20, amountTtc: 600 },
    });

    await request(app.getHttpServer())
      .get(`/api/portal/quotes/${otherQuote.id}/pdf`)
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .expect(404);

    await prisma.quote.delete({ where: { id: otherQuote.id } });
  });

  it("a portal user can sign their own quote and it transitions to SIGNE", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/portal/quotes/${quoteForCompanyA.id}/sign`)
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .send({ signedByName: "Test Client" })
      .expect(201);

    expect(res.body.status).toBe("SIGNE");
  });

  it("signing an already-signed quote is rejected", async () => {
    await request(app.getHttpServer())
      .post(`/api/portal/quotes/${quoteForCompanyA.id}/sign`)
      .set("Authorization", `Bearer ${portalAccessToken}`)
      .send({ signedByName: "Test Client Again" })
      .expect(403);
  });

  it("staff can invite a new portal user for a company and it can log in", async () => {
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/companies/${companyB.id}/portal-users`)
      .set("Authorization", `Bearer ${staffAccessToken}`)
      .send({ email: `portal2-${suffix}@companyB.fr`, password: "Client1234!" })
      .expect(201);

    expect(inviteRes.body.email).toBe(`portal2-${suffix}@companyB.fr`);
    expect(inviteRes.body.passwordHash).toBeUndefined(); // never leak the hash

    const login = await request(app.getHttpServer())
      .post("/api/portal/auth/login")
      .send({ email: `portal2-${suffix}@companyB.fr`, password: "Client1234!" })
      .expect(201);
    expect(login.body.company.id).toBe(companyB.id);
  });
});
