import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QuotesService } from "../quotes/quotes.service";
import { InvoicesService } from "../invoices/invoices.service";
import { SignPortalQuoteDto } from "./dto/portal.dto";

/**
 * Client-facing data access — every method is scoped to the calling
 * PortalUser's companyId, so a client can only ever see/act on their own
 * company's records (never cross-tenant).
 */
@Injectable()
export class PortalDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotesService: QuotesService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async company(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, logoUrl: true, address: true, city: true, postalCode: true, phone: true, email: true },
    });
    if (!company) throw new NotFoundException("Entreprise introuvable");
    return company;
  }

  quotes(companyId: string) {
    return this.prisma.quote.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  }

  async quotePdf(companyId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.companyId !== companyId) throw new NotFoundException("Devis introuvable");
    return this.quotesService.generatePdf(quoteId);
  }

  async signQuote(companyId: string, quoteId: string, dto: SignPortalQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.companyId !== companyId) throw new NotFoundException("Devis introuvable");
    if (quote.status === "SIGNE") throw new ForbiddenException("Ce devis est déjà signé");
    return this.quotesService.sign(quoteId, dto);
  }

  invoices(companyId: string) {
    return this.prisma.invoice.findMany({ where: { companyId }, orderBy: { issuedAt: "desc" } });
  }

  async invoicePdf(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.companyId !== companyId) throw new NotFoundException("Facture introuvable");
    return this.invoicesService.generatePdf(invoiceId);
  }

  contracts(companyId: string) {
    return this.prisma.contract.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  }

  /** "Suivi" — read-only view of the company's open opportunities and their pipeline stage. */
  tracking(companyId: string) {
    return this.prisma.deal.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, stage: true, nextActionLabel: true, nextActionDate: true, updatedAt: true },
    });
  }
}
