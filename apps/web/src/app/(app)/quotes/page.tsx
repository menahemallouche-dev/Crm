"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

const currency = (v?: number | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v) : "—";

const STATUS_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  BROUILLON: "neutral",
  ENVOYE: "brand",
  SIGNE: "success",
  REFUSE: "danger",
  EXPIRE: "warning",
};

export default function QuotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => (await apiClient.get("/quotes")).data,
  });

  return (
    <div>
      <PageHeader title="Devis" description="Versions, signature électronique et transformation automatique en client." />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucun devis" description="Créez un devis depuis la fiche d'une entreprise." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Montant TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Validité</th>
              </tr>
            </thead>
            <tbody>
              {data.map((q: any) => (
                <tr key={q.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <FileText size={14} className="text-ink-faint" /> {q.reference} <span className="text-ink-faint text-xs">v{q.version}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{q.company?.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{currency(q.amountTtc)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{q.validUntil ? new Date(q.validUntil).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
