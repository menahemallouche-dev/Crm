import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ScoringService } from "../ai/scoring.service";
import { ElasticsearchService } from "../search/elasticsearch.service";
import { PaginatedResult, paginate } from "../common/dto/pagination.dto";
import { CreateContactDto, QueryContactsDto, UpdateContactDto } from "./dto/contact.dto";

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async create(dto: CreateContactDto) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: dto.companyId } });
    const classification = await this.scoring.classifyContactRole({ jobTitle: dto.jobTitle, companyName: company.name });
    const { birthday, ...rest } = dto;
    const contact = await this.prisma.contact.create({
      data: {
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined,
        aiDecisionRole: classification.role,
        aiDecisionPower: classification.power,
        aiClassifiedAt: new Date(),
      },
    });
    await this.elasticsearch.indexContact(contact, company.name);
    return contact;
  }

  async findAll(query: QueryContactsDto): Promise<PaginatedResult<any>> {
    const where: Prisma.ContactWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { jobTitle: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {},
        query.companyId ? { companyId: query.companyId } : {},
        query.aiDecisionRole ? { aiDecisionRole: query.aiDecisionRole as any } : {},
        query.isDecisionMaker !== undefined ? { isDecisionMaker: query.isDecisionMaker } : {},
      ],
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { [query.sortBy ?? "aiDecisionPower"]: query.sortDir ?? "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { company: { select: { id: true, name: true, city: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return paginate(data, total, page, pageSize);
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        activities: { orderBy: { occurredAt: "desc" }, take: 20 },
        deals: true,
      },
    });
    if (!contact) throw new NotFoundException("Contact introuvable");
    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.findOne(id);
    const jobTitleChanged = dto.jobTitle !== undefined && dto.jobTitle !== existing.jobTitle;
    const classification = jobTitleChanged
      ? await this.scoring.classifyContactRole({ jobTitle: dto.jobTitle, companyName: existing.company.name })
      : null;

    const { birthday, ...rest } = dto;
    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined,
        ...(classification
          ? { aiDecisionRole: classification.role, aiDecisionPower: classification.power, aiClassifiedAt: new Date() }
          : {}),
      },
    });
    await this.elasticsearch.indexContact(updated, existing.company.name);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contact.delete({ where: { id } });
    await this.elasticsearch.deleteContact(id);
    return { success: true };
  }

  async reclassify(id: string) {
    const contact = await this.findOne(id);
    const classification = await this.scoring.classifyContactRole({
      jobTitle: contact.jobTitle,
      companyName: contact.company.name,
    });
    const updated = await this.prisma.contact.update({
      where: { id },
      data: { aiDecisionRole: classification.role, aiDecisionPower: classification.power, aiClassifiedAt: new Date() },
    });
    await this.elasticsearch.indexContact(updated, contact.company.name);
    return updated;
  }

  async upcomingBirthdays(withinDays = 30) {
    const contacts = await this.prisma.contact.findMany({
      where: { birthday: { not: null } },
      include: { company: { select: { name: true } } },
    });
    const today = new Date();
    return contacts
      .map((c) => {
        if (!c.birthday) return null;
        const next = new Date(c.birthday);
        next.setFullYear(today.getFullYear());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const daysAway = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
        return { ...c, daysAway };
      })
      .filter((c): c is NonNullable<typeof c> => !!c && c.daysAway <= withinDays)
      .sort((a, b) => a.daysAway - b.daysAway);
  }
}
