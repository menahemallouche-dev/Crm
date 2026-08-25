/**
 * Domain vocabulary shared between the API (Prisma/NestJS) and the web app.
 * Keeping these as plain string-literal enums (rather than Prisma-generated
 * types) lets the frontend import them without depending on the API build.
 */

export enum PipelineStage {
  PROSPECT_FROID = "PROSPECT_FROID",
  PREMIER_APPEL = "PREMIER_APPEL",
  RELANCE_1 = "RELANCE_1",
  RELANCE_2 = "RELANCE_2",
  RDV = "RDV",
  DEVIS = "DEVIS",
  NEGOCIATION = "NEGOCIATION",
  GAGNE = "GAGNE",
  PERDU = "PERDU",
}

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.PROSPECT_FROID,
  PipelineStage.PREMIER_APPEL,
  PipelineStage.RELANCE_1,
  PipelineStage.RELANCE_2,
  PipelineStage.RDV,
  PipelineStage.DEVIS,
  PipelineStage.NEGOCIATION,
  PipelineStage.GAGNE,
  PipelineStage.PERDU,
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.PROSPECT_FROID]: "Prospect froid",
  [PipelineStage.PREMIER_APPEL]: "Premier appel",
  [PipelineStage.RELANCE_1]: "Relance 1",
  [PipelineStage.RELANCE_2]: "Relance 2",
  [PipelineStage.RDV]: "RDV",
  [PipelineStage.DEVIS]: "Devis",
  [PipelineStage.NEGOCIATION]: "Négociation",
  [PipelineStage.GAGNE]: "Gagné",
  [PipelineStage.PERDU]: "Perdu",
};

