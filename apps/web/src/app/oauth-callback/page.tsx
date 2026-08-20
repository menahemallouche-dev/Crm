"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    if (!accessToken || !refreshToken) {
      router.replace("/login?error=Connexion Google échouée");
      return;
    }
    setSession({ accessToken, refreshToken });
    apiClient
      .get("/auth/me")
      .then((res) => {
        setSession({ accessToken, refreshToken, user: res.data });
        router.replace("/dashboard");
      })
      .catch(() => router.replace("/login?error=Connexion Google échouée"));
  }, [searchParams, setSession, router]);

  return <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-muted text-sm">Connexion en cours…</div>;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
