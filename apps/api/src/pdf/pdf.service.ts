import { Injectable } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");

const BRAND_COLOR = "#4F46E5";
const INK_COLOR = "#111827";
const MUTED_COLOR = "#6B7280";

const currency = (v?: number | null) =>
  v || v === 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v) : "—";
const dateFr = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

/**
 * Native PDF generation (pdfkit — no headless browser required). Every
 * method returns a Buffer ready to stream as `application/pdf`. Layouts
 * are intentionally simple/print-friendly rather than pixel-matching the
 * web UI — the goal is a clean, professional document, not a screenshot.
 */
@Injectable()
export class PdfService {
  private newDoc(): typeof PDFDocument {
    return new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  }

  private async toBuffer(doc: typeof PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
  }

  private header(doc: typeof PDFDocument, title: string, subtitle?: string) {
    doc.fillColor(BRAND_COLOR).fontSize(20).font("Helvetica-Bold").text("Gecodis CRM", 50, 50);
    doc.fillColor(MUTED_COLOR).fontSize(9).font("Helvetica").text("Logistique · Transport · Immobilier logistique", 50, 74);

    doc.fillColor(INK_COLOR).fontSize(16).font("Helvetica-Bold").text(title, 50, 110);
    if (subtitle) doc.fillColor(MUTED_COLOR).fontSize(10).font("Helvetica").text(subtitle, 50, 132);

    doc.moveTo(50, 155).lineTo(545, 155).strokeColor("#E5E7EB").stroke();
    doc.y = 170;
  }

