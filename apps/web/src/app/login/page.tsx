"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Sparkles, Truck } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("demo@gecodis.fr");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      if (res.data.mfaRequired) {
        setError("Code MFA requis (non géré par cette démo).");
        return;
      }
      setSession(res.data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-brand to-indigo-900 text-white p-12">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Truck size={22} /> Gecodis CRM
        </div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight max-w-md">
            Le CRM nouvelle génération pour la logistique &amp; le transport B2B.
          </h1>
          <p className="mt-4 text-white/80 max-w-md">
            Enrichissement automatique, scoring IA, pipeline commercial, rentabilité client — tout votre commerce piloté depuis un seul endroit.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Sparkles size={16} /> IA commerciale intégrée sur toutes les pages
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-canvas">
        <form onSubmit={onSubmit} className="w-full max-w-sm card p-8 animate-fade-in">
          <h2 className="text-xl font-semibold text-ink">Connexion</h2>
          <p className="text-sm text-ink-muted mt-1 mb-6">Accédez à votre espace commercial.</p>

          <label className="text-sm font-medium text-ink">Email</label>
          <input className="input mt-1 mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label className="text-sm font-medium text-ink">Mot de passe</label>
          <input
            className="input mt-1 mb-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-danger mt-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <p className="text-xs text-ink-faint mt-4 text-center">
            Démo : demo@gecodis.fr / Demo1234! (voir prisma/seed.ts)
          </p>
        </form>
      </div>
    </div>
  );
}
