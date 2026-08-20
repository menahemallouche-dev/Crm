import { Injectable, Logger } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { PrismaService } from "../prisma/prisma.service";
import { CompaniesService } from "../companies/companies.service";
import { PdfService } from "../pdf/pdf.service";

const COMPANY_EXPORT_COLUMNS = [
  "name",
  "siren",
  "siret",
  "vatNumber",
  "address",
  "city",
  "postalCode",
  "phone",
  "email",
  "website",
  "employeeCount",
  "revenue",
  "netIncome",
  "capital",
  "activity",
  "nafCode",
  "potential",
  "commercialPriority",
  "needScoreTransport",
  "needScoreLogistique",
  "needScoreStockage",
  "needScoreAffretement",
  "needScoreFulfillment",
  "needScoreEntrepot",
] as const;

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
    private readonly pdfService: PdfService,
  ) {}

  /** Imports companies from a CSV (or Excel-exported CSV) buffer. One company per row; unknown columns ignored. */
  async importCompaniesCsv(buffer: Buffer) {
    const rows: Record<string, string>[] = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let created = 0;
    const errors: { row: number; message: string }[] = [];

    for (const [index, row] of rows.entries()) {
      if (!row.name) {
        errors.push({ row: index + 2, message: "Colonne 'name' manquante" });
        continue;
      }
      try {
        await this.companiesService.create(
          {
            name: row.name,
            siren: row.siren || undefined,
            siret: row.siret || undefined,
            address: row.address || undefined,
            city: row.city || undefined,
            postalCode: row.postalCode || undefined,
            phone: row.phone || undefined,
            email: row.email || undefined,
            website: row.website || undefined,
            employeeCount: row.employeeCount ? Number(row.employeeCount) : undefined,
            revenue: row.revenue ? Number(row.revenue) : undefined,
            activity: row.activity || undefined,
            nafCode: row.nafCode || undefined,
            skipAutoEnrichment: true, // enrichment queued in bulk below to avoid one job per row inline
          },
          undefined,
        );
        created += 1;
      } catch (error) {
        errors.push({ row: index + 2, message: (error as Error).message });
      }
    }

    return { totalRows: rows.length, created, errors };
  }

  async exportCompaniesCsv(companyIds?: string[]): Promise<string> {
    const companies = await this.prisma.company.findMany({
      where: companyIds?.length ? { id: { in: companyIds } } : undefined,
      orderBy: { name: "asc" },
    });
    const rows = companies.map((c) => Object.fromEntries(COMPANY_EXPORT_COLUMNS.map((col) => [col, (c as any)[col] ?? ""])));
    return stringify(rows, { header: true, columns: COMPANY_EXPORT_COLUMNS as unknown as string[] });
  }

  async exportCompaniesPdf(companyIds?: string[]): Promise<Buffer> {
    const companies = await this.prisma.company.findMany({
      where: companyIds?.length ? { id: { in: companyIds } } : undefined,
      orderBy: { name: "asc" },
    });
    return this.pdfService.companiesList(companies);
  }
}
