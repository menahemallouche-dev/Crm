import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import { createHmac } from "crypto";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapTestApp } from "./utils/bootstrap";

function sign(body: unknown, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
}

describe("Webhooks (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const billingSecret = process.env.BILLING_SOFTWARE_WEBHOOK_SECRET as string;
  const suffix = randomUUID().slice(0, 8);

  let company: { id: string };
  let invoice: { id: string; reference: string };

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    company = await prisma.company.create({ data: { name: `Webhook Test Co ${suffix}` } });
    invoice = await prisma.invoice.create({
      data: { companyId: company.id, reference: `WH-${suffix}`, amountHt: 1000, amountTtc: 1200, status: "EN_ATTENTE" },
    });
  });

  afterAll(async () => {
    // ConnectorEventLog rows are an audit trail, not FK-linked to Company — left in
    // place intentionally, same as production behaviour after an entity is deleted.
    await prisma.activity.deleteMany({ where: { companyId: company.id } });
    await prisma.invoice.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await app.close();
  });

  it("rejects a billing webhook with no signature header", async () => {
    const body = { event: "invoice.paid", data: { reference: invoice.reference } };
    await request(app.getHttpServer()).post("/api/webhooks/billing").send(body).expect(403);
  });

  it("rejects a billing webhook with a wrong signature", async () => {
    const body = { event: "invoice.paid", data: { reference: invoice.reference } };
    await request(app.getHttpServer())
      .post("/api/webhooks/billing")
      .set("X-Gecodis-Signature", "0".repeat(64))
      .send(body)
      .expect(403);
  });

  it("accepts a correctly-signed invoice.paid event and marks the invoice PAYEE", async () => {
    const body = { event: "invoice.paid", data: { reference: invoice.reference, paidAt: "2026-01-15T00:00:00.000Z" } };
    const signature = sign(body, billingSecret);

    await request(app.getHttpServer())
      .post("/api/webhooks/billing")
      .set("X-Gecodis-Signature", signature)
      .send(body)
      .expect(201)
      .expect({ received: true });

    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updated.status).toBe("PAYEE");
    expect(updated.paidAt?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("rejects an unknown reference gracefully (still signed correctly, but no matching invoice)", async () => {
    const body = { event: "invoice.paid", data: { reference: "DOES-NOT-EXIST" } };
    const signature = sign(body, billingSecret);

    await request(app.getHttpServer()).post("/api/webhooks/billing").set("X-Gecodis-Signature", signature).send(body).expect(500);
  });

  it("logs every inbound attempt to ConnectorEventLog, including failures", async () => {
    const logs = await prisma.connectorEventLog.findMany({
      where: { connector: "billing", direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    expect(logs.some((l) => l.status === "PROCESSED")).toBe(true);
    expect(logs.some((l) => l.status === "FAILED")).toBe(true);
  });

  it("rejects a WMS webhook signed with the billing secret (wrong connector)", async () => {
    const body = { event: "shipment.completed", data: { companyId: company.id } };
    const wrongSignature = sign(body, billingSecret);

    await request(app.getHttpServer()).post("/api/webhooks/wms").set("X-Gecodis-Signature", wrongSignature).send(body).expect(403);
  });

  it("accepts a correctly-signed WMS shipment.completed event and logs an activity", async () => {
    const wmsSecret = process.env.WMS_WEBHOOK_SECRET as string;
    const body = { event: "shipment.completed", data: { companyId: company.id, reference: "SHIP-1" } };
    const signature = sign(body, wmsSecret);

    await request(app.getHttpServer()).post("/api/webhooks/wms").set("X-Gecodis-Signature", signature).send(body).expect(201);

    const activities = await prisma.activity.findMany({ where: { companyId: company.id, type: "NOTE" } });
    expect(activities.length).toBeGreaterThan(0);
  });
});
