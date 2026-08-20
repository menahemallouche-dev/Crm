"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Sparkles, Truck } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("demo@gecodis.fr");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    axios
      .get("/api/auth/providers")
      .then((res) => setGoogleEnabled(res.data.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

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

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="text-xs text-ink-faint">ou</span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              <a href="/api/auth/google" className="btn-secondary w-full">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M23.5 12.3c0-.85-.08-1.66-.22-2.44H12v4.62h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1C3.24 21.3 7.28 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.3v-3.1H1.26A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.26 5.4l4.01-3.1z" />
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.6l4.01 3.1c.95-2.85 3.6-4.95 6.73-4.95z" />
                </svg>
                Continuer avec Google
              </a>
            </>
          )}

          <p className="text-xs text-ink-faint mt-4 text-center">
            Démo : demo@gecodis.fr / Demo1234! (voir prisma/seed.ts)
          </p>
        </form>
      </div>
    </div>
  );
}
