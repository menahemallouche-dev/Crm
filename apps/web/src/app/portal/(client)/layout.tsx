"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { FileSignature, FileText, LayoutDashboard, LogOut, Receipt, Truck, Workflow } from "lucide-react";
import { usePortalAuthStore } from "@/store/portal-auth-store";

const NAV = [
  { href: "/portal/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/portal/quotes", label: "Mes devis", icon: FileText },
  { href: "/portal/invoices", label: "Mes factures", icon: Receipt },
  { href: "/portal/contracts", label: "Mes contrats", icon: FileSignature },
  { href: "/portal/tracking", label: "Suivi", icon: Workflow },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = usePortalAuthStore((s) => s.accessToken);
  const company = usePortalAuthStore((s) => s.company);
  const logout = usePortalAuthStore((s) => s.logout);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/portal/login");
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-muted text-sm">Chargement…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border-subtle bg-surface">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-border-subtle">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shrink-0">
            <Truck size={18} />
          </div>
          <span className="font-semibold text-ink tracking-tight truncate">{company?.name ?? "Espace client"}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            logout();
            router.push("/portal/login");
          }}
          className="flex items-center gap-2 px-4 py-3 text-sm text-ink-faint hover:text-ink border-t border-border-subtle"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
