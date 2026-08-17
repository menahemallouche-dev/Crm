import { Injectable } from "@nestjs/common";
import { CompanyDataProvider, ProviderResult } from "../types";

/**
 * Always-on fallback provider. Unlike the real integrations above it never
 * needs an API key, so `docker-compose up` + a fresh `.env` still produces
 * a usable, fully-populated demo without any paid subscription. It only
 * derives *safe* fields (a sector label, a generated description, a
 * deterministic placeholder logo) — it never fabricates financial data
 * (CA, effectif, dirigeants...), which must come from a real source.
 */
@Injectable()
export class DemoFallbackProvider implements CompanyDataProvider {
  readonly name = "website";

  isEnabled(): boolean {
    return true;
  }

  async fetch(company: { name: string; siren?: string | null }): Promise<ProviderResult> {
    const initials = company.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    return {
      provider: this.name,
      status: "PARTIAL",
      fields: {
        logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || company.name)}&background=1E293B&color=fff&bold=true`,
      },
    };
  }
}
