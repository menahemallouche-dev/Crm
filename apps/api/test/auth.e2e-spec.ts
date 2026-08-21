import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapTestApp } from "./utils/bootstrap";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-auth-${randomUUID()}@gecodis.fr`;
  const password = "Test1234!";

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("POST /api/auth/register creates a staff account and returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password, firstName: "Test", lastName: "E2E" })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
  });

  it("POST /api/auth/register rejects a duplicate email", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password, firstName: "Test", lastName: "E2E" })
      .expect(400);
  });

  it("POST /api/auth/login rejects a wrong password", async () => {
    await request(app.getHttpServer()).post("/api/auth/login").send({ email, password: "wrong-password" }).expect(401);
  });

  it("POST /api/auth/login rejects an unknown email", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "nobody@gecodis.fr", password: "whatever123" })
      .expect(401);
  });

  it("POST /api/auth/login succeeds with the right credentials", async () => {
    const res = await request(app.getHttpServer()).post("/api/auth/login").send({ email, password }).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it("GET /api/auth/me returns the authenticated user with a valid token", async () => {
    const login = await request(app.getHttpServer()).post("/api/auth/login").send({ email, password });
    const res = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body.googleLinked).toBe(false);
  });

  it("GET /api/auth/me rejects a missing token", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("GET /api/auth/me rejects a garbage token", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token").expect(401);
  });

  it("GET /api/auth/providers reports Google as disabled when no OAuth credentials are configured", async () => {
    const res = await request(app.getHttpServer()).get("/api/auth/providers").expect(200);
    expect(res.body.googleEnabled).toBe(false);
  });

  it("GET /api/companies requires authentication", async () => {
    await request(app.getHttpServer()).get("/api/companies").expect(401);
  });
});
