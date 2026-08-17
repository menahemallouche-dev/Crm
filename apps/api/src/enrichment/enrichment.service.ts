import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InseeSireneProvider } from "./providers/insee-sirene.provider";
import { PappersProvider } from "./providers/pappers.provider";
import { GooglePlacesProvider } from "./providers/google-places.provider";
import { DemoFallbackProvider } from "./providers/demo-fallback.provider";
import { CompanyDataProvider, EnrichmentFields } from "./types";
import { ScoringService } from "../ai/scoring.service";

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly providers: CompanyDataProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    insee: InseeSireneProvider,
    pappers: PappersProvider,
    googlePlaces: GooglePlacesProvider,
    demoFallback: DemoFallbackProvider,
  ) {
    // Order matters: authoritative legal/financial sources first, generic
    // presence sources last, since later providers never overwrite a field
    // already filled by an earlier one (see mergeFields()).
    this.providers = [insee, pappers, googlePlaces, demoFallback];
  }

  /** Runs every enabled provider for a company, merges results, updates the record, then re-scores it. */
  async enrichCompany(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    await this.prisma.company.update({
      where: { id: companyId },
      data: { enrichmentStatus: "IN_PROGRESS" },
    });

    const merged: EnrichmentFields = {};
    let anyCompleted = false;
    let anyFailed = false;

    for (const provider of this.providers) {
      if (!provider.isEnabled()) continue;
      const result = await provider.fetch(company);
      await this.prisma.enrichmentLog.create({
        data: {
          companyId,
          provider: result.provider,
          status: result.status,
          fieldsFound: result.fields as any,
          rawResponse: (result.raw ?? null) as any,
          errorMessage: result.errorMessage,
        },
      });
      if (result.status === "FAILED") anyFailed = true;
      else anyCompleted = true;
      this.mergeFields(merged, result.fields);
    }

    const updateData = this.toCompanyUpdate(merged);
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...updateData,
        enrichmentStatus: anyCompleted ? (anyFailed ? "PARTIAL" : "COMPLETED") : "FAILED",
        lastEnrichedAt: new Date(),
      },
    });

    await this.rescoreCompany(companyId);
    this.logger.log(`Enrichissement terminé pour ${updated.name} (${company.id})`);
    return this.prisma.company.findUnique({ where: { id: companyId } });
  }

  async rescoreCompany(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const result = await this.scoring.scoreCompany({
      name: company.name,
      nafCode: company.nafCode,
      nafLabel: company.nafLabel,
      activity: company.activity,
      description: company.description,
      employeeCount: company.employeeCount,
      revenue: company.revenue,
      netIncome: company.netIncome,
      city: company.city,
    });

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        needScoreTransport: result.needsScores.transport,
        needScoreLogistique: result.needsScores.logistique,
        needScoreStockage: result.needsScores.stockage,
        needScoreAffretement: result.needsScores.affretement,
        needScoreFulfillment: result.needsScores.fulfillment,
        needScoreEntrepot: result.needsScores.entrepot,
        potential: result.potential,
        commercialPriority: result.commercialPriority,
        aiScoreSummary: result.summary,
        aiScoredAt: new Date(),
        propertyStatus: company.propertyStatus === "INCONNU" ? (result.realEstate.propertyStatus as any) : company.propertyStatus,
        propertyStatusConfidence: result.realEstate.propertyStatusConfidence,
        hasWarehouse: company.hasWarehouse || result.realEstate.hasWarehouse,
        hasMultipleWarehouses: company.hasMultipleWarehouses || result.realEstate.hasMultipleWarehouses,
        hasIndustrialBuilding: company.hasIndustrialBuilding || result.realEstate.hasIndustrialBuilding,
        hasStore: company.hasStore || result.realEstate.hasStore,
        hasLogisticsPlatform: company.hasLogisticsPlatform || result.realEstate.hasLogisticsPlatform,
        realEstateConfidence: result.realEstate.realEstateConfidence,
      },
    });
  }

  /** Only fills fields that are still empty — never overwrites manually-entered or already-enriched data. */
  private mergeFields(target: EnrichmentFields, incoming: EnrichmentFields) {
    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined || value === null) continue;
      if ((target as any)[key] === undefined || (target as any)[key] === null) {
        (target as any)[key] = value;
      }
    }
  }

  private toCompanyUpdate(fields: EnrichmentFields) {
    const { legalRepresentatives, ...rest } = fields;
    return {
      ...rest,
      ...(legalRepresentatives ? { legalRepresentatives: legalRepresentatives as any } : {}),
    };
  }
}
