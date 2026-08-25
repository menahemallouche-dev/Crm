import { NeedsScores, SectorTag } from "@gecodis/shared";

export interface ProspectResult {
  source: "pappers" | "insee" | "demo";
  siren?: string;
  siret?: string;
  name: string;
  city?: string;
  postalCode?: string;
  address?: string;
  nafCode?: string;
  nafLabel?: string;
  employeeCount?: number;
  revenue?: number;
  /** Free-text description, when the provider exposes one — feeds the logistics-mode heuristic below. */
  activity?: string;
  sector: SectorTag | null;
  needsPreview: NeedsScores;
  logistics: {
    logisticsMode: "INTERNE" | "SOUS_TRAITANT" | "INCONNU";
    logisticsSubcontractorName: string | null;
    logisticsModeConfidence: number;
  };
}

export interface ProspectingSearchParams {
  nafCode?: string;
  city?: string;
  postalCode?: string;
  limit?: number;
}
