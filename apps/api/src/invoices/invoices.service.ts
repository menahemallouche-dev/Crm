import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { extractInvoiceData } from "./pdf-extraction.util";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReference() {
    const count = await this.prisma.invoice.count();
    return `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  }

  async create(dto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        ...dto,
        reference: await this.generateReference(),
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        status: dto.status ?? "EN_ATTENTE",
      },
    });
  }

  /** Imports a PDF invoice, auto-extracts amount HT/TVA/TTC + dates, and creates the Invoice record. */
  async importPdf(companyId: string, file: { buffer: Buffer; originalname: string }, quoteId?: string) {
    let extraction: Awaited<ReturnType<typeof extractInvoiceData>> | null = null;
    let status = "success";
    try {
      extraction = await extractInvoiceData(file.buffer);
    } catch {
      status = "failed";
    }

    return this.prisma.invoice.create({
      data: {
        companyId,
        quoteId,
        reference: await this.generateReference(),
        amountHt: extraction?.amountHt,
        vatAmount: extraction?.vatAmount,
        amountTtc: extraction?.amountTtc,
        issuedAt: extraction?.issuedAt,
        dueAt: extraction?.dueAt,
        sourceFileUrl: file.originalname,
        extractionStatus: status,
        extractionRaw: extraction ? ({ rawText: extraction.rawText.slice(0, 5000) } as any) : undefined,
      },
    });
  }

  findAll(companyId?: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: { issuedAt: "desc" },
      include: { company: { select: { name: true } } },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: { company: true, costs: true } });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    await this.findOne(id);
    const { paidAt, issuedAt, dueAt, ...rest } = dto as any;
    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...rest,
        issuedAt: issuedAt ? new Date(issuedAt) : undefined,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        paidAt: paidAt ? new Date(paidAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.invoice.delete({ where: { id } });
    return { success: true };
  }
}
