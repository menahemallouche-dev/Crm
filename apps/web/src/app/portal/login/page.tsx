"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { portalApiClient } from "@/lib/portal-api-client";
import { usePortalAuthStore } from "@/store/portal-auth-store";

export default function PortalLoginPage() {
  const router = useRouter();
  const setSession = usePortalAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await portalApiClient.post("/auth/login", { email, password });
      setSession({ accessToken: res.data.accessToken, company: res.data.company, email: res.data.user.email });
      router.push("/portal/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-8">
      <form onSubmit={onSubmit} className="w-full max-w-sm card p-8 animate-fade-in">
        <div className="flex items-center gap-2 font-semibold text-lg text-ink mb-1">
          <Truck size={20} className="text-brand" /> Espace client Gecodis
        </div>
        <p className="text-sm text-ink-muted mb-6">Consultez vos devis, factures et contrats.</p>

        <label className="text-sm font-medium text-ink">Email</label>
        <input className="input mt-1 mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="text-sm font-medium text-ink">Mot de passe</label>
        <input className="input mt-1 mb-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="text-sm text-danger mt-2">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        <p className="text-xs text-ink-faint mt-4 text-center">
          Accès fourni par votre interlocuteur commercial Gecodis.
        </p>
      </form>
    </div>
  );
}
