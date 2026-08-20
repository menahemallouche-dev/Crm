"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, PenLine } from "lucide-react";
import { portalApiClient } from "@/lib/portal-api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { downloadBlob } from "@/lib/download";

const currency = (v?: number | null) => (v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v) : "—");

const STATUS_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  BROUILLON: "neutral",
  ENVOYE: "brand",
  SIGNE: "success",
  REFUSE: "danger",
  EXPIRE: "warning",
};

export default function PortalQuotesPage() {
  const queryClient = useQueryClient();
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signedByName, setSignedByName] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["portal-quotes"], queryFn: async () => (await portalApiClient.get("/quotes")).data });

  const sign = useMutation({
    mutationFn: async () => (await portalApiClient.post(`/quotes/${signingId}/sign`, { signedByName })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-quotes"] });
      setSigningId(null);
      setSignedByName("");
    },
  });

  async function downloadPdf(id: string, reference: string) {
    const res = await portalApiClient.get(`/quotes/${id}/pdf`, { responseType: "blob" });
    downloadBlob(res.data, `${reference}.pdf`);
  }

  return (
    <div>
      <PageHeader title="Mes devis" description="Consultez et signez électroniquement vos devis Gecodis." />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucun devis" description="Vos devis apparaîtront ici dès qu'ils seront émis." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Montant TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((q: any) => (
                <tr key={q.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <FileText size={14} className="text-ink-faint" /> {q.reference}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{currency(q.amountTtc)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {q.status === "ENVOYE" && (
                      <button className="btn-secondary !py-1.5" onClick={() => setSigningId(q.id)}>
                        <PenLine size={14} /> Signer
                      </button>
                    )}
                    <button className="btn-ghost !py-1.5" onClick={() => downloadPdf(q.id, q.reference)}>
                      <Download size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!signingId} onClose={() => setSigningId(null)} title="Signature électronique du devis">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sign.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink">Votre nom complet</label>
            <input className="input mt-1" required value={signedByName} onChange={(e) => setSignedByName(e.target.value)} />
          </div>
          <p className="text-xs text-ink-faint">
            En signant, vous acceptez les termes de ce devis. Cette signature électronique vaut acceptation ferme.
          </p>
          <button type="submit" className="btn-primary w-full" disabled={sign.isPending}>
            {sign.isPending ? "Signature…" : "Signer le devis"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
