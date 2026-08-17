"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const currency = (v?: number | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : "—";

export default function RealEstatePage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ type: "LOCATION", title: "", city: "", surfaceSqm: "", price: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["real-estate"],
    queryFn: async () => (await apiClient.get("/real-estate-opportunities")).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post("/real-estate-opportunities", {
          ...form,
          surfaceSqm: form.surfaceSqm ? Number(form.surfaceSqm) : undefined,
          price: form.price ? Number(form.price) : undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["real-estate"] });
      setModalOpen(false);
      setForm({ type: "LOCATION", title: "", city: "", surfaceSqm: "", price: "" });
    },
  });

  return (
    <div>
      <PageHeader
        title="Opportunités immobilières"
        description="Entrepôts et plateformes logistiques à louer ou à vendre, avec matching automatique des prospects intéressés."
        actions={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nouvelle opportunité
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState title="Aucune opportunité" description="Ajoutez un entrepôt ou une plateforme logistique disponible." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((o: any) => (
            <Card key={o.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <Warehouse size={18} />
                </div>
                <Badge tone={o.type === "VENTE" ? "warning" : "brand"}>{o.type}</Badge>
              </div>
              <p className="font-medium text-ink">{o.title}</p>
              <p className="text-sm text-ink-muted flex items-center gap-1 mt-1">
                <MapPin size={13} /> {o.city ?? "—"}
              </p>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-ink-muted">{o.surfaceSqm ? `${o.surfaceSqm} m²` : "—"}</span>
                <span className="font-medium text-ink">{currency(o.price)}</span>
              </div>
              {o.matchedCompanyIds?.length > 0 && (
                <p className="text-xs text-ink-faint mt-3 border-t border-border-subtle pt-2">
                  {o.matchedCompanyIds.length} prospect(s) potentiellement intéressé(s)
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle opportunité immobilière">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink">Type</label>
            <select className="input mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="LOCATION">Location</option>
              <option value="VENTE">Vente</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Titre</label>
            <input className="input mt-1" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Ville</label>
            <input className="input mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink">Surface (m²)</label>
              <input
                type="number"
                className="input mt-1"
                value={form.surfaceSqm}
                onChange={(e) => setForm({ ...form, surfaceSqm: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Prix (€)</label>
              <input type="number" className="input mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={create.isPending}>
            {create.isPending ? "Création…" : "Créer et matcher les prospects"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
