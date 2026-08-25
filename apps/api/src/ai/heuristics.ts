import {
  CommercialPriority,
  ContactDecisionRole,
  LogisticsMode,
  NeedsScores,
  PotentialLevel,
} from "@gecodis/shared";

/**
 * Deterministic, explainable scoring used whenever OpenAI is not configured
 * (or as a sanity baseline blended with the LLM output when it is). Based on
 * French NAF/APE activity codes, headcount and revenue — the same signals a
 * junior analyst would use to qualify a logistics prospect by hand.
 */

interface NafRule {
  prefixes: string[];
  scores: Partial<NeedsScores>;
}

const NAF_RULES: NafRule[] = [
  // Transport routier de fret
  { prefixes: ["49.41", "4941"], scores: { transport: 90, affretement: 70, logistique: 60 } },
  // Entreposage et stockage
  { prefixes: ["52.10", "5210"], scores: { stockage: 95, entrepot: 95, logistique: 70 } },
  // Manutention
  { prefixes: ["52.24", "5224"], scores: { logistique: 85, entrepot: 60, transport: 40 } },
  // Affrètement et organisation des transports
  { prefixes: ["52.29", "5229"], scores: { affretement: 95, transport: 70, logistique: 65 } },
  // Vente à distance / e-commerce
  { prefixes: ["47.91", "4791"], scores: { fulfillment: 90, transport: 60, stockage: 55, entrepot: 50 } },
  // Commerce de gros (46.xx)
  { prefixes: ["46"], scores: { transport: 65, stockage: 70, logistique: 55, entrepot: 45 } },
  // Commerce de détail (47.xx, hors vente à distance déjà couverte)
  { prefixes: ["47"], scores: { transport: 45, stockage: 35, fulfillment: 30 } },
  // Industrie manufacturière (10-33)
  ...Array.from({ length: 24 }, (_, i) => (i + 10).toString()).map((p) => ({
    prefixes: [p],
    scores: { transport: 55, stockage: 60, logistique: 50, entrepot: 40 },
  })),
  // Construction (41-43)
  { prefixes: ["41", "42", "43"], scores: { transport: 40, stockage: 30 } },
  // Entreposage frigorifique / agroalimentaire (10.xx déjà couvert, renforcé ici)
  { prefixes: ["10."], scores: { stockage: 75, entrepot: 65, transport: 60 } },
];

