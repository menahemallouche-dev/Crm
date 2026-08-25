"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, CheckCircle2, Info, Warehouse, Truck } from "lucide-react";
import { LOGISTICS_MODE_LABELS, LogisticsMode, NEEDS_SCORE_LABELS, SECTOR_OPTIONS } from "@gecodis/shared";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/companies/score-bar";

const LOGISTICS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  INTERNE: "success",
  SOUS_TRAITANT: "warning",
  INCONNU: "neutral",
};

export default function ProspectingPage() {
  const queryClient = useQueryClient();
  const [sectorKey, setSectorKey] = useState("");
  const [nafCode, setNafCode] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [importedIds, setImportedIds] = useState<Record<string, string>>({}); // key -> companyId

  const search = useMutation({
    mutationFn: async () =>
      (
        await apiClient.get("/prospecting/search", {
          params: { nafCode: nafCode || undefined, city: city || undefined, postalCode: postalCode || undefined, limit: 20 },
        })
      ).data as { provider: "pappers" | "insee" | "demo"; results: any[] },
  });

  const importProspect = useMutation({
    mutationFn: async (prospect: any) => (await apiClient.post("/prospecting/import", prospect)).data,
    onSuccess: (data, prospect) => {
      setImportedIds((prev) => ({ ...prev, [resultKey(prospect)]: data.company.id }));
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  function resultKey(r: any) {
    return r.siren ?? `${r.name}-${r.city ?? ""}`;
  }

  function onSelectSector(key: string) {
    setSectorKey(key);
    const sector = SECTOR_OPTIONS.find((s) => s.key === key);
    if (sector) setNafCode(sector.representativeNafCode);
  }

  return (
    <div>
      <PageHeader
        title="Chasse commerciale"
        description="Recherche manuelle de nouveaux prospects par secteur/métier — déclenchée à la demande, jamais automatique."
      />

      <Card className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search.mutate();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="text-xs font-medium text-ink-faint uppercase tracking-wide">Secteur</label>
            <select className="input mt-1" value={sectorKey} onChange={(e) => onSelectSector(e.target.value)}>
              <option value="">Tous secteurs</option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-faint uppercase tracking-wide">Code NAF</label>
            <input className="input mt-1" placeholder="Ex : 4941A" value={nafCode} onChange={(e) => setNafCode(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-faint uppercase tracking-wide">Ville</label>
            <input className="input mt-1" placeholder="Ex : Lyon" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-faint uppercase tracking-wide">Code postal</label>
            <input className="input mt-1" placeholder="Ex : 69000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={search.isPending}>
            <Search size={16} /> {search.isPending ? "Recherche…" : "Rechercher"}
          </button>
        </form>
      </Card>

      {search.data?.provider === "demo" && (
        <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 rounded-lg px-3 py-2 mb-4">
          <Info size={15} />
          Aucun fournisseur configuré (INSEE Sirene / Pappers) — résultats de démonstration. Renseignez
          INSEE_SIRENE_CONSUMER_KEY ou PAPPERS_API_KEY pour rechercher parmi les vraies entreprises françaises.
        </div>
      )}

      {!search.data && !search.isPending && (
        <EmptyState
          title="Aucune recherche lancée"
          description="Choisissez un secteur ou un code NAF, éventuellement une ville, puis cliquez sur Rechercher."
        />
      )}

      {search.data && search.data.results.length === 0 && (
        <EmptyState title="Aucun résultat" description="Essayez un secteur ou une zone géographique plus large." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {search.data?.results.map((r: any) => {
          const key = resultKey(r);
          const importedCompanyId = importedIds[key];
          return (
            <Card key={key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {r.sector && <span title={r.sector.label}>{r.sector.icon}</span>}
                    <h3 className="font-medium text-ink">{r.name}</h3>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {r.city ?? "Ville inconnue"} {r.postalCode && `· ${r.postalCode}`} {r.nafCode && `· NAF ${r.nafCode}`}
                  </p>
                  {r.nafLabel && <p className="text-xs text-ink-faint">{r.nafLabel}</p>}
                </div>
                {importedCompanyId ? (
                  <Link href={`/companies/${importedCompanyId}`} className="btn-secondary !py-1.5 whitespace-nowrap">
                    <CheckCircle2 size={14} className="text-success" /> Voir la fiche
                  </Link>
                ) : (
                  <button
                    className="btn-primary !py-1.5 whitespace-nowrap"
                    onClick={() => importProspect.mutate(r)}
                    disabled={importProspect.isPending}
                  >
                    <Plus size={14} /> Importer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                <ScoreBar label={NEEDS_SCORE_LABELS.transport} value={r.needsPreview?.transport} />
                <ScoreBar label={NEEDS_SCORE_LABELS.stockage} value={r.needsPreview?.stockage} />
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  {r.logistics?.logisticsMode === "INTERNE" ? <Truck size={13} /> : <Warehouse size={13} />}
                  <span>
                    Logistique :{" "}
                    <Badge tone={LOGISTICS_TONE[r.logistics?.logisticsMode as LogisticsMode] ?? "neutral"}>
                      {LOGISTICS_MODE_LABELS[r.logistics?.logisticsMode as LogisticsMode] ?? "Inconnu"}
                    </Badge>
                    {r.logistics?.logisticsSubcontractorName && (
                      <span className="text-ink-faint"> — {r.logistics.logisticsSubcontractorName}</span>
                    )}
                  </span>
                </div>
                {r.source === "demo" && <Badge tone="neutral">Démo</Badge>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
