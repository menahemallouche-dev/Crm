"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Upload } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

const currency = (v?: number | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v) : "—";

const STATUS_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  EN_ATTENTE: "warning",
  PAYEE: "success",
  EN_RETARD: "danger",
  ANNULEE: "neutral",
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await apiClient.get("/invoices")).data,
  });

  const importPdf = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", data?.[0]?.companyId ?? "");
      return (await apiClient.post("/invoices/import-pdf", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  return (
    <div>
      <PageHeader
        title="Factures"
        description="Import PDF avec extraction automatique du montant HT / TVA / TTC."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importPdf.mutate(e.target.files[0])}
            />
            <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={importPdf.isPending}>
              <Upload size={16} /> {importPdf.isPending ? "Import…" : "Importer un PDF"}
            </button>
          </>
        }
      />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucune facture" description="Importez un PDF ou créez une facture depuis une fiche entreprise." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Montant TTC</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Receipt size={14} className="text-ink-faint" /> {inv.reference}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{inv.company?.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{currency(inv.amountTtc)}</td>
                  <td className="px-4 py-3 text-ink-muted">{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Badge>
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
