"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

const currency = (v?: number | null) =>
  v || v === 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : "—";

const TABS = [
  { key: "top-ca", label: "Top CA" },
  { key: "top-margin", label: "Top marge" },
  { key: "top-loss", label: "Top perte" },
] as const;

export default function ProfitabilityPage() {
  const [type, setType] = useState<(typeof TABS)[number]["key"]>("top-ca");
  const { data, isLoading } = useQuery({
    queryKey: ["profitability-rankings", type],
    queryFn: async () => (await apiClient.get("/profitability/rankings", { params: { type, limit: 100 } })).data,
  });

  return (
    <div>
      <PageHeader title="Rentabilité client" description="CA, coûts logistiques, marge et classement automatique — Top 100 clients." />

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={type === t.key ? "btn-primary" : "btn-secondary"}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucune donnée de rentabilité" description="Ajoutez des factures et des coûts pour générer le classement." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">CA</th>
                <th className="px-4 py-3">Marge</th>
                <th className="px-4 py-3">Marge %</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any, i: number) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 text-ink-faint">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/companies/${r.company.id}`} className="font-medium text-ink hover:text-brand">
                      {r.company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{currency(r.revenue)}</td>
                  <td className="px-4 py-3 text-ink-muted">{currency(r.marginAmount)}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.marginPercent.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={r.rating === "EXCELLENT" ? "success" : r.rating === "BON" ? "brand" : r.rating === "FAIBLE" ? "warning" : "danger"}
                    >
                      {r.rating ?? "—"}
                    </Badge>
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
