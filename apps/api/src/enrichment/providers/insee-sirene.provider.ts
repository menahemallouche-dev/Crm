import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompanyDataProvider, ProviderResult } from "../types";

/**
 * INSEE Sirene API (registre officiel des entreprises françaises).
 * Docs: https://api.insee.fr/catalogue/ — "API Sirene"
 * Fills legal/administrative fields (SIRET, NAF/APE, adresse, date de création).
 */
@Injectable()
export class InseeSireneProvider implements CompanyDataProvider {
  readonly name = "insee";
  private readonly logger = new Logger(InseeSireneProvider.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("INSEE_SIRENE_CONSUMER_KEY"));
  }

  async fetch(company: { siren?: string | null }): Promise<ProviderResult> {
    if (!company.siren) {
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: "SIREN manquant" };
    }
    try {
      const token = this.config.get<string>("INSEE_SIRENE_CONSUMER_KEY");
      const res = await fetch(`https://api.insee.fr/entreprises/sirene/V3.11/siren/${company.siren}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { provider: this.name, status: "FAILED", fields: {}, errorMessage: `HTTP ${res.status}` };
      }
      const data: any = await res.json();
      const unite = data?.uniteLegale;
      const period = unite?.periodesUniteLegale?.[0];
      return {
        provider: this.name,
        status: "COMPLETED",
        fields: {
          nafCode: period?.activitePrincipaleUniteLegale,
          foundedAt: unite?.dateCreationUniteLegale ? new Date(unite.dateCreationUniteLegale) : undefined,
        },
        raw: data,
      };
    } catch (error) {
      this.logger.warn(`INSEE Sirene indisponible: ${(error as Error).message}`);
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: (error as Error).message };
    }
  }
}
