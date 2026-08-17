import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuoteDto, SignQuoteDto, UpdateQuoteDto } from "./dto/quote.dto";

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.quote.count();
    const year = new Date().getFullYear();
    return `DEV-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  async create(dto: CreateQuoteDto, authorId?: string) {
    const vatRate = dto.vatRate ?? 20;
    const amountTtc = dto.amountHt * (1 + vatRate / 100);
    return this.prisma.quote.create({
      data: {
        companyId: dto.companyId,
        dealId: dto.dealId,
        authorId,
        reference: await this.generateReference(),
        amountHt: dto.amountHt,
        vatRate,
        amountTtc,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        lines: (dto.lines ?? []).map((l) => ({ ...l, total: l.qty * l.unitPrice })) as any,
      },
    });
  }

  findAll(companyId?: string) {
    return this.prisma.quote.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: { company: true, deal: true } });
    if (!quote) throw new NotFoundException("Devis introuvable");
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.findOne(id);
    const vatRate = dto.vatRate ?? 20;
    return this.prisma.quote.update({
      where: { id },
      data: {
        amountHt: dto.amountHt,
        vatRate,
        amountTtc: dto.amountHt * (1 + vatRate / 100),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        lines: dto.lines ? ((dto.lines ?? []).map((l) => ({ ...l, total: l.qty * l.unitPrice })) as any) : undefined,
      },
    });
  }

  /** Creates a new version of an existing quote (versioning). */
  async newVersion(id: string) {
    const original = await this.findOne(id);
    return this.prisma.quote.create({
      data: {
        companyId: original.companyId,
        dealId: original.dealId,
        authorId: original.authorId,
        reference: original.reference,
        version: original.version + 1,
        parentQuoteId: original.id,
        amountHt: original.amountHt,
        vatRate: original.vatRate,
        amountTtc: original.amountTtc,
        validUntil: original.validUntil,
        lines: original.lines as any,
      },
    });
  }

  async send(id: string) {
    await this.findOne(id);
    return this.prisma.quote.update({ where: { id }, data: { status: "ENVOYE" } });
  }

  /** Mock e-signature flow (see ESIGNATURE_PROVIDER env var — plug DocuSign/Yousign here in production). */
  async sign(id: string, dto: SignQuoteDto) {
    const quote = await this.findOne(id);
    const signed = await this.prisma.quote.update({
      where: { id },
      data: {
        status: "SIGNE",
        signedAt: new Date(),
        signedByName: dto.signedByName,
        signatureProvider: "mock",
        signatureRequestId: `mock-${quote.id}-${Date.now()}`,
      },
    });

    // Transformation en client : le devis signé fait automatiquement gagner l'opportunité liée.
    if (quote.dealId) {
      await this.prisma.deal.update({ where: { id: quote.dealId }, data: { stage: "GAGNE", wonAt: new Date() } });
      await this.prisma.dealStageEvent.create({
        data: { dealId: quote.dealId, stage: "GAGNE", comment: `Devis ${quote.reference} signé électroniquement` },
      });
    }

    return signed;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quote.delete({ where: { id } });
    return { success: true };
  }
}
