import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Inbound half of the ERP/WMS/billing connectors — applies events pushed
 * by external systems onto CRM data. Every call is logged to
 * ConnectorEventLog first (even unrecognised event types) so nothing sent
 * by a partner system is silently dropped.
 */
@Injectable()
export class WebhookReceiverService {
  private readonly logger = new Logger(WebhookReceiverService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async log(connector: string, eventType: string, payload: unknown, status: "RECEIVED" | "PROCESSED" | "FAILED", errorMessage?: string) {
    await this.prisma.connectorEventLog.create({
      data: { connector, direction: "INBOUND", eventType, payload: payload as any, status, errorMessage },
    });
  }

  async handleBillingEvent(eventType: string, data: Record<string, any>) {
    await this.log("billing", eventType, data, "RECEIVED");
    try {
      switch (eventType) {
        case "invoice.paid": {
          const invoice = await this.prisma.invoice.findUnique({ where: { reference: data.reference } });
          if (!invoice) throw new Error(`Facture introuvable pour la référence ${data.reference}`);
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "PAYEE", paidAt: data.paidAt ? new Date(data.paidAt) : new Date() },
          });
          break;
        }
        case "invoice.created":
        case "invoice.updated": {
          if (!data.companyId) throw new Error("companyId manquant");
          await this.prisma.invoice.upsert({
            where: { reference: data.reference },
            create: {
              companyId: data.companyId,
              reference: data.reference,
              amountHt: data.amountHt,
              vatAmount: data.vatAmount,
              amountTtc: data.amountTtc,
              issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
              dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
              status: data.status ?? "EN_ATTENTE",
            },
            update: {
              amountHt: data.amountHt,
              vatAmount: data.vatAmount,
              amountTtc: data.amountTtc,
              dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
              status: data.status,
            },
          });
          break;
        }
        default:
          this.logger.warn(`Événement billing non géré : ${eventType}`);
      }
      await this.log("billing", eventType, data, "PROCESSED");
    } catch (error) {
      await this.log("billing", eventType, data, "FAILED", (error as Error).message);
      throw error;
    }
  }

  async handleWmsEvent(eventType: string, data: Record<string, any>) {
    await this.log("wms", eventType, data, "RECEIVED");
    try {
      switch (eventType) {
        case "warehouse.threshold_alert": {
          if (!data.companyId) throw new Error("companyId manquant");
          await this.prisma.taskItem.create({
            data: {
              companyId: data.companyId,
              title: "Alerte WMS — seuil de stock atteint",
              description: data.message ?? "Le WMS signale un seuil de stock atteint pour ce client.",
              dueAt: new Date(),
              isAutomatic: true,
            },
          });
          break;
        }
        case "shipment.completed": {
          if (!data.companyId) throw new Error("companyId manquant");
          await this.prisma.activity.create({
            data: {
              companyId: data.companyId,
              type: "NOTE",
              subject: "Expédition WMS terminée",
              summary: data.details ?? `Expédition ${data.reference ?? ""} confirmée par le WMS.`,
              occurredAt: data.completedAt ? new Date(data.completedAt) : new Date(),
            },
          });
          break;
        }
        default:
          this.logger.warn(`Événement WMS non géré : ${eventType}`);
      }
      await this.log("wms", eventType, data, "PROCESSED");
    } catch (error) {
      await this.log("wms", eventType, data, "FAILED", (error as Error).message);
      throw error;
    }
  }

  listLogs(connector?: string) {
    return this.prisma.connectorEventLog.findMany({
      where: connector ? { connector } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
