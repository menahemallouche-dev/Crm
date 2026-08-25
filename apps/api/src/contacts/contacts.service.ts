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
    const mailingEngagement = await this.mailingEngagement(id);
    return { ...contact, mailingEngagement };
  }

  /** Sent/opened mailing counts for one contact, across every campaign — used to spot "reads emails but never replies" contacts worth a phone call instead. */
  async mailingEngagement(contactId: string) {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { contactId },
      select: { sentAt: true, openedAt: true, clickedAt: true },
    });
    const sentCount = recipients.filter((r) => r.sentAt).length;
    const opened = recipients.filter((r) => r.openedAt);
    const lastOpenedAt = opened.reduce<Date | null>(
      (latest, r) => (!latest || (r.openedAt as Date) > latest ? (r.openedAt as Date) : latest),
      null,
    );
    return {
      sentCount,
      openedCount: opened.length,
      clickedCount: recipients.filter((r) => r.clickedAt).length,
      openRate: sentCount ? Math.round((opened.length / sentCount) * 100) : 0,
      lastOpenedAt,
    };
  }

  /**
   * Contacts who actually open the mailings we send them, ranked by engagement —
   * exactly the shortlist a rep should call first instead of sending yet another
   * email that may or may not land. Only contacts with at least one open are included.
   */
  async engagedContacts(limit = 50) {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { contactId: { not: null } },
      select: { contactId: true, sentAt: true, openedAt: true },
    });

    const byContact = new Map<string, { sent: number; opened: number; lastOpenedAt: Date | null }>();
    for (const r of recipients) {
      if (!r.contactId) continue;
      const entry = byContact.get(r.contactId) ?? { sent: 0, opened: 0, lastOpenedAt: null };
      if (r.sentAt) entry.sent += 1;
      if (r.openedAt) {
        entry.opened += 1;
        if (!entry.lastOpenedAt || r.openedAt > entry.lastOpenedAt) entry.lastOpenedAt = r.openedAt;
      }
      byContact.set(r.contactId, entry);
    }

    const ranked = [...byContact.entries()]
      .filter(([, stats]) => stats.opened > 0)
      .sort((a, b) => b[1].opened - a[1].opened || (b[1].lastOpenedAt?.getTime() ?? 0) - (a[1].lastOpenedAt?.getTime() ?? 0))
      .slice(0, limit);

    if (ranked.length === 0) return [];

    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: ranked.map(([contactId]) => contactId) } },
      include: { company: { select: { id: true, name: true, city: true } } },
    });
    const byId = new Map(contacts.map((c) => [c.id, c]));

    return ranked
      .map(([contactId, stats]) => {
        const contact = byId.get(contactId);
        if (!contact) return null;
        return {
          ...contact,
          mailingEngagement: {
            sentCount: stats.sent,
            openedCount: stats.opened,
            openRate: stats.sent ? Math.round((stats.opened / stats.sent) * 100) : 0,
            lastOpenedAt: stats.lastOpenedAt,
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => !!c);
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