export enum CommercialPriority {
  A_PLUS = "A_PLUS",
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

export const COMMERCIAL_PRIORITY_LABELS: Record<CommercialPriority, string> = {
  [CommercialPriority.A_PLUS]: "A+",
  [CommercialPriority.A]: "A",
  [CommercialPriority.B]: "B",
  [CommercialPriority.C]: "C",
  [CommercialPriority.D]: "D",
};

export enum PotentialLevel {
  FAIBLE = "FAIBLE",
  MOYEN = "MOYEN",
  FORT = "FORT",
  TRES_FORT = "TRES_FORT",
}

export const POTENTIAL_LEVEL_LABELS: Record<PotentialLevel, string> = {
  [PotentialLevel.FAIBLE]: "Faible",
  [PotentialLevel.MOYEN]: "Moyen",
  [PotentialLevel.FORT]: "Fort",
  [PotentialLevel.TRES_FORT]: "Très fort",
};

export enum ProfitabilityRating {
  EXCELLENT = "EXCELLENT",
  BON = "BON",
  FAIBLE = "FAIBLE",
  A_RISQUE = "A_RISQUE",
}

export const PROFITABILITY_RATING_LABELS: Record<ProfitabilityRating, string> = {
  [ProfitabilityRating.EXCELLENT]: "Excellent",
  [ProfitabilityRating.BON]: "Bon",
  [ProfitabilityRating.FAIBLE]: "Faible",
  [ProfitabilityRating.A_RISQUE]: "À risque",
};

export enum PropertyStatus {
  PROPRIETAIRE = "PROPRIETAIRE",
  LOCATAIRE = "LOCATAIRE",
  INCONNU = "INCONNU",
}

export enum RealEstateAssetType {
  ENTREPOT = "ENTREPOT",
  PLUSIEURS_ENTREPOTS = "PLUSIEURS_ENTREPOTS",
  BATIMENT_INDUSTRIEL = "BATIMENT_INDUSTRIEL",
  MAGASIN = "MAGASIN",
  PLATEFORME_LOGISTIQUE = "PLATEFORME_LOGISTIQUE",
  BUREAU = "BUREAU",
}

export enum ContactDecisionRole {
  PRESIDENT = "PRESIDENT",
  DIRECTEUR_GENERAL = "DIRECTEUR_GENERAL",
  CEO = "CEO",
  DIRECTEUR_SUPPLY_CHAIN = "DIRECTEUR_SUPPLY_CHAIN",
  DIRECTEUR_LOGISTIQUE = "DIRECTEUR_LOGISTIQUE",
  ACHETEUR = "ACHETEUR",
  RESPONSABLE_TRANSPORT = "RESPONSABLE_TRANSPORT",
  RESPONSABLE_ENTREPOT = "RESPONSABLE_ENTREPOT",
  RESPONSABLE_EXPLOITATION = "RESPONSABLE_EXPLOITATION",
  RESPONSABLE_IMMOBILIER = "RESPONSABLE_IMMOBILIER",
  RESPONSABLE_ACHATS = "RESPONSABLE_ACHATS",
  RESPONSABLE_SAV = "RESPONSABLE_SAV",
  RESPONSABLE_ECOMMERCE = "RESPONSABLE_ECOMMERCE",
  COMMERCIAL = "COMMERCIAL",
  AUTRE = "AUTRE",
}

export const CONTACT_DECISION_ROLE_LABELS: Record<ContactDecisionRole, string> = {
  [ContactDecisionRole.PRESIDENT]: "Président",
  [ContactDecisionRole.DIRECTEUR_GENERAL]: "Directeur Général",
  [ContactDecisionRole.CEO]: "CEO",
  [ContactDecisionRole.DIRECTEUR_SUPPLY_CHAIN]: "Directeur Supply Chain",
  [ContactDecisionRole.DIRECTEUR_LOGISTIQUE]: "Directeur Logistique",
  [ContactDecisionRole.ACHETEUR]: "Acheteur",
  [ContactDecisionRole.RESPONSABLE_TRANSPORT]: "Responsable Transport",
  [ContactDecisionRole.RESPONSABLE_ENTREPOT]: "Responsable Entrepôt",
  [ContactDecisionRole.RESPONSABLE_EXPLOITATION]: "Responsable Exploitation",
  [ContactDecisionRole.RESPONSABLE_IMMOBILIER]: "Responsable Immobilier",
  [ContactDecisionRole.RESPONSABLE_ACHATS]: "Responsable Achats",
  [ContactDecisionRole.RESPONSABLE_SAV]: "Responsable SAV",
  [ContactDecisionRole.RESPONSABLE_ECOMMERCE]: "Responsable E-commerce",
  [ContactDecisionRole.COMMERCIAL]: "Commercial",
  [ContactDecisionRole.AUTRE]: "Autre",
};

export enum ContactInfluence {
  DECISIONNAIRE = "DECISIONNAIRE",
  INFLUENCEUR = "INFLUENCEUR",
  UTILISATEUR = "UTILISATEUR",
}

export enum ActivityType {
  APPEL = "APPEL",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  VISITE = "VISITE",
  RDV = "RDV",
  TACHE = "TACHE",
  NOTE = "NOTE",
  DOCUMENT_ENVOYE = "DOCUMENT_ENVOYE",
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.APPEL]: "Appel",
  [ActivityType.EMAIL]: "Email",
  [ActivityType.WHATSAPP]: "WhatsApp",
  [ActivityType.VISITE]: "Visite",
  [ActivityType.RDV]: "RDV",
  [ActivityType.TACHE]: "Tâche",
  [ActivityType.NOTE]: "Note",
  [ActivityType.DOCUMENT_ENVOYE]: "Document envoyé",
};

export enum LogisticsMode {
  INTERNE = "INTERNE",
  SOUS_TRAITANT = "SOUS_TRAITANT",
  INCONNU = "INCONNU",
}

export const LOGISTICS_MODE_LABELS: Record<LogisticsMode, string> = {
  [LogisticsMode.INTERNE]: "Logistique interne",
  [LogisticsMode.SOUS_TRAITANT]: "Sous-traitée",
  [LogisticsMode.INCONNU]: "Inconnu",
};

/** Sector tag shown as a small icon/badge next to a company — a lightweight,
 *  generic pictogram (not a real brand logo) inferred from its NAF code. */
export interface SectorTag {
  key: string;
  label: string;
  icon: string; // emoji, kept generic/non-trademarked
}

interface SectorDefinition {
  key: string;
  label: string;
  icon: string;
  nafPrefixRegex: RegExp;
  /** A precise, representative NAF/APE code for this sector — used to pre-fill a
   *  "chasse commerciale" search by métier (see prospecting module) since the
   *  official search APIs (INSEE Sirene, Pappers) filter on an exact NAF code
   *  rather than a prefix. Editable by the user before searching. */
  representativeNafCode: string;
}

