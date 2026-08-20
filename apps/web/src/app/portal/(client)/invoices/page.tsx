"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Receipt } from "lucide-react";
import { portalApiClient } from "@/lib/portal-api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { downloadBlob } from "@/lib/download";

const currency = (v?: number | null) => (v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v) : "—");

const STATUS_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  EN_ATTENTE: "warning",
  PAYEE: "success",
  EN_RETARD: "danger",
  ANNULEE: "neutral",
};

export default function PortalInvoicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["portal-invoices"], queryFn: async () => (await portalApiClient.get("/invoices")).data });

  async function downloadPdf(id: string, reference: string) {
    const res = await portalApiClient.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    downloadBlob(res.data, `${reference}.pdf`);
  }

  return (
    <div>
      <PageHeader title="Mes factures" description="Historique de facturation et téléchargement PDF." />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucune facture" description="Vos factures apparaîtront ici dès qu'elles seront émises." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Montant TTC</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Receipt size={14} className="text-ink-faint" /> {inv.reference}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{currency(inv.amountTtc)}</td>
                  <td className="px-4 py-3 text-ink-muted">{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost !py-1.5" onClick={() => downloadPdf(inv.id, inv.reference)}>
                      <Download size={14} /> PDF
                    </button>
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
