import { Injectable } from "@nestjs/common";
import { PIPELINE_STAGE_ORDER, PIPELINE_STAGE_LABELS } from "@gecodis/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [companiesWithWonDeal, totalCompanies, deals, profitability, activities, users, salesTargets] =
      await Promise.all([
        this.prisma.deal.findMany({ where: { stage: "GAGNE" }, select: { companyId: true }, distinct: ["companyId"] }),
        this.prisma.company.count(),
        this.prisma.deal.findMany(),
        this.prisma.profitabilityRecord.findMany(),
        this.prisma.activity.findMany({
          where: { occurredAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
        }),
        this.prisma.user.findMany({ where: { isActive: true } }),
        this.prisma.salesTarget.findMany(),
      ]);

    const clientsCount = companiesWithWonDeal.length;
    const prospectsCount = totalCompanies - clientsCount;

    const totalRevenue = profitability.reduce((sum, p) => sum + p.revenue, 0);
    const totalMargin = profitability.reduce((sum, p) => sum + p.marginAmount, 0);

    const closedDeals = deals.filter((d) => d.stage === "GAGNE" || d.stage === "PERDU");
    const wonDeals = deals.filter((d) => d.stage === "GAGNE");
    const conversionRate = closedDeals.length ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;

    const openDeals = deals.filter((d) => d.stage !== "GAGNE" && d.stage !== "PERDU");
    const forecastRevenue = openDeals.reduce(
      (sum, d) => sum + ((d.estimatedValue ?? 0) * (d.probability ?? 50)) / 100,
      0,
    );

    const pipelineByStage = PIPELINE_STAGE_ORDER.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage);
      return {
        stage: PIPELINE_STAGE_LABELS[stage],
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.estimatedValue ?? 0), 0),
      };
    });

    const topSalesReps = users
      .map((user) => {
        const userWon = wonDeals.filter((d) => d.ownerUserId === user.id);
        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          won: userWon.length,
          revenue: userWon.reduce((sum, d) => sum + (d.estimatedValue ?? 0), 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const dailyActivity = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.now() - (13 - i) * 86_400_000);
      const dateStr = date.toISOString().slice(0, 10);
      const dayActivities = activities.filter((a) => a.occurredAt.toISOString().slice(0, 10) === dateStr);
      return {
        date: dateStr,
        calls: dayActivities.filter((a) => a.type === "APPEL").length,
        emails: dayActivities.filter((a) => a.type === "EMAIL").length,
        meetings: dayActivities.filter((a) => a.type === "RDV" || a.type === "VISITE").length,
      };
    });

    return {
      prospectsCount,
      clientsCount,
      totalRevenue,
      totalMargin,
      conversionRate,
      forecastRevenue,
      pipelineByStage,
      topSalesReps,
      dailyActivity,
      objectives: salesTargets,
    };
  }
}
