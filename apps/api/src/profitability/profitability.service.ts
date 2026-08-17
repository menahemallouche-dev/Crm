import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddCostEntryDto } from "./dto/profitability.dto";

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function rate(marginPercent: number): "EXCELLENT" | "BON" | "FAIBLE" | "A_RISQUE" {
  if (marginPercent >= 25) return "EXCELLENT";
  if (marginPercent >= 12) return "BON";
  if (marginPercent >= 0) return "FAIBLE";
  return "A_RISQUE";
}

@Injectable()
export class ProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  addCost(dto: AddCostEntryDto) {
    return this.prisma.costEntry.create({
      data: { ...dto, period: monthStart(new Date(dto.period)) },
    });
  }

  listCosts(companyId: string) {
    return this.prisma.costEntry.findMany({ where: { companyId }, orderBy: { period: "desc" } });
  }

  /** Recomputes CA / coûts / marge for one company + month, from invoices and cost entries. */
  async recompute(companyId: string, periodInput: Date) {
    const period = monthStart(periodInput);
    const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const [invoices, costs] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { companyId, issuedAt: { gte: period, lt: periodEnd }, status: { not: "ANNULEE" } },
      }),
      this.prisma.costEntry.findMany({ where: { companyId, period } }),
    ]);

    const revenue = invoices.reduce((sum, inv) => sum + (inv.amountHt ?? 0), 0);
    const byCategory = (cat: string) => costs.filter((c) => c.category === cat).reduce((s, c) => s + c.amount, 0);
    const transportCost = byCategory("TRANSPORT");
    const storageCost = byCategory("STOCKAGE");
    const prepCost = byCategory("PREPARATION");
    const savCost = byCategory("SAV");
    const palletCost = byCategory("PALETTES");
    const handlingCost = byCategory("MANUTENTION");
    const otherCost = byCategory("AUTRE");

    const totalCost = transportCost + storageCost + prepCost + savCost + palletCost + handlingCost + otherCost;
    const marginAmount = revenue - totalCost;
    const marginPercent = revenue > 0 ? (marginAmount / revenue) * 100 : 0;

    return this.prisma.profitabilityRecord.upsert({
      where: { companyId_period: { companyId, period } },
      create: {
        companyId,
        period,
        revenue,
        transportCost,
        storageCost,
        prepCost,
        savCost,
        palletCost,
        handlingCost,
        otherCost,
        marginAmount,
        marginPercent,
        rating: rate(marginPercent),
      },
      update: {
        revenue,
        transportCost,
        storageCost,
        prepCost,
        savCost,
        palletCost,
        handlingCost,
        otherCost,
        marginAmount,
        marginPercent,
        rating: rate(marginPercent),
        computedAt: new Date(),
      },
    });
  }

  async recomputeAllForCompany(companyId: string) {
    const periods = await this.prisma.$queryRaw<{ period: Date }[]>`
      SELECT DISTINCT "period" FROM "CostEntry" WHERE "companyId" = ${companyId}
      UNION
      SELECT DISTINCT date_trunc('month', "issuedAt") as period FROM "Invoice" WHERE "companyId" = ${companyId} AND "issuedAt" IS NOT NULL
    `;
    return Promise.all(periods.map((p) => this.recompute(companyId, new Date(p.period))));
  }

  history(companyId: string) {
    return this.prisma.profitabilityRecord.findMany({ where: { companyId }, orderBy: { period: "asc" } });
  }

  async rankings(type: "top-ca" | "top-margin" | "top-loss" = "top-ca", limit = 100) {
    // Latest period per company, aggregated.
    const records = await this.prisma.profitabilityRecord.findMany({
      include: { company: { select: { id: true, name: true } } },
      orderBy: { period: "desc" },
    });
    const latestByCompany = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      if (!latestByCompany.has(r.companyId)) latestByCompany.set(r.companyId, r);
    }
    const list = Array.from(latestByCompany.values());

    if (type === "top-margin") list.sort((a, b) => b.marginPercent - a.marginPercent);
    else if (type === "top-loss") list.sort((a, b) => a.marginAmount - b.marginAmount);
    else list.sort((a, b) => b.revenue - a.revenue);

    return list.slice(0, limit);
  }
}
