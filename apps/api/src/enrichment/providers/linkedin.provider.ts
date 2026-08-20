import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompanyDataProvider, ProviderResult } from "../types";

/**
 * LinkedIn company enrichment.
 *
 * LinkedIn's own API does not offer public company lookup for third-party
 * apps, and scraping linkedin.com directly violates its Terms of Service —
 * so this provider talks to a compliant third-party enrichment API instead
 * (Proxycurl-compatible contract: https://nubela.co/proxycurl/docs —
 * "Company Profile Endpoint" + "Company Lookup Endpoint"). Any provider
 * exposing the same two endpoints can be used by pointing
 * LINKEDIN_SCRAPER_API_KEY / LINKEDIN_SCRAPER_BASE_URL at it.
 */
@Injectable()
export class LinkedInProvider implements CompanyDataProvider {
  readonly name = "linkedin";
  private readonly logger = new Logger(LinkedInProvider.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("LINKEDIN_SCRAPER_API_KEY"));
  }

  private get baseUrl(): string {
    return this.config.get<string>("LINKEDIN_SCRAPER_BASE_URL") ?? "https://nubela.co/proxycurl/api";
  }

  async fetch(company: {
    name: string;
    city?: string | null;
    linkedinUrl?: string | null;
  }): Promise<ProviderResult> {
    const apiKey = this.config.get<string>("LINKEDIN_SCRAPER_API_KEY");
    const headers = { Authorization: `Bearer ${apiKey}` };

    try {
      let linkedinUrl = (company as any).linkedinUrl as string | undefined;

      if (!linkedinUrl) {
        const resolveRes = await fetch(
          `${this.baseUrl}/linkedin/company/resolve?company_name=${encodeURIComponent(company.name)}&company_location=${encodeURIComponent(company.city ?? "France")}`,
          { headers },
        );
        if (!resolveRes.ok) {
          return { provider: this.name, status: "FAILED", fields: {}, errorMessage: `HTTP ${resolveRes.status} (résolution)` };
        }
        const resolveData: any = await resolveRes.json();
        linkedinUrl = resolveData?.url;
        if (!linkedinUrl) {
          return { provider: this.name, status: "FAILED", fields: {}, errorMessage: "Aucune page LinkedIn trouvée" };
        }
      }

      const profileRes = await fetch(`${this.baseUrl}/linkedin/company?url=${encodeURIComponent(linkedinUrl)}`, { headers });
      if (!profileRes.ok) {
        return { provider: this.name, status: "FAILED", fields: { linkedinUrl }, errorMessage: `HTTP ${profileRes.status} (profil)` };
      }
      const profile: any = await profileRes.json();

      const [minSize, maxSize] = Array.isArray(profile?.company_size) ? profile.company_size : [undefined, undefined];
      const estimatedEmployeeCount = minSize && maxSize ? Math.round((minSize + maxSize) / 2) : undefined;

      return {
        provider: this.name,
        status: "COMPLETED",
        fields: {
          linkedinUrl,
          description: profile?.description,
          sector: profile?.industry,
          logoUrl: profile?.profile_pic_url,
          website: profile?.website,
          employeeCount: estimatedEmployeeCount,
          foundedAt: profile?.founded_year ? new Date(profile.founded_year, 0, 1) : undefined,
        },
        raw: profile,
      };
    } catch (error) {
      this.logger.warn(`LinkedIn (Proxycurl) indisponible: ${(error as Error).message}`);
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: (error as Error).message };
    }
  }
}