function matchNaf(nafCode: string | null | undefined): Partial<NeedsScores>[] {
  if (!nafCode) return [];
  const normalized = nafCode.replace(/\s/g, "");
  return NAF_RULES.filter((rule) => rule.prefixes.some((p) => normalized.startsWith(p))).map(
    (r) => r.scores,
  );
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function scoreCompanyNeeds(input: {
  nafCode?: string | null;
  employeeCount?: number | null;
  revenue?: number | null;
  activity?: string | null;
  description?: string | null;
}): NeedsScores {
  const base: NeedsScores = {
    transport: 15,
    logistique: 15,
    stockage: 15,
    affretement: 10,
    fulfillment: 10,
    entrepot: 10,
  };

  const matches = matchNaf(input.nafCode);
  for (const scores of matches) {
    for (const key of Object.keys(scores) as (keyof NeedsScores)[]) {
      base[key] = Math.max(base[key], scores[key] ?? 0);
    }
  }

  // Textual signals from free-text activity/description.
  const text = `${input.activity ?? ""} ${input.description ?? ""}`.toLowerCase();
  const keywordBoost: [RegExp, keyof NeedsScores, number][] = [
    [/entrep[ôo]t/, "entrepot", 25],
    [/entrep[ôo]t/, "stockage", 15],
    [/plateforme logistique/, "entrepot", 30],
    [/e-?commerce|vente en ligne|marketplace/, "fulfillment", 30],
    [/transport|camion|flotte/, "transport", 20],
    [/affr[eè]tement/, "affretement", 30],
    [/import|export|international/, "transport", 10],
    [/froid|frigorifique|temp[ée]rature dirig[ée]e/, "stockage", 15],
  ];
  for (const [regex, key, boost] of keywordBoost) {
    if (regex.test(text)) base[key] = clamp(base[key] + boost);
  }

  // Company size amplifies absolute logistics needs (more volume to move/store).
  const size = input.employeeCount ?? 0;
  const sizeFactor = size > 500 ? 1.25 : size > 100 ? 1.15 : size > 20 ? 1.05 : 1;
  for (const key of Object.keys(base) as (keyof NeedsScores)[]) {
    base[key] = clamp(base[key] * sizeFactor);
  }

  return base;
}

export function computePotential(input: {
  revenue?: number | null;
  needsScores: NeedsScores;
}): PotentialLevel {
  const revenue = input.revenue ?? 0;
  const avgNeed =
    Object.values(input.needsScores).reduce((a, b) => a + b, 0) /
    Object.values(input.needsScores).length;

  if (revenue >= 20_000_000 && avgNeed >= 60) return PotentialLevel.TRES_FORT;
  if (revenue >= 5_000_000 && avgNeed >= 45) return PotentialLevel.FORT;
  if (revenue >= 500_000 && avgNeed >= 25) return PotentialLevel.MOYEN;
  return PotentialLevel.FAIBLE;
}

export function computeCommercialPriority(potential: PotentialLevel): CommercialPriority {
  switch (potential) {
    case PotentialLevel.TRES_FORT:
      return CommercialPriority.A_PLUS;
    case PotentialLevel.FORT:
      return CommercialPriority.A;
    case PotentialLevel.MOYEN:
      return CommercialPriority.B;
    default:
      return CommercialPriority.D;
  }
}

const OWNER_KEYWORDS = /propri[ée]taire|si[eè]ge social propri[ée]t[ée]|foncier propre/;
const TENANT_KEYWORDS = /locataire|loyer|bail commercial/;
const WAREHOUSE_KEYWORDS = /entrep[ôo]t|plateforme logistique/;
const MULTI_WAREHOUSE_KEYWORDS = /entrep[ôo]ts? (r[ée]gionaux|multiples)|plusieurs sites/;
const INDUSTRIAL_KEYWORDS = /b[âa]timent industriel|site industriel|usine/;
const STORE_KEYWORDS = /magasin|boutique|point de vente/;

export function inferRealEstateSignals(input: { activity?: string | null; description?: string | null; nafCode?: string | null }) {
  const text = `${input.activity ?? ""} ${input.description ?? ""}`.toLowerCase();
  const isWarehouseSector = (input.nafCode ?? "").replace(/\s/g, "").startsWith("5210");

  const hasWarehouse = WAREHOUSE_KEYWORDS.test(text) || isWarehouseSector;
  const hasMultipleWarehouses = MULTI_WAREHOUSE_KEYWORDS.test(text);
  const hasIndustrialBuilding = INDUSTRIAL_KEYWORDS.test(text);
  const hasStore = STORE_KEYWORDS.test(text);
  const hasLogisticsPlatform = /plateforme logistique/.test(text);

  let propertyStatus: "PROPRIETAIRE" | "LOCATAIRE" | "INCONNU" = "INCONNU";
  let confidence = 20; // low confidence by default — nothing but NAF/keywords to go on
  if (OWNER_KEYWORDS.test(text)) {
    propertyStatus = "PROPRIETAIRE";
    confidence = 70;
  } else if (TENANT_KEYWORDS.test(text)) {
    propertyStatus = "LOCATAIRE";
    confidence = 65;
  }

  const anySignal = hasWarehouse || hasMultipleWarehouses || hasIndustrialBuilding || hasStore;
  const overallConfidence = anySignal ? Math.max(confidence, 45) : confidence;

  return {
    propertyStatus,
    propertyStatusConfidence: confidence,
    hasWarehouse,
    hasMultipleWarehouses,
    hasIndustrialBuilding,
    hasStore,
    hasLogisticsPlatform,
    realEstateConfidence: overallConfidence,
  };
}

// ─────────────────────── Logistique interne vs sous-traitée ─────────────

// Prestataires logistiques / transporteurs connus (3PL) — utilisés pour repérer
// une mention explicite du sous-traitant dans le texte libre (activité, description).
const KNOWN_SUBCONTRACTORS = [
  "GEODIS",
  "XPO Logistics",
  "XPO",
  "DHL Supply Chain",
  "DHL",
  "Kuehne+Nagel",
  "Kuehne + Nagel",
  "DB Schenker",
  "Schenker",
  "DSV",
  "Bolloré Logistics",
  "Bolloré",
  "ID Logistics",
  "FM Logistic",
  "STEF",
  "Dachser",
  "Rhenus Logistics",
  "Rhenus",
  "CEVA Logistics",
  "CEVA",
  "GLS",
  "Chronopost",
  "Colissimo",
  "Heppner",
  "Transalliance",
  "Gefco",
];

const INTERNAL_LOGISTICS_KEYWORDS =
  /logistique (int[ée]gr[ée]e|interne|propre)|flotte (propre|de camions propre)|entrep[ôo]ts? propres?|transport en propre|notre propre logistique/;

const SUBCONTRACTED_LOGISTICS_KEYWORDS =
  /sous-?trait[eé]|sous-?traitance|prestataire logistique|externalis[ée]e?|fait appel [àa]|\b3pl\b|confi[ée] [àa]/;

function findKnownSubcontractor(text: string): string | null {
  for (const name of KNOWN_SUBCONTRACTORS) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) return name;
  }
  return null;
}

