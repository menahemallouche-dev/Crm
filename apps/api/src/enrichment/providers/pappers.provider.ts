import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompanyDataProvider, ProviderResult } from "../types";

/**
 * Pappers.fr API — aggregates INSEE/INPI/BODACC/greffes data plus
 * financials (CA, résultat, capital) and dirigeants.
 * Docs: https://www.pappers.fr/api/documentation
 */
@Injectable()
export class PappersProvider implements CompanyDataProvider {
  readonly name = "pappers";
  private readonly logger = new Logger(PappersProvider.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("PAPPERS_API_KEY"));
  }

  async fetch(company: { siren?: string | null }): Promise<ProviderResult> {
    if (!company.siren) {
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: "SIREN manquant" };
    }
    try {
      const apiKey = this.config.get<string>("PAPPERS_API_KEY");
      const res = await fetch(
        `https://api.pappers.fr/v2/entreprise?api_token=${apiKey}&siren=${company.siren}`,
      );
      if (!res.ok) {
        return { provider: this.name, status: "FAILED", fields: {}, errorMessage: `HTTP ${res.status}` };
      }
      const data: any = await res.json();
      return {
        provider: this.name,
        status: "COMPLETED",
        fields: {
          siret: data.siege?.siret,
          address: data.siege?.adresse_ligne_1,
          city: data.siege?.ville,
          postalCode: data.siege?.code_postal,
          capital: data.capital,
          nafCode: data.code_naf,
          nafLabel: data.libelle_code_naf,
          activity: data.objet_social,
          employeeCount: data.effectif,
          revenue: data.finances?.[0]?.chiffre_affaires,
          netIncome: data.finances?.[0]?.resultat,
          legalRepresentatives: (data.representants ?? []).map((r: any) => ({
            name: `${r.prenom ?? ""} ${r.nom ?? ""}`.trim(),
            role: r.qualite,
          })),
        },
        raw: data,
      };
    } catch (error) {
      this.logger.warn(`Pappers indisponible: ${(error as Error).message}`);
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: (error as Error).message };
    }
  }
}