// NAF/APE codes appear both dotted ("52.10B") and undotted ("5210B") across providers
// and free-text entry — `\.?` makes the dot optional so either form matches.
const SECTOR_DEFINITIONS: SectorDefinition[] = [
  { key: "agroalimentaire", label: "Agroalimentaire", icon: "🌾", nafPrefixRegex: /^10\.?|^11\.?/, representativeNafCode: "1039B" },
  { key: "transport", label: "Transport routier", icon: "🚚", nafPrefixRegex: /^49\.?41|^49\.?20/, representativeNafCode: "4941A" },
  { key: "entreposage", label: "Entreposage", icon: "📦", nafPrefixRegex: /^52\.?10/, representativeNafCode: "5210B" },
  { key: "manutention", label: "Manutention", icon: "🏗️", nafPrefixRegex: /^52\.?24/, representativeNafCode: "5224B" },
  { key: "affretement", label: "Affrètement", icon: "🚢", nafPrefixRegex: /^52\.?29/, representativeNafCode: "5229A" },
  { key: "ecommerce", label: "E-commerce", icon: "🛒", nafPrefixRegex: /^47\.?91/, representativeNafCode: "4791B" },
  { key: "commerce-gros", label: "Commerce de gros", icon: "🏬", nafPrefixRegex: /^46\.?/, representativeNafCode: "4690Z" },
  { key: "commerce-detail", label: "Commerce de détail", icon: "🏪", nafPrefixRegex: /^47\.?/, representativeNafCode: "4719B" },
  { key: "construction", label: "BTP / Construction", icon: "🏗️", nafPrefixRegex: /^41\.?|^42\.?|^43\.?/, representativeNafCode: "4120A" },
];

const SECTOR_RULES: [RegExp, SectorTag][] = SECTOR_DEFINITIONS.map((d) => [d.nafPrefixRegex, { key: d.key, label: d.label, icon: d.icon }]);

/** Sector picklist for the prospecting search form — label + icon + a starting-point NAF code per sector. */
export const SECTOR_OPTIONS: (SectorTag & { representativeNafCode: string })[] = SECTOR_DEFINITIONS.map((d) => ({
  key: d.key,
  label: d.label,
  icon: d.icon,
  representativeNafCode: d.representativeNafCode,
}));

export function sectorTagForNaf(nafCode?: string | null): SectorTag | null {
  if (!nafCode) return null;
  const normalized = nafCode.replace(/\s/g, "");
  for (const [regex, tag] of SECTOR_RULES) {
    if (regex.test(normalized)) return tag;
  }
  if (/^\d\d\./.test(normalized) || /^\d{4}/.test(normalized)) {
    return { key: "industrie", label: "Industrie", icon: "🏭" };
  }
  return null;
}

export enum QuoteStatus {
  BROUILLON = "BROUILLON",
  ENVOYE = "ENVOYE",
  SIGNE = "SIGNE",
  REFUSE = "REFUSE",
  EXPIRE = "EXPIRE",
}

export enum InvoiceStatus {
  EN_ATTENTE = "EN_ATTENTE",
  PAYEE = "PAYEE",
  EN_RETARD = "EN_RETARD",
  ANNULEE = "ANNULEE",
}

export enum CostCategory {
  TRANSPORT = "TRANSPORT",
  STOCKAGE = "STOCKAGE",
  PREPARATION = "PREPARATION",
  SAV = "SAV",
  PALETTES = "PALETTES",
  MANUTENTION = "MANUTENTION",
  AUTRE = "AUTRE",
}

export enum CampaignStatus {
  BROUILLON = "BROUILLON",
  PROGRAMMEE = "PROGRAMMEE",
  ENVOYEE = "ENVOYEE",
  TERMINEE = "TERMINEE",
}

export enum RealEstateOpportunityType {
  LOCATION = "LOCATION",
  VENTE = "VENTE",
}

export enum ContractStatus {
  BROUILLON = "BROUILLON",
  ACTIF = "ACTIF",
  EXPIRE = "EXPIRE",
  RESILIE = "RESILIE",
}

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  COMMERCIAL = "COMMERCIAL",
  LECTURE_SEULE = "LECTURE_SEULE",
}

export const NEEDS_SCORE_KEYS = [
  "transport",
  "logistique",
  "stockage",
  "affretement",
  "fulfillment",
  "entrepot",
] as const;

export type NeedsScoreKey = (typeof NEEDS_SCORE_KEYS)[number];

export const NEEDS_SCORE_LABELS: Record<NeedsScoreKey, string> = {
  transport: "Besoin Transport",
  logistique: "Besoin Logistique",
  stockage: "Besoin Stockage",
  affretement: "Besoin Affrètement",
  fulfillment: "Besoin Fulfillment",
  entrepot: "Besoin Entrepôt",
};
