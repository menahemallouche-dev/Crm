"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Link2, Unlink } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card } from "@/components/ui/misc";
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
    </div>
  );
}
