import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { QUEUE_WEBHOOKS } from "../queue/queue.module";
import { signPayload } from "./signature.util";

export type ConnectorName = "billing" | "wms";

export interface WebhookJobData {
  connector: ConnectorName;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Outbound half of the ERP/WMS/billing connectors. Call `dispatch()` from
 * any service when something happens that an external system should know
 * about (customer created, quote signed, deal won…). Delivery is queued
 * (BullMQ, with retry/backoff) so a slow or down third-party endpoint never
 * blocks the request that triggered the event; every attempt is recorded in
 * ConnectorEventLog for auditability.
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_WEBHOOKS) private readonly webhookQueue: Queue,
  ) {}

  private urlFor(connector: ConnectorName): string | undefined {
    return this.config.get<string>(connector === "billing" ? "BILLING_SOFTWARE_WEBHOOK_URL" : "WMS_WEBHOOK_URL");
  }

  async dispatch(connector: ConnectorName, eventType: string, payload: Record<string, unknown>) {
    if (!this.urlFor(connector)) return; // connector not configured — nothing to do

    const job: WebhookJobData = { connector, eventType, payload };
    try {
      await this.webhookQueue.add("dispatch", job, {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
      });
    } catch (error) {
      this.logger.warn(`File Redis indisponible, envoi webhook synchrone: ${(error as Error).message}`);
      await this.send(job);
    }
  }

  /** Performs the actual HTTP call + audit log; used by the BullMQ processor and as a sync fallback. */
  async send(job: WebhookJobData) {
    const url = this.urlFor(job.connector);
    if (!url) return;

    const secretKey = job.connector === "billing" ? "BILLING_SOFTWARE_WEBHOOK_SECRET" : "WMS_WEBHOOK_SECRET";
    const secret = this.config.get<string>(secretKey) ?? "";
    const body = { event: job.eventType, data: job.payload, sentAt: new Date().toISOString() };
    const signature = signPayload(body, secret);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gecodis-Signature": signature,
          "X-Gecodis-Event": job.eventType,
        },
        body: JSON.stringify(body),
      });

      await this.prisma.connectorEventLog.create({
        data: {
          connector: job.connector,
          direction: "OUTBOUND",
          eventType: job.eventType,
          payload: body as any,
          status: res.ok ? "DELIVERED" : "FAILED",
          errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
        },
      });

      if (!res.ok) throw new Error(`Webhook ${job.connector} a répondu HTTP ${res.status}`);
    } catch (error) {
      await this.prisma.connectorEventLog.create({
        data: {
          connector: job.connector,
          direction: "OUTBOUND",
          eventType: job.eventType,
          payload: body as any,
          status: "FAILED",
          errorMessage: (error as Error).message,
        },
      });
      throw error; // let BullMQ retry
    }
  }
}
