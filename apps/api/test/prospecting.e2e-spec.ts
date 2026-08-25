import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapTestApp } from "./utils/bootstrap";

describe("Prospecting / chasse commerciale (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  let accessToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    const staff = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: `prospecting-${suffix}@gecodis.fr`, password: "Test1234!", firstName: "Test", lastName: "E2E" });
    accessToken = staff.body.accessToken;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: `E2E Prospect ${suffix}` } });
    await prisma.user.deleteMany({ where: { email: `prospecting-${suffix}@gecodis.fr` } });
    await app.close();
  });

  it("GET /api/prospecting/search requires authentication", async () => {
    await request(app.getHttpServer()).get("/api/prospecting/search").expect(401);
  });

  it("GET /api/prospecting/search falls back to the demo dataset when no provider is configured, and every result carries a needs/logistics preview", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/prospecting/search")
      .query({ nafCode: "4941A" })
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.provider).toBe("demo");
    expect(res.body.results.length).toBeGreaterThan(0);
    for (const r of res.body.results) {
      expect(r.needsPreview).toBeDefined();
      expect(r.logistics?.logisticsMode).toBeDefined();
    }
  });

  it("POST /api/prospecting/import creates a new company from a search result", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/prospecting/import")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: `E2E Prospect ${suffix}`, city: "Rennes", nafCode: "4941A" })
      .expect(201);

    expect(res.body.alreadyExisted).toBe(false);
    expect(res.body.company.name).toBe(`E2E Prospect ${suffix}`);
  });

  it("POST /api/prospecting/import is idempotent — importing the same name+city twice doesn't create a duplicate", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/prospecting/import")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: `E2E Prospect ${suffix}`, city: "Rennes", nafCode: "4941A" })
      .expect(201);

    expect(res.body.alreadyExisted).toBe(true);

    const count = await prisma.company.count({ where: { name: `E2E Prospect ${suffix}` } });
    expect(count).toBe(1);
  });
});
