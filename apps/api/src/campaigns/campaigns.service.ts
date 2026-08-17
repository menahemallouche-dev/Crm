import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";
import { CreateCampaignDto, CreateTemplateDto, UpdateCampaignDto } from "./dto/campaign.dto";

interface SegmentFilter {
  city?: string;
  potential?: string;
  commercialPriority?: string;
  minRevenue?: number;
  hasWarehouse?: boolean;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── Templates ─────────────────────────────────────────────────────
  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.campaignTemplate.create({ data: dto as any });
  }

  listTemplates() {
    return this.prisma.campaignTemplate.findMany({ orderBy: { createdAt: "desc" } });
  }

  // ── Campaigns ─────────────────────────────────────────────────────
  create(dto: CreateCampaignDto, authorId?: string) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        templateId: dto.templateId,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        segmentFilter: dto.segmentFilter as any,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.scheduledAt ? "PROGRAMMEE" : "BROUILLON",
        authorId,
      },
    });
  }

  findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { recipients: true } });
    if (!campaign) throw new NotFoundException("Campagne introuvable");
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        segmentFilter: dto.segmentFilter as any,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  private buildSegmentWhere(filter: SegmentFilter = {}): Prisma.CompanyWhereInput {
    return {
      city: filter.city ? { equals: filter.city, mode: "insensitive" } : undefined,
      potential: filter.potential as any,
      commercialPriority: filter.commercialPriority as any,
      revenue: filter.minRevenue ? { gte: filter.minRevenue } : undefined,
      hasWarehouse: filter.hasWarehouse,
    };
  }

  /** Builds (or rebuilds) the recipient list for a campaign from its saved segment filter. */
  async buildRecipients(campaignId: string) {
    const campaign = await this.findOne(campaignId);
    const companies = await this.prisma.company.findMany({
      where: this.buildSegmentWhere((campaign.segmentFilter as SegmentFilter) ?? {}),
      include: { contacts: { where: { email: { not: null } } } },
    });

    await this.prisma.campaignRecipient.deleteMany({ where: { campaignId, sentAt: null } });

    const rows = companies.flatMap((company) =>
      company.contacts
        .filter((c) => !!c.email)
        .map((contact) => ({
          campaignId,
          companyId: company.id,
          contactId: contact.id,
          email: contact.email as string,
        })),
    );
    if (rows.length) await this.prisma.campaignRecipient.createMany({ data: rows, skipDuplicates: true });
    return this.prisma.campaignRecipient.findMany({ where: { campaignId } });
  }

  private renderTemplate(html: string, vars: Record<string, string>) {
    return html.replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] ?? "");
  }

  async send(campaignId: string) {
    const campaign = await this.findOne(campaignId);
    let recipients = campaign.recipients;
    if (!recipients.length) recipients = (await this.buildRecipients(campaignId)) as any;

    const apiUrl = this.config.get<string>("API_URL") ?? "http://localhost:4000";

    for (const recipient of recipients) {
      if (recipient.sentAt) continue;
      const contact = recipient.contactId
        ? await this.prisma.contact.findUnique({ where: { id: recipient.contactId } })
        : null;
      const company = recipient.companyId
        ? await this.prisma.company.findUnique({ where: { id: recipient.companyId } })
        : null;

      const html = `${this.renderTemplate(campaign.bodyHtml, {
        firstName: contact?.firstName ?? "",
        lastName: contact?.lastName ?? "",
        companyName: company?.name ?? "",
      })}<img src="${apiUrl}/api/campaigns/track/open/${recipient.id}" width="1" height="1" style="display:none" />`;

      await this.emailService.send({ to: recipient.email, subject: campaign.subject, html });
      await this.prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { sentAt: new Date() } });
    }

    return this.prisma.campaign.update({ where: { id: campaignId }, data: { status: "ENVOYEE", sentAt: new Date() } });
  }

  async trackOpen(recipientId: string) {
    await this.prisma.campaignRecipient
      .update({ where: { id: recipientId }, data: { openedAt: new Date() } })
      .catch(() => undefined);
  }

  async trackClick(recipientId: string) {
    await this.prisma.campaignRecipient
      .update({ where: { id: recipientId }, data: { clickedAt: new Date() } })
      .catch(() => undefined);
  }

  async unsubscribe(recipientId: string) {
    await this.prisma.campaignRecipient
      .update({ where: { id: recipientId }, data: { unsubscribedAt: new Date() } })
      .catch(() => undefined);
    return { success: true };
  }

  async stats(campaignId: string) {
    const recipients = await this.prisma.campaignRecipient.findMany({ where: { campaignId } });
    const total = recipients.length;
    const sent = recipients.filter((r) => r.sentAt).length;
    const opened = recipients.filter((r) => r.openedAt).length;
    const clicked = recipients.filter((r) => r.clickedAt).length;
    const replied = recipients.filter((r) => r.repliedAt).length;
    const unsubscribed = recipients.filter((r) => r.unsubscribedAt).length;
    return {
      total,
      sent,
      opened,
      clicked,
      replied,
      unsubscribed,
      openRate: sent ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
    };
  }
}
