"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { portalApiClient } from "@/lib/portal-api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

const currency = (v?: number | null) => (v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : "—");

const STATUS_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  BROUILLON: "neutral",
  ACTIF: "success",
  EXPIRE: "warning",
  RESILIE: "danger",
};

export default function PortalContractsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["portal-contracts"], queryFn: async () => (await portalApiClient.get("/contracts")).data });

  return (
    <div>
      <PageHeader title="Mes contrats" description="Contrats en cours et échéances." />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucun contrat" description="Vos contrats apparaîtront ici." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Contrat</th>
                <th className="px-4 py-3">Valeur annuelle</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <FileSignature size={14} className="text-ink-faint" /> {c.reference} — {c.title}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{currency(c.annualValue)}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.endDate ? new Date(c.endDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
