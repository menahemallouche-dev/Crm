import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContractDto, UpdateContractDto } from "./dto/contract.dto";

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.contract.count();
    return `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }

  async create(dto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        ...dto,
        reference: await this.generateReference(),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: "ACTIF",
      },
    });
  }

  findAll(companyId?: string) {
    return this.prisma.contract.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id }, include: { company: true } });
    if (!contract) throw new NotFoundException("Contrat introuvable");
    return contract;
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status as any,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contract.delete({ where: { id } });
    return { success: true };
  }

  /** Contracts expiring within N days — useful for renewal/notice-period alerts. */
  expiringSoon(withinDays = 60) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + withinDays);
    return this.prisma.contract.findMany({
      where: { status: "ACTIF", endDate: { lte: threshold, gte: new Date() } },
      include: { company: { select: { name: true } } },
      orderBy: { endDate: "asc" },
    });
  }
}
