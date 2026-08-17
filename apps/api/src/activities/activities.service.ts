import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateActivityDto, CreateTaskDto, QueryActivitiesDto } from "./dto/activity.dto";

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateActivityDto) {
    const { occurredAt, ...rest } = dto;
    return this.prisma.activity.create({
      data: { ...rest, occurredAt: occurredAt ? new Date(occurredAt) : undefined },
    });
  }

  async findAll(query: QueryActivitiesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      companyId: query.companyId,
      contactId: query.contactId,
      dealId: query.dealId,
      type: query.type as any,
    };
    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: { contact: true, ownerUser: { select: { firstName: true, lastName: true } } },
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async remove(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException("Activité introuvable");
    await this.prisma.activity.delete({ where: { id } });
    return { success: true };
  }

  // ── Tasks / rappels ──────────────────────────────────────────────
  createTask(dto: CreateTaskDto) {
    const { dueAt, ...rest } = dto;
    return this.prisma.taskItem.create({ data: { ...rest, dueAt: dueAt ? new Date(dueAt) : undefined } });
  }

  findTasks(params: { assigneeId?: string; companyId?: string; dueBefore?: string; onlyOpen?: boolean }) {
    return this.prisma.taskItem.findMany({
      where: {
        assigneeId: params.assigneeId,
        companyId: params.companyId,
        dueAt: params.dueBefore ? { lte: new Date(params.dueBefore) } : undefined,
        completedAt: params.onlyOpen ? null : undefined,
      },
      include: { company: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
    });
  }

  async completeTask(id: string) {
    return this.prisma.taskItem.update({ where: { id }, data: { completedAt: new Date() } });
  }

  todayTasks() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.prisma.taskItem.findMany({
      where: { dueAt: { gte: start, lte: end }, completedAt: null },
      include: { company: { select: { name: true } }, assignee: { select: { firstName: true, lastName: true } } },
      orderBy: { dueAt: "asc" },
    });
  }
}
