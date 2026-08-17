import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOpportunityDto, UpdateOpportunityDto } from "./dto/real-estate.dto";

@Injectable()
export class RealEstateService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.realEstateOpportunity.count();
    return `IMMO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }

  async create(dto: CreateOpportunityDto) {
    const opportunity = await this.prisma.realEstateOpportunity.create({
      data: {
        ...dto,
        type: dto.type as any,
        reference: await this.generateReference(),
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        pricePerSqm: dto.price && dto.surfaceSqm ? dto.price / dto.surfaceSqm : undefined,
        photos: (dto.photos ?? []) as any,
      },
    });
    await this.matchCompanies(opportunity.id);
    return opportunity;
  }

  findAll() {
    return this.prisma.realEstateOpportunity.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.realEstateOpportunity.findUnique({ where: { id } });
    if (!opportunity) throw new NotFoundException("Opportunité immobilière introuvable");
    return opportunity;
  }

  async update(id: string, dto: UpdateOpportunityDto) {
    await this.findOne(id);
    return this.prisma.realEstateOpportunity.update({
      where: { id },
      data: {
        ...dto,
        type: dto.type as any,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        pricePerSqm: dto.price && dto.surfaceSqm ? dto.price / dto.surfaceSqm : undefined,
        photos: dto.photos as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.realEstateOpportunity.delete({ where: { id } });
    return { success: true };
  }

  /** Matches an opportunity against companies with a strong "besoin entrepôt" score and/or nearby location. */
  async matchCompanies(id: string) {
    const opportunity = await this.findOne(id);
    const candidates = await this.prisma.company.findMany({
      where: {
        OR: [
          { needScoreEntrepot: { gte: 40 } },
          opportunity.city ? { city: { equals: opportunity.city, mode: "insensitive" } } : {},
          { propertyStatus: "LOCATAIRE" },
        ],
      },
      orderBy: { needScoreEntrepot: "desc" },
      take: 25,
      select: { id: true, name: true, city: true, needScoreEntrepot: true, propertyStatus: true },
    });

    await this.prisma.realEstateOpportunity.update({
      where: { id },
      data: { matchedCompanyIds: candidates.map((c) => c.id) as any },
    });

    return candidates;
  }
}
