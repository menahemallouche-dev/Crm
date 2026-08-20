"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Download, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { PriorityBadge, PotentialBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { downloadBlob } from "@/lib/download";

const currency = (v?: number | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : "—";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", siren: "", city: "", activity: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search, page],
    queryFn: async () => (await apiClient.get("/companies", { params: { search, page, pageSize: 20 } })).data,
  });

  const createCompany = useMutation({
    mutationFn: async () => (await apiClient.post("/companies", form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setModalOpen(false);
      setForm({ name: "", siren: "", city: "", activity: "" });
    },
  });

  async function exportCsv() {
    const res = await apiClient.post("/import-export/companies/export", {}, { responseType: "blob" });
    downloadBlob(res.data, "entreprises-gecodis.csv");
  }

  async function exportPdf() {
    const res = await apiClient.post("/import-export/companies/export-pdf", {}, { responseType: "blob" });
    downloadBlob(res.data, "entreprises-gecodis.pdf");
  }

  return (
    <div>
      <PageHeader
        title="Entreprises"
        description="Fiches entreprises enrichies automatiquement et scorées par l'IA."
        actions={
          <>
            <button className="btn-secondary" onClick={exportCsv}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-secondary" onClick={exportPdf}>
              <FileText size={16} /> PDF
            </button>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Nouvelle entreprise
            </button>
          </>
        }
      />

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <input
            className="input max-w-sm"
            placeholder="Rechercher par nom, ville, SIREN, NAF…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="p-8">
            <EmptyState
              title="Aucune entreprise"
              description="Créez votre première fiche entreprise, elle sera enrichie et scorée automatiquement."
              action={
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus size={16} /> Nouvelle entreprise
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-border-subtle">
                  <th className="px-4 py-3 font-medium">Entreprise</th>
                  <th className="px-4 py-3 font-medium">Ville</th>
                  <th className="px-4 py-3 font-medium">NAF</th>
                  <th className="px-4 py-3 font-medium">Effectif</th>
                  <th className="px-4 py-3 font-medium">CA</th>
                  <th className="px-4 py-3 font-medium">Potentiel</th>
                  <th className="px-4 py-3 font-medium">Priorité</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c: any) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${c.id}`} className="flex items-center gap-3 font-medium text-ink hover:text-brand">
                        <span className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </span>
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.city ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.nafCode ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.employeeCount ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{currency(c.revenue)}</td>
                    <td className="px-4 py-3">
                      <PotentialBadge potential={c.potential} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={c.commercialPriority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle text-sm text-ink-muted">
            <span>
              Page {data.page} / {data.totalPages} — {data.total} entreprises
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </button>
              <button className="btn-secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle entreprise">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCompany.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink">Nom *</label>
            <input
              className="input mt-1"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">SIREN</label>
            <input
              className="input mt-1"
              value={form.siren}
              onChange={(e) => setForm({ ...form, siren: e.target.value })}
              placeholder="9 chiffres — utilisé pour l'enrichissement automatique"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Ville</label>
            <input className="input mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Activité</label>
            <input
              className="input mt-1"
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              placeholder="ex: e-commerce, entrepôt frigorifique…"
            />
          </div>
          <p className="text-xs text-ink-faint">
            Après création, le CRM lance automatiquement l'enrichissement (INSEE, Pappers, Google…) et le scoring IA.
          </p>
          <button type="submit" className="btn-primary w-full" disabled={createCompany.isPending}>
            {createCompany.isPending ? "Création…" : "Créer et enrichir"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
