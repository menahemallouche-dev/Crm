import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import * as zlib from "zlib";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapTestApp } from "./utils/bootstrap";

// Restore is deliberately NOT exercised here: it wipes the whole database, which
// would stomp on fixtures created by whichever other e2e spec file runs in the
// same shared test database. It's covered thoroughly at the unit level instead
// (src/backup/backup.service.spec.ts), against a fully mocked Prisma client.
describe("Backups (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  let adminToken: string;
  let commercialToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());

    const admin = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: `backup-admin-${suffix}@gecodis.fr`, password: "Admin1234!", firstName: "Admin", lastName: "E2E", role: "ADMIN" });
    adminToken = admin.body.accessToken;

    const commercial = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: `backup-commercial-${suffix}@gecodis.fr`, password: "Commercial1234!", firstName: "Commercial", lastName: "E2E" });
    commercialToken = commercial.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: `-${suffix}@gecodis.fr` } } });
    await app.close();
  });

  it("GET /api/backups requires authentication", async () => {
    await request(app.getHttpServer()).get("/api/backups").expect(401);
  });

  it("GET /api/backups rejects a non-admin role", async () => {
    await request(app.getHttpServer())
      .get("/api/backups")
      .set("Authorization", `Bearer ${commercialToken}`)
      .expect(403);
  });

  let backupId: string;

  it("POST /api/backups/trigger creates a completed MANUAL backup as admin", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/backups/trigger")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.type).toBe("MANUAL");
    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.sizeBytes).toBeGreaterThan(0);
    expect(res.body.modelCounts).toEqual(expect.objectContaining({ User: expect.any(Number) }));
    backupId = res.body.id;
  });

  it("GET /api/backups lists the backup just created, most recent first", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/backups")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe(backupId);
  });

  it("GET /api/backups/:id/download streams back a valid gzip archive containing the export envelope", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/backups/${backupId}/download`)
      .set("Authorization", `Bearer ${adminToken}`)
      .buffer()
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers["content-type"]).toContain("application/gzip");
    const decoded = JSON.parse(zlib.gunzipSync(res.body).toString("utf-8"));
    expect(decoded.kind).toBe("MODEL");
    expect(decoded.models).toHaveProperty("Company");
  });

  it("POST /api/backups/:id/restore requires explicit confirm:true", async () => {
    await request(app.getHttpServer())
      .post(`/api/backups/${backupId}/restore`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });
});
