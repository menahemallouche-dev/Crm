import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sectorTagForNaf } from "@gecodis/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CompaniesService } from "../companies/companies.service";
import { scoreCompanyNeeds, inferLogisticsMode } from "../ai/heuristics";
import { DEMO_PROSPECTS } from "./prospecting-demo-data";
import { ProspectResult, ProspectingSearchParams } from "./prospecting.types";
import { ImportProspectDto } from "./dto/prospecting.dto";

/**
 * "Chasse commerciale" — manual, on-demand prospecting search by sector/métier
 * against official structured company registries (INSEE Sirene, Pappers), never
 * automatic/scheduled: it's triggered one search at a time from the UI, by design,
 * so it never eats into API quota/capacity unattended. See heuristics.ts for the
 * (best-effort, deterministic) in-house-vs-subcontracted-logistics detection
 * applied to every result.
 *
 * Falls back to a small, clearly-labelled fictional dataset when neither provider
 * is configured, matching the "always demo-able without API keys" rule the rest
 * of the enrichment pipeline follows.
 */
@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
  ) {}

  private get pappersEnabled(): boolean {
    return Boolean(this.config.get<string>("PAPPERS_API_KEY"));
  }

  private get inseeEnabled(): boolean {
    return Boolean(this.config.get<string>("INSEE_SIRENE_CONSUMER_KEY"));
  }

  async search(params: ProspectingSearchParams): Promise<{ provider: "pappers" | "insee" | "demo"; results: ProspectResult[] }> {
    const limit = Math.min(params.limit ?? 20, 50);

    if (this.pappersEnabled) {
      try {
        return { provider: "pappers", results: await this.searchPappers(params, limit) };
      } catch (error) {
        this.logger.warn(`Recherche Pappers indisponible (${(error as Error).message}) — repli sur INSEE/démo.`);
      }
    }
    if (this.inseeEnabled) {
      try {
        return { provider: "insee", results: await this.searchInsee(params, limit) };
      } catch (error) {
        this.logger.warn(`Recherche INSEE Sirene indisponible (${(error as Error).message}) — repli sur démo.`);
      }
    }
    return { provider: "demo", results: this.searchDemo(params, limit) };
  }

  private async searchPappers(params: ProspectingSearchParams, limit: number): Promise<ProspectResult[]> {
    const apiKey = this.config.get<string>("PAPPERS_API_KEY");
    const query = new URLSearchParams({ api_token: apiKey!, par_page: String(limit) });
    if (params.nafCode) query.set("code_naf", params.nafCode);
    if (params.postalCode) query.set("code_postal", params.postalCode);
    if (params.city) query.set("q", params.city);

    const res = await fetch(`https://api.pappers.fr/v2/recherche?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const items: any[] = data?.resultats ?? [];

    return items.map((item) =>
      this.toResult("pappers", {
        siren: item.siren,
        siret: item.siege?.siret,
        name: item.nom_entreprise ?? item.denomination,
        city: item.siege?.ville,
        postalCode: item.siege?.code_postal,
        address: item.siege?.adresse_ligne_1,
        nafCode: item.code_naf,
        nafLabel: item.libelle_code_naf,
        employeeCount: item.effectif ?? undefined,
        revenue: undefined,
        activity: item.objet_social ?? item.libelle_code_naf,
      }),
    );
  }

  private async searchInsee(params: ProspectingSearchParams, limit: number): Promise<ProspectResult[]> {
    const token = this.config.get<string>("INSEE_SIRENE_CONSUMER_KEY");
    const criteria = [
      params.nafCode ? `activitePrincipaleUniteLegale:${params.nafCode}` : null,
      params.postalCode ? `codePostalEtablissement:${params.postalCode}` : null,
    ].filter(Boolean);
    const query = new URLSearchParams({ q: criteria.join(" AND ") || "*", nombre: String(limit) });

    const res = await fetch(`https://api.insee.fr/entreprises/sirene/V3.11/siren?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const items: any[] = data?.unitesLegales ?? [];

    return items.map((item) => {
      const period = item.periodesUniteLegale?.[0] ?? {};
      return this.toResult("insee", {
        siren: item.siren,
        name: period.denominationUniteLegale ?? `${period.prenom1UniteLegale ?? ""} ${period.nomUniteLegale ?? ""}`.trim(),
        nafCode: period.activitePrincipaleUniteLegale,
        activity: undefined,
      });
    });
  }

  private searchDemo(params: ProspectingSearchParams, limit: number): ProspectResult[] {
    let pool = DEMO_PROSPECTS;
    if (params.nafCode) {
      const prefix = params.nafCode.replace(/\s/g, "").slice(0, 2);
      pool = pool.filter((p) => p.nafCode.startsWith(prefix));
    }
    if (params.city) {
      const needle = params.city.toLowerCase();
      pool = pool.filter((p) => p.city.toLowerCase().includes(needle));
    }
    if (params.postalCode) {
      pool = pool.filter((p) => p.postalCode.startsWith(params.postalCode!.slice(0, 2)));
    }
    return pool.slice(0, limit).map((p) =>
      this.toResult("demo", {
        name: p.name,
        city: p.city,
        postalCode: p.postalCode,
        nafCode: p.nafCode,
        employeeCount: p.employeeCount,
        revenue: p.revenue,
        activity: p.activity,
      }),
    );
  }

  private toResult(source: ProspectResult["source"], fields: Partial<ProspectResult>): ProspectResult {
    const needsPreview = scoreCompanyNeeds({
      nafCode: fields.nafCode,
      employeeCount: fields.employeeCount,
      revenue: fields.revenue,
      activity: fields.activity,
    });
    const logistics = inferLogisticsMode({ activity: fields.activity });
    return {
      source,
      name: fields.name ?? "Entreprise sans nom",
      siren: fields.siren,
      siret: fields.siret,
      city: fields.city,
      postalCode: fields.postalCode,
      address: fields.address,
      nafCode: fields.nafCode,
      nafLabel: fields.nafLabel,
      employeeCount: fields.employeeCount,
      revenue: fields.revenue,
      activity: fields.activity,
      sector: sectorTagForNaf(fields.nafCode),
      needsPreview,
      logistics,
    };
  }

  /**
   * Turns a search result into a real Company record — reuses CompaniesService.create()
   * so the normal enrichment/scoring pipeline runs on it exactly like any other company.
   * De-duplicates on SIREN (or name+city as a fallback) so re-importing the same
   * prospect twice just returns the existing record instead of creating a duplicate.
   */
  async importAsCompany(prospect: ImportProspectDto, actingUserId?: string) {
    const existing = await this.prisma.company.findFirst({
      where: prospect.siren
        ? { siren: prospect.siren }
        : { name: { equals: prospect.name, mode: "insensitive" }, city: prospect.city ?? undefined },
    });
    if (existing) return { company: existing, alreadyExisted: true };

    const company = await this.companiesService.create(
      {
        name: prospect.name,
        siren: prospect.siren,
        siret: prospect.siret,
        address: prospect.address,
        city: prospect.city,
        postalCode: prospect.postalCode,
        nafCode: prospect.nafCode,
        nafLabel: prospect.nafLabel,
        activity: prospect.activity,
        employeeCount: prospect.employeeCount,
        revenue: prospect.revenue,
        ownerUserId: actingUserId,
      },
      actingUserId,
    );
    return { company, alreadyExisted: false };
  }
}