/**
 * Tente de déterminer si l'entreprise gère sa logistique en interne ou la
 * sous-traite — et, si possible, le nom du sous-traitant — à partir de
 * signaux textuels (activité/description). Purement déterministe ; peut être
 * affiné par une passe IA optionnelle en amont (voir ScoringService).
 */
export function inferLogisticsMode(input: {
  activity?: string | null;
  description?: string | null;
}): {
  logisticsMode: LogisticsMode;
  logisticsSubcontractorName: string | null;
  logisticsModeConfidence: number;
} {
  const text = `${input.activity ?? ""} ${input.description ?? ""}`;
  const lower = text.toLowerCase();

  const namedSubcontractor = findKnownSubcontractor(text);

  if (namedSubcontractor) {
    return {
      logisticsMode: LogisticsMode.SOUS_TRAITANT,
      logisticsSubcontractorName: namedSubcontractor,
      logisticsModeConfidence: 80,
    };
  }

  if (SUBCONTRACTED_LOGISTICS_KEYWORDS.test(lower)) {
    return {
      logisticsMode: LogisticsMode.SOUS_TRAITANT,
      logisticsSubcontractorName: null,
      logisticsModeConfidence: 55,
    };
  }

  if (INTERNAL_LOGISTICS_KEYWORDS.test(lower)) {
    return {
      logisticsMode: LogisticsMode.INTERNE,
      logisticsSubcontractorName: null,
      logisticsModeConfidence: 60,
    };
  }

  return {
    logisticsMode: LogisticsMode.INCONNU,
    logisticsSubcontractorName: null,
    logisticsModeConfidence: 15,
  };
}

// ─────────────────────── Contact decision-role classification ───────────

interface RoleRule {
  role: ContactDecisionRole;
  power: number;
  keywords: RegExp;
}

const ROLE_RULES: RoleRule[] = [
  { role: ContactDecisionRole.PRESIDENT, power: 100, keywords: /pr[ée]sident/i },
  { role: ContactDecisionRole.DIRECTEUR_GENERAL, power: 100, keywords: /directeur g[ée]n[ée]ral|dg\b/i },
  { role: ContactDecisionRole.CEO, power: 100, keywords: /\bceo\b|chief executive/i },
  {
    role: ContactDecisionRole.DIRECTEUR_SUPPLY_CHAIN,
    power: 90,
    keywords: /directeur supply chain|supply chain director/i,
  },
  {
    role: ContactDecisionRole.DIRECTEUR_LOGISTIQUE,
    power: 90,
    keywords: /directeur logistique|directrice logistique/i,
  },
  { role: ContactDecisionRole.ACHETEUR, power: 60, keywords: /acheteur|buyer/i },
  {
    role: ContactDecisionRole.RESPONSABLE_TRANSPORT,
    power: 70,
    keywords: /responsable transport|transport manager/i,
  },
  {
    role: ContactDecisionRole.RESPONSABLE_ENTREPOT,
    power: 60,
    keywords: /responsable entrep[ôo]t|warehouse manager/i,
  },
  {
    role: ContactDecisionRole.RESPONSABLE_EXPLOITATION,
    power: 70,
    keywords: /responsable exploitation|operations manager/i,
  },
  {
    role: ContactDecisionRole.RESPONSABLE_IMMOBILIER,
    power: 65,
    keywords: /responsable immobilier|real estate manager/i,
  },
  {
    role: ContactDecisionRole.RESPONSABLE_ACHATS,
    power: 65,
    keywords: /responsable achats|purchasing manager|procurement/i,
  },
  { role: ContactDecisionRole.RESPONSABLE_SAV, power: 40, keywords: /responsable sav|service client/i },
  {
    role: ContactDecisionRole.RESPONSABLE_ECOMMERCE,
    power: 55,
    keywords: /responsable e-?commerce|ecommerce manager/i,
  },
  { role: ContactDecisionRole.COMMERCIAL, power: 20, keywords: /commercial|sales rep/i },
];

export function classifyContact(jobTitle: string | null | undefined): {
  role: ContactDecisionRole;
  power: number;
} {
  if (!jobTitle) return { role: ContactDecisionRole.AUTRE, power: 20 };
  for (const rule of ROLE_RULES) {
    if (rule.keywords.test(jobTitle)) return { role: rule.role, power: rule.power };
  }
  return { role: ContactDecisionRole.AUTRE, power: 20 };
}
