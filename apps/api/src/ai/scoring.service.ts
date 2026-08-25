import { Injectable, Logger } from "@nestjs/common";
import { NeedsScores } from "@gecodis/shared";
import { OpenAiService } from "./openai.service";
import {
  classifyContact,
  computeCommercialPriority,
  computePotential,
  inferLogisticsMode,
  inferRealEstateSignals,
  scoreCompanyNeeds,
} from "./heuristics";

export interface CompanyScoringInput {
  name: string;
  nafCode?: string | null;
  nafLabel?: string | null;
  activity?: string | null;
  description?: string | null;
  employeeCount?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  city?: string | null;
}

export interface CompanyScoringResult {
  needsScores: NeedsScores;
  potential: ReturnType<typeof computePotential>;
  commercialPriority: ReturnType<typeof computeCommercialPriority>;
  summary: string;
  realEstate: ReturnType<typeof inferRealEstateSignals>;
  logistics: ReturnType<typeof inferLogisticsMode>;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly openAi: OpenAiService) {}

  async scoreCompany(input: CompanyScoringInput): Promise<CompanyScoringResult> {
    const heuristicScores = scoreCompanyNeeds(input);
    const realEstate = inferRealEstateSignals(input);
    let logistics = inferLogisticsMode(input);

    let needsScores = heuristicScores;
    let summary = this.buildHeuristicSummary(input, heuristicScores);

    if (this.openAi.isEnabled) {
      const aiResult = await this.openAi.completeJson<{
        needsScores?: Partial<NeedsScores>;
        summary?: string;
        logisticsMode?: string;
        logisticsSubcontractorName?: string;
      }>(
        `Tu es un analyste commercial spécialisé en logistique, transport et immobilier logistique B2B.
Analyse l'entreprise fournie et renvoie un JSON strict de la forme:
{"needsScores": {"transport": 0-100, "logistique": 0-100, "stockage": 0-100, "affretement": 0-100, "fulfillment": 0-100, "entrepot": 0-100}, "summary": "2-3 phrases en français expliquant le potentiel commercial pour un prestataire logistique/transport", "logisticsMode": "INTERNE|SOUS_TRAITANT|INCONNU", "logisticsSubcontractorName": "nom du sous-traitant logistique si identifiable, sinon null"}
Base-toi sur le code NAF, l'activité, l'effectif et le chiffre d'affaires. Pour logisticsMode, déduis si l'entreprise gère probablement sa logistique en interne (flotte/entrepôts propres) ou la sous-traite à un prestataire (GEODIS, XPO, DHL, Kuehne+Nagel, DB Schenker, DSV, etc.) — INCONNU si aucun signal.`,
        JSON.stringify(input),
      );

      if (aiResult?.needsScores) {
        // Blend AI output with heuristic baseline (average) for stability/explainability.
        needsScores = Object.fromEntries(
          Object.keys(heuristicScores).map((key) => {
            const k = key as keyof NeedsScores;
            const aiVal = aiResult.needsScores?.[k];
            const blended =
              typeof aiVal === "number" ? Math.round((aiVal + heuristicScores[k]) / 2) : heuristicScores[k];
            return [k, blended];
          }),
        ) as NeedsScores;
      }
      if (aiResult?.summary) summary = aiResult.summary;

      // Only let the AI override the heuristic when it's confident enough to name a
      // mode; otherwise keep the deterministic (and explainable) heuristic result.
      if (
        aiResult?.logisticsMode &&
        ["INTERNE", "SOUS_TRAITANT", "INCONNU"].includes(aiResult.logisticsMode) &&
        aiResult.logisticsMode !== "INCONNU"
      ) {
        logistics = {
          logisticsMode: aiResult.logisticsMode as typeof logistics.logisticsMode,
          logisticsSubcontractorName:
            aiResult.logisticsSubcontractorName ?? logistics.logisticsSubcontractorName,
          logisticsModeConfidence: Math.max(logistics.logisticsModeConfidence, 65),
        };
      }
    }

    const potential = computePotential({ revenue: input.revenue, needsScores });
    const commercialPriority = computeCommercialPriority(potential);

    return { needsScores, potential, commercialPriority, summary, realEstate, logistics };
  }

  async classifyContactRole(input: { jobTitle?: string | null; companyName?: string | null }) {
    const heuristic = classifyContact(input.jobTitle);

    if (this.openAi.isEnabled && input.jobTitle) {
      const aiResult = await this.openAi.completeJson<{ role?: string; power?: number }>(
        `Classe le poste fourni parmi: PRESIDENT, DIRECTEUR_GENERAL, CEO, DIRECTEUR_SUPPLY_CHAIN, DIRECTEUR_LOGISTIQUE, ACHETEUR, RESPONSABLE_TRANSPORT, RESPONSABLE_ENTREPOT, RESPONSABLE_EXPLOITATION, RESPONSABLE_IMMOBILIER, RESPONSABLE_ACHATS, RESPONSABLE_SAV, RESPONSABLE_ECOMMERCE, COMMERCIAL, AUTRE.
Renvoie un JSON strict {"role": "...", "power": 0-100} où power est le pouvoir de décision estimé pour un achat de prestations logistiques/transport.`,
        `Poste: ${input.jobTitle}. Entreprise: ${input.companyName ?? "inconnue"}.`,
      );
      if (aiResult?.role) {
        return {
          role: aiResult.role as any,
          power: typeof aiResult.power === "number" ? aiResult.power : heuristic.power,
        };
      }
    }
    return heuristic;
  }

  private buildHeuristicSummary(input: CompanyScoringInput, scores: NeedsScores): string {
    const topNeed = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const revenueLabel = input.revenue ? `${Math.round(input.revenue / 1000)} k€ de CA` : "CA inconnu";
    return `Analyse automatique (heuristique) : ${input.name} (${revenueLabel}, ${
      input.employeeCount ?? "?"
    } salariés) présente un besoin dominant en ${topNeed?.[0]} (score ${topNeed?.[1]}/100). Configurez OPENAI_API_KEY pour une analyse qualitative approfondie.`;
  }
}
