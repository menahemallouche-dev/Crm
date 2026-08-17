import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ProfitabilityService } from "../profitability/profitability.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Background automations: daily reminder digest, stale-prospect alerts,
 * and a nightly profitability recompute. This is the scheduler-driven
 * counterpart to the on-demand BullMQ jobs (enrichment/campaigns) — see
 * queue/queue.module.ts for the event-driven side of "AUTOMATISATIONS".
 */
@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profitability: ProfitabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Every weekday at 07:00 — notify each rep of tasks due today. */
  @Cron("0 7 * * 1-5")
  async dailyReminderDigest() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const tasks = await this.prisma.taskItem.findMany({
      where: { dueAt: { gte: start, lte: end }, completedAt: null, assigneeId: { not: null } },
    });
    const byAssignee = new Map<string, number>();
    for (const task of tasks) {
      if (!task.assigneeId) continue;
      byAssignee.set(task.assigneeId, (byAssignee.get(task.assigneeId) ?? 0) + 1);
    }
    for (const [userId, count] of byAssignee) {
      await this.notifications.create(userId, "Relances du jour", `Vous avez ${count} relance(s) programmée(s) aujourd'hui.`);
    }
    this.logger.log(`Digest quotidien envoyé à ${byAssignee.size} commerciaux (${tasks.length} tâches)`);
  }

  /** Every Monday at 06:00 — flag prospects/clients not touched in 30 days with an automatic follow-up task. */
  @Cron("0 6 * * 1")
  async flagStaleCompanies() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);

    const companies = await this.prisma.company.findMany({
      include: { activities: { orderBy: { occurredAt: "desc" }, take: 1 }, deals: { where: { stage: { notIn: ["GAGNE", "PERDU"] } } } },
    });

    const stale = companies.filter(
      (c) => c.deals.length > 0 && (!c.activities[0] || c.activities[0].occurredAt < threshold),
    );

    for (const company of stale) {
      const existing = await this.prisma.taskItem.findFirst({
        where: { companyId: company.id, isAutomatic: true, completedAt: null, title: { contains: "Relance auto" } },
      });
      if (existing) continue;
      await this.prisma.taskItem.create({
        data: {
          companyId: company.id,
          assigneeId: company.ownerUserId,
          title: `Relance auto — ${company.name}`,
          description: "Aucune activité enregistrée depuis plus de 30 jours.",
          dueAt: new Date(),
          isAutomatic: true,
        },
      });
    }
    this.logger.log(`${stale.length} entreprise(s) sans relance depuis 30 jours signalée(s)`);
  }

  /** Nightly — recompute profitability for every company that has invoices, keeping margins fresh. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async recomputeProfitability() {
    const companies = await this.prisma.company.findMany({
      where: { invoices: { some: {} } },
      select: { id: true },
    });
    for (const { id } of companies) {
      await this.profitability.recomputeAllForCompany(id).catch((e) => this.logger.error(e));
    }
    this.logger.log(`Rentabilité recalculée pour ${companies.length} entreprise(s)`);
  }
}
