import { Injectable, Logger } from "@nestjs/common";
import { NeedsScores } from "@gecodis/shared";
import { OpenAiService } from "./openai.service";
import {
  classifyContact,
  computeCommercialPriority,
  computePotential,
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
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly openAi: OpenAiService) {}

  async scoreCompany(input: CompanyScoringInput): Promise<CompanyScoringResult> {
    const heuristicScores = scoreCompanyNeeds(input);
    const realEstate = inferRealEstateSignals(input);

    let needsScores = heuristicScores;
    let summary = this.buildHeuristicSummary(input, heuristicScores);

    if (this.openAi.isEnabled) {
      const aiResult = await this.openAi.completeJson<{
        needsScores?: Partial<NeedsScores>;
        summary?: string;
      }>(
        `Tu es un analyste commercial spécialisé en logistique, transport et immobilier logistique B2B.
Analyse l'entreprise fournie et renvoie un JSON strict de la forme:
{"needsScores": {"transport": 0-100, "logistique": 0-100, "stockage": 0-100, "affretement": 0-100, "fulfillment": 0-100, "entrepot": 0-100}, "summary": "2-3 phrases en français expliquant le potentiel commercial pour un prestataire logistique/transport"}
Base-toi sur le code NAF, l'activité, l'effectif et le chiffre d'affaires.`,
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
    }

    const potential = computePotential({ revenue: input.revenue, needsScores });
    const commercialPriority = computeCommercialPriority(potential);

    return { needsScores, potential, commercialPriority, summary, realEstate };
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
