"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  RefreshCw,
  Users,
  Warehouse,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { NEEDS_SCORE_LABELS, NeedsScoreKey } from "@gecodis/shared";
import { apiClient } from "@/lib/api-client";
import { Card, Skeleton } from "@/components/ui/misc";
import { Badge, PotentialBadge, PriorityBadge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/companies/score-bar";
import { clsx } from "clsx";

const TABS = [
  "Aperçu",
  "Contacts",
  "Pipeline",
  "Activités",
  "Devis",
  "Factures",
  "Rentabilité",
  "Immobilier",
] as const;

const currency = (v?: number | null) =>
  v || v === 0
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
    : "—";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Aperçu");

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => (await apiClient.get(`/companies/${id}`)).data,
  });

  const enrich = useMutation({
    mutationFn: async () => (await apiClient.post(`/companies/${id}/enrich`)).data,
    onSuccess: () => setTimeout(() => queryClient.invalidateQueries({ queryKey: ["company", id] }), 2000),
  });

  if (isLoading || !company) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const needKeys: NeedsScoreKey[] = ["transport", "logistique", "stockage", "affretement", "fulfillment", "entrepot"];
  const scoreField: Record<NeedsScoreKey, string> = {
    transport: "needScoreTransport",
    logistique: "needScoreLogistique",
    stockage: "needScoreStockage",
    affretement: "needScoreAffretement",
    fulfillment: "needScoreFulfillment",
    entrepot: "needScoreEntrepot",
  };

  return (
    <div>
      {/* Header */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-border-subtle" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Building2 size={28} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-ink">{company.name}</h1>
                <PotentialBadge potential={company.potential} />
                <PriorityBadge priority={company.commercialPriority} />
              </div>
              <p className="text-sm text-ink-muted mt-1">
                {company.activity ?? company.nafLabel ?? "Activité non renseignée"} {company.nafCode && `· NAF ${company.nafCode}`}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
                {company.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {company.address}, {company.city}
                  </span>
                )}
                {company.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {company.phone}
                  </span>
                )}
                {company.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {company.email}
                  </span>
                )}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand">
                    <Globe size={14} /> Site web <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => enrich.mutate()} disabled={enrich.isPending}>
            <RefreshCw size={16} className={enrich.isPending ? "animate-spin" : ""} />
            {enrich.isPending ? "Enrichissement…" : "Ré-enrichir avec l'IA"}
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              tab === t ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Aperçu" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-brand" /> Scores de besoins IA
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {needKeys.map((k) => (
                <ScoreBar key={k} label={NEEDS_SCORE_LABELS[k]} value={company[scoreField[k]]} />
              ))}
            </div>
            {company.aiScoreSummary && (
              <p className="text-sm text-ink-muted mt-4 border-t border-border-subtle pt-4">{company.aiScoreSummary}</p>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink mb-4">Informations légales</h3>
            <dl className="text-sm space-y-2">
              <Row label="SIREN" value={company.siren} />
              <Row label="SIRET" value={company.siret} />
              <Row label="TVA" value={company.vatNumber} />
              <Row label="Capital" value={currency(company.capital)} />
              <Row label="CA" value={currency(company.revenue)} />
              <Row label="Résultat" value={currency(company.netIncome)} />
              <Row label="Effectif" value={company.employeeCount} />
              <Row label="Création" value={company.foundedAt ? new Date(company.foundedAt).toLocaleDateString("fr-FR") : "—"} />
            </dl>
          </Card>

          <Card className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
              <Warehouse size={16} className="text-brand" /> Immobilier
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge tone={company.hasWarehouse ? "brand" : "neutral"}>Entrepôt {company.hasWarehouse ? "✓" : "✗"}</Badge>
              <Badge tone={company.hasMultipleWarehouses ? "brand" : "neutral"}>
                Plusieurs entrepôts {company.hasMultipleWarehouses ? "✓" : "✗"}
              </Badge>
              <Badge tone={company.hasIndustrialBuilding ? "brand" : "neutral"}>
                Bâtiment industriel {company.hasIndustrialBuilding ? "✓" : "✗"}
              </Badge>
              <Badge tone={company.hasStore ? "brand" : "neutral"}>Magasin {company.hasStore ? "✓" : "✗"}</Badge>
              <Badge tone={company.hasLogisticsPlatform ? "brand" : "neutral"}>
                Plateforme logistique {company.hasLogisticsPlatform ? "✓" : "✗"}
              </Badge>
              <Badge tone="neutral">Statut : {company.propertyStatus}</Badge>
              {company.realEstateConfidence != null && (
                <Badge tone="neutral">Confiance IA {company.realEstateConfidence}%</Badge>
              )}
            </div>
          </Card>

          {company.notes && (
            <Card className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-ink mb-2">Notes</h3>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{company.notes}</p>
            </Card>
          )}
        </div>
      )}

      {tab === "Contacts" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Poste (IA)</th>
                <th className="px-4 py-3">Pouvoir de décision</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {company.contacts?.map((c: any) => (
                <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Users size={14} className="text-ink-faint" /> {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{c.jobTitle ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.aiDecisionPower != null ? `${c.aiDecisionPower}%` : "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone ?? c.mobilePhone ?? "—"}</td>
                </tr>
              ))}
              {!company.contacts?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-faint">
                    Aucun contact enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Pipeline" && (
        <div className="space-y-3">
          {company.deals?.map((d: any) => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{d.title}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{d.nextActionLabel ?? "Aucune prochaine action"}</p>
                </div>
                <Badge tone="brand">{d.stage}</Badge>
              </div>
            </Card>
          ))}
          {!company.deals?.length && <p className="text-sm text-ink-faint">Aucune opportunité pour cette entreprise.</p>}
        </div>
      )}

      {tab === "Activités" && (
        <div className="space-y-2">
          {company.activities?.map((a: any) => (
            <Card key={a.id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-ink">
                  {a.type} {a.subject && `— ${a.subject}`}
                </p>
                {a.summary && <p className="text-sm text-ink-muted mt-1">{a.summary}</p>}
              </div>
              <span className="text-xs text-ink-faint whitespace-nowrap">
                {new Date(a.occurredAt).toLocaleDateString("fr-FR")}
              </span>
            </Card>
          ))}
          {!company.activities?.length && <p className="text-sm text-ink-faint">Aucune activité enregistrée.</p>}
        </div>
      )}

      {tab === "Devis" && (
        <div className="space-y-2">
          {company.quotes?.map((q: any) => (
            <Card key={q.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">
                  {q.reference} <span className="text-ink-faint text-xs">v{q.version}</span>
                </p>
                <p className="text-sm text-ink-muted">{currency(q.amountTtc)} TTC</p>
              </div>
              <Badge tone="brand">{q.status}</Badge>
            </Card>
          ))}
          {!company.quotes?.length && <p className="text-sm text-ink-faint">Aucun devis pour cette entreprise.</p>}
        </div>
      )}

      {tab === "Factures" && (
        <div className="space-y-2">
          {company.invoices?.map((inv: any) => (
            <Card key={inv.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{inv.reference}</p>
                <p className="text-sm text-ink-muted">{currency(inv.amountTtc)} TTC</p>
              </div>
              <Badge tone={inv.status === "PAYEE" ? "success" : inv.status === "EN_RETARD" ? "danger" : "neutral"}>
                {inv.status}
              </Badge>
            </Card>
          ))}
          {!company.invoices?.length && <p className="text-sm text-ink-faint">Aucune facture pour cette entreprise.</p>}
        </div>
      )}

      {tab === "Rentabilité" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">CA</th>
                <th className="px-4 py-3">Marge</th>
                <th className="px-4 py-3">Marge %</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {company.profitabilityRecords?.map((p: any) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3">{new Date(p.period).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</td>
                  <td className="px-4 py-3">{currency(p.revenue)}</td>
                  <td className="px-4 py-3">{currency(p.marginAmount)}</td>
                  <td className="px-4 py-3">{p.marginPercent.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        p.rating === "EXCELLENT" ? "success" : p.rating === "BON" ? "brand" : p.rating === "FAIBLE" ? "warning" : "danger"
                      }
                    >
                      {p.rating ?? "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!company.profitabilityRecords?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-faint">
                    Pas encore de données de rentabilité.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Immobilier" && (
        <div className="space-y-2">
          {company.realEstateAssets?.map((a: any) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{a.type}</p>
                <p className="text-sm text-ink-muted">
                  {a.city ?? "—"} {a.surfaceSqm && `· ${a.surfaceSqm} m²`}
                </p>
              </div>
              {a.confidence != null && <Badge tone="neutral">Confiance {a.confidence}%</Badge>}
            </Card>
          ))}
          {!company.realEstateAssets?.length && <p className="text-sm text-ink-faint">Aucun actif immobilier détecté.</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink font-medium">{value ?? "—"}</dd>
    </div>
  );
}
