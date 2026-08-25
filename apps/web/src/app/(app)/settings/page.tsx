"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, DatabaseBackup, Download, History, KeyRound, Link2, RotateCcw, Unlink } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { downloadBlob } from "@/lib/download";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => (await apiClient.get("/auth/me")).data,
  });

  const { data: providers } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: async () => (await apiClient.get("/auth/providers")).data,
  });

  // Keep the persisted session's googleLinked flag in sync once /auth/me confirms a link.
  useEffect(() => {
    if (me && accessToken && refreshToken) {
      setSession({ accessToken, refreshToken, user: me });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const link = useMutation({
    mutationFn: async () => (await apiClient.post("/auth/google/link-ticket")).data as { ticket: string },
    onSuccess: (data) => {
      window.location.href = `/api/auth/google?linkTicket=${encodeURIComponent(data.ticket)}`;
    },
  });

  const unlink = useMutation({
    mutationFn: async () => (await apiClient.post("/auth/google/unlink")).data,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
  });

  return (
    <div>
      <PageHeader title="Paramètres du compte" description="Vos informations et vos méthodes de connexion." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <KeyRound size={16} className="text-ink-faint" /> Profil
          </h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-ink-faint">Nom</dt>
              <dd className="text-ink font-medium">
                {me?.firstName} {me?.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Email</dt>
              <dd className="text-ink font-medium">{me?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Rôle</dt>
              <dd className="text-ink font-medium">{me?.role}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Connexion avec Google</h3>

          {error && <p className="text-sm text-danger mb-3">{error}</p>}

          {!providers?.googleEnabled ? (
            <p className="text-sm text-ink-faint">La connexion Google n'est pas configurée sur ce CRM.</p>
          ) : me?.googleLinked ? (
            <div>
              <p className="text-sm text-ink-muted flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-success" /> Votre compte Google est lié — vous pouvez l'utiliser pour vous connecter.
              </p>
              <button className="btn-secondary" onClick={() => unlink.mutate()} disabled={unlink.isPending}>
                <Unlink size={16} /> {unlink.isPending ? "Dissociation…" : "Délier mon compte Google"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-muted mb-4">
                Liez votre compte Google pour vous connecter sans mot de passe, en plus de votre accès actuel.
              </p>
              <button className="btn-primary" onClick={() => link.mutate()} disabled={link.isPending}>
                <Link2 size={16} /> {link.isPending ? "Redirection…" : "Lier mon compte Google"}
              </button>
            </div>
          )}
        </Card>
      </div>

      {me?.role === "ADMIN" && (
        <div className="max-w-3xl mt-4">
          <BackupsCard />
        </div>
      )}
    </div>
  );
}

const BACKUP_TYPE_LABEL: Record<string, string> = {
  WEEKLY: "Hebdomadaire (auto)",
  MANUAL: "Manuelle",
  PRE_MIGRATION: "Pré-migration (auto)",
};

const BACKUP_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  FAILED: "danger",
};

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function BackupsCard() {
  const queryClient = useQueryClient();
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; label: string } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  const { data: backups, isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => (await apiClient.get("/backups")).data as any[],
  });

  const trigger = useMutation({
    mutationFn: async () => (await apiClient.post("/backups/trigger")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => (await apiClient.post(`/backups/${id}/restore`, { confirm: true })).data,
    onSuccess: (data) => {
      setRestoreTarget(null);
      setRestoreError(null);
      setRestoreResult(`Restauration terminée : ${data.restoredRows} enregistrement(s) sur ${data.restoredModels} table(s).`);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setRestoreError(err?.response?.data?.message ?? "La restauration a échoué.");
    },
  });

  async function download(id: string, type: string) {
    const res = await apiClient.get(`/backups/${id}/download`, { responseType: "blob" });
    downloadBlob(res.data, `gecodis-backup-${type.toLowerCase()}-${id}.json.gz`);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
          <DatabaseBackup size={16} className="text-ink-faint" /> Sauvegardes
        </h3>
        <button className="btn-secondary" onClick={() => trigger.mutate()} disabled={trigger.isPending}>
          <History size={16} /> {trigger.isPending ? "Sauvegarde en cours…" : "Sauvegarder maintenant"}
        </button>
      </div>
      <p className="text-sm text-ink-muted mb-4">
        Une sauvegarde complète est prise automatiquement chaque dimanche à 3h, et juste avant toute mise à jour
        structurelle de la base (pré-migration) — de quoi toujours pouvoir revenir en arrière en cas de souci.
      </p>

      {restoreResult && <p className="text-sm text-success mb-3">{restoreResult}</p>}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !backups || backups.length === 0 ? (
        <EmptyState title="Aucune sauvegarde pour l'instant" description="Déclenchez-en une manuellement, ou attendez dimanche prochain." />
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint text-xs uppercase tracking-wide border-b border-border">
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Statut</th>
                <th className="px-5 py-2 font-medium">Date</th>
                <th className="px-5 py-2 font-medium">Taille</th>
                <th className="px-5 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-2.5">
                    <div className="text-ink font-medium">{BACKUP_TYPE_LABEL[b.type] ?? b.type}</div>
                    {b.relatedMigration && <div className="text-xs text-ink-faint">{b.relatedMigration}</div>}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge tone={BACKUP_STATUS_TONE[b.status] ?? "neutral"}>{b.status}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{new Date(b.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{formatBytes(b.sizeBytes)}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {b.status === "COMPLETED" && (
                        <>
                          <button className="btn-ghost !p-1.5" title="Télécharger" onClick={() => download(b.id, b.type)}>
                            <Download size={15} />
                          </button>
                          <button
                            className="btn-ghost !p-1.5 text-danger"
                            title="Restaurer cette sauvegarde"
                            onClick={() => {
                              setRestoreError(null);
                              setRestoreTarget({ id: b.id, label: `${BACKUP_TYPE_LABEL[b.type] ?? b.type} — ${new Date(b.createdAt).toLocaleString("fr-FR")}` });
                            }}
                          >
                            <RotateCcw size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!restoreTarget} onClose={() => setRestoreTarget(null)} title="Restaurer cette sauvegarde ?">
        <p className="text-sm text-ink-muted mb-2">
          Vous êtes sur le point de restaurer : <span className="font-medium text-ink">{restoreTarget?.label}</span>
        </p>
        <p className="text-sm text-danger mb-4">
          ⚠️ Cette action remplace TOUTES les données actuelles de la base par celles de cette sauvegarde. Elle est
          irréversible (sauf à restaurer une sauvegarde plus récente ensuite). À réserver aux cas où une mise à jour
          a introduit un problème structurel.
        </p>
        {restoreError && <p className="text-sm text-danger mb-3">{restoreError}</p>}
        <div className="flex items-center justify-end gap-2">
          <button className="btn-secondary" onClick={() => setRestoreTarget(null)}>
            Annuler
          </button>
          <button
            className="btn-primary !bg-danger hover:!bg-danger/90"
            disabled={restore.isPending}
            onClick={() => restoreTarget && restore.mutate(restoreTarget.id)}
          >
            {restore.isPending ? "Restauration…" : "Confirmer la restauration"}
          </button>
        </div>
      </Modal>
    </Card>
  );
}
