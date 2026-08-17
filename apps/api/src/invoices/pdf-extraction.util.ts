// pdf-parse ships as CommonJS without a default-export-friendly typing —
// require() keeps this robust across ts-node/nest builds.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export interface ExtractedInvoiceData {
  amountHt?: number;
  vatAmount?: number;
  amountTtc?: number;
  issuedAt?: Date;
  dueAt?: Date;
  rawText: string;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
}

function parseFrenchDate(raw: string): Date | undefined {
  const match = raw.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Best-effort extraction of amount HT/TVA/TTC and dates from an uploaded
 * invoice PDF. Tuned for common French invoice wording; falls back to
 * leaving fields undefined (surfaced to the user for manual correction)
 * rather than guessing.
 */
export async function extractInvoiceData(buffer: Buffer): Promise<ExtractedInvoiceData> {
  const { text } = await pdfParse(buffer);

  const htMatch = text.match(/(?:montant\s*)?ht[^\d]{0,15}([\d\s.,]+)\s*€?/i);
  const tvaMatch = text.match(/tva[^\d]{0,15}([\d\s.,]+)\s*€?/i);
  const ttcMatch = text.match(/(?:montant\s*)?ttc[^\d]{0,15}([\d\s.,]+)\s*€?/i);
  const dateMatch = text.match(/date[^\d]{0,10}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  const dueMatch = text.match(/[ée]ch[ée]ance[^\d]{0,10}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);

  return {
    amountHt: htMatch ? parseAmount(htMatch[1]) : undefined,
    vatAmount: tvaMatch ? parseAmount(tvaMatch[1]) : undefined,
    amountTtc: ttcMatch ? parseAmount(ttcMatch[1]) : undefined,
    issuedAt: dateMatch ? parseFrenchDate(dateMatch[1]) : undefined,
    dueAt: dueMatch ? parseFrenchDate(dueMatch[1]) : undefined,
    rawText: text,
  };
}
