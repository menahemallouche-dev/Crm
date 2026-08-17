import { Company } from "@prisma/client";

/** Fields an enrichment provider may contribute. All optional — providers fill what they can. */
export interface EnrichmentFields {
  siret?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  department?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  employeeCount?: number;
  revenue?: number;
  netIncome?: number;
  capital?: number;
  foundedAt?: Date;
  activity?: string;
  nafCode?: string;
  nafLabel?: string;
  description?: string;
  sector?: string;
  logoUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  googleMapsUrl?: string;
  googleRating?: number;
  googleReviewsCount?: number;
  legalRepresentatives?: { name: string; role: string }[];
}

export interface ProviderResult {
  provider: string;
  status: "COMPLETED" | "FAILED" | "PARTIAL";
  fields: EnrichmentFields;
  raw?: unknown;
  errorMessage?: string;
}

export interface CompanyDataProvider {
  readonly name: string;
  isEnabled(): boolean;
  fetch(company: Pick<Company, "id" | "name" | "siren" | "siret" | "city" | "address">): Promise<ProviderResult>;
}