  private footer(doc: typeof PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc
        .fillColor(MUTED_COLOR)
        .fontSize(8)
        .text(`Généré le ${dateFr(new Date())} — Gecodis CRM`, 50, 790, { align: "left", width: 250 })
        .text(`Page ${i + 1} / ${range.count}`, 295, 790, { align: "right", width: 250 });
    }
  }

  private table(doc: typeof PDFDocument, columns: { label: string; width: number; align?: "left" | "right" }[], rows: (string | number)[][]) {
    const startX = 50;
    let y = doc.y;

    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK_COLOR);
    let x = startX;
    for (const col of columns) {
      doc.text(col.label, x, y, { width: col.width, align: col.align ?? "left" });
      x += col.width;
    }
    y += 16;
    doc.moveTo(startX, y).lineTo(545, y).strokeColor("#E5E7EB").stroke();
    y += 6;

    doc.font("Helvetica").fontSize(9).fillColor(INK_COLOR);
    for (const row of rows) {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
      x = startX;
      row.forEach((cell, i) => {
        doc.text(String(cell), x, y, { width: columns[i].width, align: columns[i].align ?? "left" });
        x += columns[i].width;
      });
      y += 18;
    }
    doc.y = y;
  }

  async companiesList(companies: any[]): Promise<Buffer> {
    const doc = this.newDoc();
    this.header(doc, "Liste des entreprises", `${companies.length} entreprise(s)`);
    this.table(
      doc,
      [
        { label: "Entreprise", width: 160 },
        { label: "Ville", width: 90 },
        { label: "NAF", width: 55 },
        { label: "Effectif", width: 55, align: "right" },
        { label: "CA", width: 80, align: "right" },
        { label: "Priorité", width: 55 },
      ],
      companies.map((c) => [c.name, c.city ?? "—", c.nafCode ?? "—", c.employeeCount ?? "—", currency(c.revenue), c.commercialPriority ?? "—"]),
    );
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async profitabilityRanking(rows: any[], title: string): Promise<Buffer> {
    const doc = this.newDoc();
    this.header(doc, title, `${rows.length} entreprise(s)`);
    this.table(
      doc,
      [
        { label: "#", width: 25 },
        { label: "Entreprise", width: 200 },
        { label: "CA", width: 90, align: "right" },
        { label: "Marge €", width: 90, align: "right" },
        { label: "Marge %", width: 70, align: "right" },
        { label: "Note", width: 60 },
      ],
      rows.map((r, i) => [i + 1, r.company?.name ?? "—", currency(r.revenue), currency(r.marginAmount), `${r.marginPercent.toFixed(1)}%`, r.rating ?? "—"]),
    );
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async quote(quote: any): Promise<Buffer> {
    const doc = this.newDoc();
    this.header(doc, `Devis ${quote.reference}`, `Version ${quote.version} — ${dateFr(quote.createdAt)}`);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK_COLOR).text("Client", 50, doc.y + 10);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED_COLOR);
    doc.text(quote.company?.name ?? "—");
    if (quote.company?.address) doc.text(`${quote.company.address}, ${quote.company.city ?? ""} ${quote.company.postalCode ?? ""}`);
    if (quote.company?.siren) doc.text(`SIREN : ${quote.company.siren}`);

    doc.moveDown(1.5);
    const lines: { label: string; qty: number; unitPrice: number; total?: number }[] = quote.lines?.length
      ? quote.lines
      : [{ label: "Prestation logistique", qty: 1, unitPrice: quote.amountHt }];

    this.table(
      doc,
      [
        { label: "Désignation", width: 260 },
        { label: "Qté", width: 60, align: "right" },
        { label: "PU HT", width: 90, align: "right" },
        { label: "Total HT", width: 90, align: "right" },
      ],
      lines.map((l) => [l.label, l.qty, currency(l.unitPrice), currency(l.total ?? l.qty * l.unitPrice)]),
    );

    doc.moveDown(1);
    const totalsX = 350;
    doc.font("Helvetica").fontSize(10).fillColor(INK_COLOR);
    doc.text(`Total HT`, totalsX, doc.y, { width: 100 });
    doc.text(currency(quote.amountHt), totalsX + 100, doc.y - 12, { width: 95, align: "right" });
    doc.text(`TVA (${quote.vatRate}%)`, totalsX, doc.y + 4, { width: 100 });
    doc.text(currency(quote.amountTtc - quote.amountHt), totalsX + 100, doc.y - 12, { width: 95, align: "right" });
    doc.font("Helvetica-Bold");
    doc.text(`Total TTC`, totalsX, doc.y + 4, { width: 100 });
    doc.text(currency(quote.amountTtc), totalsX + 100, doc.y - 12, { width: 95, align: "right" });

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED_COLOR);
    doc.text(`Statut : ${quote.status}`);
    if (quote.validUntil) doc.text(`Valable jusqu'au ${dateFr(quote.validUntil)}`);
    if (quote.signedAt) {
      doc.moveDown(1);
      doc.fillColor(INK_COLOR).font("Helvetica-Bold").text("Signé électroniquement");
      doc.font("Helvetica").fillColor(MUTED_COLOR).text(`Par ${quote.signedByName} le ${dateFr(quote.signedAt)}`);
    }

    this.footer(doc);
    return this.toBuffer(doc);
  }

  async invoice(invoice: any): Promise<Buffer> {
    const doc = this.newDoc();
    this.header(doc, `Facture ${invoice.reference}`, `Émise le ${dateFr(invoice.issuedAt)}`);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK_COLOR).text("Client", 50, doc.y + 10);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED_COLOR).text(invoice.company?.name ?? "—");

    doc.moveDown(1.5);
    this.table(
      doc,
      [
        { label: "Montant HT", width: 150, align: "right" },
        { label: "TVA", width: 150, align: "right" },
        { label: "Montant TTC", width: 150, align: "right" },
      ],
      [[currency(invoice.amountHt), currency(invoice.vatAmount), currency(invoice.amountTtc)]],
    );

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED_COLOR);
    doc.text(`Échéance : ${dateFr(invoice.dueAt)}`);
    doc.text(`Statut : ${invoice.status}`);
    if (invoice.paidAt) doc.text(`Payée le ${dateFr(invoice.paidAt)}`);

    this.footer(doc);
    return this.toBuffer(doc);
  }
}
