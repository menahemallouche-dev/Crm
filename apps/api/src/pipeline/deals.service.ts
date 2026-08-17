import { Injectable, NotFoundException } from "@nestjs/common";
import { PipelineStage } from "@prisma/client";
import { PIPELINE_STAGE_ORDER } from "@gecodis/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDealDto, MoveStageDto, QueryDealsDto, UpdateDealDto } from "./dto/deal.dto";

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDealDto) {
    const { nextActionDate, ...rest } = dto;
    const deal = await this.prisma.deal.create({
      data: { ...rest, nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined },
    });
    await this.prisma.dealStageEvent.create({
      data: { dealId: deal.id, stage: deal.stage, comment: "Opportunité créée" },
    });
    return deal;
  }

  async findAll(query: QueryDealsDto) {
    return this.prisma.deal.findMany({
      where: {
        companyId: query.companyId,
        stage: query.stage as PipelineStage | undefined,
        ownerUserId: query.ownerUserId,
      },
      include: { company: { select: { id: true, name: true, city: true, commercialPriority: true } }, primaryContact: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  /** Deals grouped by pipeline stage, in spec order, for the Kanban board. */
  async kanban(ownerUserId?: string) {
    const deals = await this.prisma.deal.findMany({
      where: ownerUserId ? { ownerUserId } : undefined,
      include: { company: { select: { id: true, name: true, city: true, commercialPriority: true, logoUrl: true } }, primaryContact: true },
      orderBy: { updatedAt: "desc" },
    });
    return PIPELINE_STAGE_ORDER.map((stage) => ({
      stage,
      deals: deals.filter((d) => d.stage === stage),
      totalValue: deals.filter((d) => d.stage === stage).reduce((sum, d) => sum + (d.estimatedValue ?? 0), 0),
    }));
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        company: true,
        primaryContact: true,
        stageHistory: { orderBy: { enteredAt: "desc" } },
        activities: { orderBy: { occurredAt: "desc" } },
        quotes: true,
      },
    });
    if (!deal) throw new NotFoundException("Opportunité introuvable");
    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);
    const { nextActionDate, ...rest } = dto;
    return this.prisma.deal.update({
      where: { id },
      data: { ...rest, nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.deal.delete({ where: { id } });
    return { success: true };
  }

  /** Moves a deal to a new pipeline stage, recording a full stage-history event (date, comment, compte-rendu, next action)
   *  and scheduling an automatic reminder task when a next follow-up date is provided. */
  async moveStage(id: string, dto: MoveStageDto) {
    const deal = await this.findOne(id);
    const stage = dto.stage as PipelineStage;
    const nextActionDate = dto.nextActionDate ? new Date(dto.nextActionDate) : undefined;

    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        stage,
        nextActionLabel: dto.nextAction ?? deal.nextActionLabel,
        nextActionDate: nextActionDate ?? deal.nextActionDate,
        nextFollowUpAt: nextActionDate ?? deal.nextFollowUpAt,
        lostReason: stage === "PERDU" ? dto.lostReason : deal.lostReason,
        wonAt: stage === "GAGNE" ? new Date() : deal.wonAt,
        lostAt: stage === "PERDU" ? new Date() : deal.lostAt,
      },
    });

    await this.prisma.dealStageEvent.create({
      data: {
        dealId: id,
        stage,
        comment: dto.comment,
        summary: dto.summary,
        nextAction: dto.nextAction,
        nextActionDate,
      },
    });

    if (nextActionDate && deal.autoReminderEnabled) {
      await this.prisma.taskItem.create({
        data: {
          companyId: deal.companyId,
          assigneeId: deal.ownerUserId,
          title: dto.nextAction ?? `Relance — ${deal.title}`,
          description: `Rappel automatique généré lors du passage à l'étape "${stage}".`,
          dueAt: nextActionDate,
          isAutomatic: true,
        },
      });
    }

    return updated;
  }
}
