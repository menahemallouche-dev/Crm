"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Mail, Send } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", bodyHtml: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => (await apiClient.get("/campaigns")).data,
  });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post("/campaigns", form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setModalOpen(false);
      setForm({ name: "", subject: "", bodyHtml: "" });
    },
  });

  const send = useMutation({
    mutationFn: async (id: string) => (await apiClient.post(`/campaigns/${id}/send`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <div>
      <PageHeader
        title="Campagnes emailing"
        description="Templates, segmentation, programmation et statistiques d'ouverture/clic."
        actions={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nouvelle campagne
          </button>
        }
      />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="p-8">
            <EmptyState title="Aucune campagne" description="Créez votre première campagne emailing." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                <th className="px-4 py-3">Campagne</th>
                <th className="px-4 py-3">Destinataires</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Mail size={14} className="text-ink-faint" /> {c.name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{c._count?.recipients ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === "ENVOYEE" ? "success" : c.status === "PROGRAMMEE" ? "warning" : "neutral"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "BROUILLON" && (
                      <button className="btn-secondary !py-1.5" onClick={() => send.mutate(c.id)} disabled={send.isPending}>
                        <Send size={14} /> Envoyer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle campagne">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink">Nom</label>
            <input className="input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Objet de l'email</label>
            <input className="input mt-1" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Contenu (HTML, variables {"{{firstName}}"} {"{{companyName}}"})</label>
            <textarea
              className="input mt-1"
              rows={6}
              required
              value={form.bodyHtml}
              onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={create.isPending}>
            {create.isPending ? "Création…" : "Créer la campagne"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
