import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OpenAiService } from "./openai.service";

/**
 * "IA commerciale" — a natural-language assistant answering operational
 * questions over the CRM data (see spec examples: "Qui dois-je appeler
 * aujourd'hui ?", "Quels clients perdent de l'argent ?", ...).
 *
 * Implementation: each supported question is backed by a concrete, typed
 * Prisma query ("intent handler"). When OpenAI is configured we ask it to
 * pick the best-matching handler (function-calling style routing) and to
 * phrase the final answer in French from the structured result; without a
 * key we fall back to French keyword matching over the same handlers, so
 * every example question in the spec works fully offline.
 */

interface IntentHandler {
  key: string;
  description: string;
  keywords: RegExp;
  run: (prisma: PrismaService) => Promise<any>;
  format: (rows: any) => string;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly handlers: IntentHandler[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiService,
  ) {
    this.handlers = this.buildHandlers();
  }

  private buildHandlers(): IntentHandler[] {
    return [
      {
        key: "best_prospects",
        description: "Meilleurs prospects (priorité commerciale A+/A, fort potentiel)",
        keywords: /meilleurs? prospects?|top prospects?/i,
        run: (prisma) =>
          prisma.company.findMany({
            where: { commercialPriority: { in: ["A_PLUS", "A"] } },
            orderBy: [{ commercialPriority: "asc" }, { revenue: "desc" }],
            take: 10,
            select: { id: true, name: true, city: true, commercialPriority: true, potential: true, revenue: true },
          }),
        format: (rows) =>
          rows.length
            ? `Voici vos meilleurs prospects :\n${rows
                .map((r: any) => `• ${r.name} (${r.city ?? "ville inconnue"}) — priorité ${r.commercialPriority}, potentiel ${r.potential}`)
                .join("\n")}`
            : "Aucun prospect à forte priorité identifié pour le moment.",
      },
      {
        key: "who_to_call_today",
        description: "Contacts/entreprises à appeler aujourd'hui",
        keywords: /appeler aujourd'?hui|qui dois-je appeler/i,
        run: (prisma) => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return prisma.deal.findMany({
            where: { nextActionDate: { gte: start, lte: end } },
            include: { company: { select: { name: true } }, primaryContact: true },
            take: 20,
          });
        },
        format: (rows) =>
          rows.length
            ? `Aujourd'hui, vous devez relancer :\n${rows
                .map(
                  (r: any) =>
                    `• ${r.company.name}${r.primaryContact ? ` — ${r.primaryContact.firstName} ${r.primaryContact.lastName}` : ""} (${r.nextActionLabel ?? "action à définir"})`,
                )
                .join("\n")}`
            : "Aucune relance planifiée aujourd'hui. 🎉",
      },
      {
        key: "clients_losing_money",
        description: "Clients dont la rentabilité est à risque",
        keywords: /perdent? de l'argent|non rentables?|rentabilit[ée] (faible|n[ée]gative)|[àa] risque/i,
        run: async (prisma) => {
          const records = await prisma.profitabilityRecord.findMany({
            where: { rating: "A_RISQUE" },
            orderBy: { period: "desc" },
            include: { company: { select: { name: true } } },
          });
          // Keep only the latest at-risk period per company to avoid repeating the same client N times.
          const latestByCompany = new Map<string, (typeof records)[number]>();
          for (const r of records) if (!latestByCompany.has(r.companyId)) latestByCompany.set(r.companyId, r);
          return Array.from(latestByCompany.values()).slice(0, 15);
        },
        format: (rows) =>
          rows.length
            ? `Clients à risque de rentabilité :\n${rows
                .map((r: any) => `• ${r.company.name} — marge ${r.marginPercent.toFixed(1)}% (${r.marginAmount.toFixed(0)} €)`)
                .join("\n")}`
            : "Aucun client identifié comme non rentable actuellement.",
      },
      {
        key: "not_followed_up_30d",
        description: "Clients/prospects non relancés depuis 30 jours",
        keywords: /relanc[ée]s? depuis 30 jours|pas [ée]t[ée] relanc/i,
        run: async (prisma) => {
          const threshold = new Date();
          threshold.setDate(threshold.getDate() - 30);
          const companies = await prisma.company.findMany({
            include: { activities: { orderBy: { occurredAt: "desc" }, take: 1 } },
          });
          return companies
            .filter((c) => !c.activities[0] || c.activities[0].occurredAt < threshold)
            .slice(0, 20);
        },
        format: (rows) =>
          rows.length
            ? `Entreprises sans relance depuis plus de 30 jours :\n${rows.map((r: any) => `• ${r.name}`).join("\n")}`
            : "Toutes les entreprises ont été relancées récemment.",
      },
      {
        key: "high_logistics_potential",
        description: "Prospects à fort potentiel logistique",
        keywords: /fort potentiel logistique|potentiel logistique [ée]lev[ée]/i,
        run: (prisma) =>
          prisma.company.findMany({
            orderBy: { needScoreLogistique: "desc" },
            take: 10,
            select: { id: true, name: true, needScoreLogistique: true, city: true },
          }),
        format: (rows) =>
          `Prospects à fort potentiel logistique :\n${rows
            .map((r: any) => `• ${r.name} — score logistique ${r.needScoreLogistique}/100`)
            .join("\n")}`,
      },
      {
        key: "warehouse_over_5000",
        description: "Entreprises possédant un entrepôt de plus de 5000 m²",
        keywords: /entrep[ôo]t.*5\s?000|5000\s?m[²2]/i,
        run: (prisma) =>
          prisma.companyRealEstateAsset.findMany({
            where: { surfaceSqm: { gt: 5000 } },
            include: { company: { select: { name: true } } },
            take: 20,
          }),
        format: (rows) =>
          rows.length
            ? `Entreprises avec un entrepôt de plus de 5 000 m² :\n${rows
                .map((r: any) => `• ${r.company.name} — ${r.surfaceSqm} m² (${r.city ?? "ville inconnue"})`)
                .join("\n")}`
            : "Aucun entrepôt de plus de 5 000 m² identifié.",
      },
      {
        key: "revenue_over_20m",
        description: "Clients faisant plus de 20 M€ de CA",
        keywords: /20\s?m€|20 millions/i,
        run: (prisma) =>
          prisma.company.findMany({
            where: { revenue: { gt: 20_000_000 } },
            orderBy: { revenue: "desc" },
            take: 20,
            select: { name: true, revenue: true },
          }),
        format: (rows) =>
          rows.length
            ? `Entreprises réalisant plus de 20 M€ de CA :\n${rows
                .map((r: any) => `• ${r.name} — ${(r.revenue / 1_000_000).toFixed(1)} M€`)
                .join("\n")}`
            : "Aucune entreprise ne dépasse 20 M€ de CA dans la base actuelle.",
      },
      {
        key: "directors_never_contacted",
        description: "Dirigeants jamais contactés",
        keywords: /dirigeants? n'ont jamais [ée]t[ée] contact|jamais contact[ée]s?/i,
        run: (prisma) =>
          prisma.contact.findMany({
            where: {
              aiDecisionRole: { in: ["PRESIDENT", "DIRECTEUR_GENERAL", "CEO"] },
              activities: { none: {} },
            },
            include: { company: { select: { name: true } } },
            take: 20,
          }),
        format: (rows) =>
          rows.length
            ? `Dirigeants jamais contactés :\n${rows
                .map((r: any) => `• ${r.firstName} ${r.lastName} (${r.aiDecisionRole}) — ${r.company.name}`)
                .join("\n")}`
            : "Tous les dirigeants ont déjà été contactés au moins une fois.",
      },
    ];
  }

  async ask(question: string): Promise<{ answer: string; intent: string | null }> {
    let handler = this.handlers.find((h) => h.keywords.test(question));

    if (!handler && this.openAi.isEnabled) {
      const routed = await this.openAi.completeJson<{ intent?: string }>(
        `Choisis l'intention la plus proche de la question de l'utilisateur parmi cette liste (réponds en JSON strict {"intent": "clé"}):\n${this.handlers
          .map((h) => `- ${h.key}: ${h.description}`)
          .join("\n")}\nSi aucune ne correspond, renvoie {"intent": null}.`,
        question,
      );
      handler = this.handlers.find((h) => h.key === routed?.intent);
    }

    if (!handler) {
      const generic = this.openAi.isEnabled
        ? await this.openAi.complete(
            "Tu es l'assistant commercial IA d'un CRM B2B logistique/transport français (Gecodis). Réponds de façon concise et actionnable.",
            question,
          )
        : null;
      return {
        intent: null,
        answer:
          generic ??
          "Je ne sais pas encore répondre précisément à cette question. Essayez : « Quels sont mes meilleurs prospects ? », « Qui dois-je appeler aujourd'hui ? », « Quels clients perdent de l'argent ? »…",
      };
    }

    const rows = await handler.run(this.prisma);
    return { intent: handler.key, answer: handler.format(rows) };
  }

  listCapabilities() {
    return this.handlers.map((h) => ({ key: h.key, description: h.description }));
  }
}
