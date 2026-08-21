"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Moon, Sun, Sparkles, LogOut, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setAiPanelOpen = useUiStore((s) => s.setAiPanelOpen);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => (await apiClient.get("/search", { params: { q: query } })).data,
    enabled: query.length >= 2,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await apiClient.get("/notifications")).data,
    refetchInterval: 60_000,
  });
  const unread = notifications?.filter((n: any) => !n.isRead)?.length ?? 0;

  return (
    <header className="h-16 border-b border-border-subtle bg-surface/80 backdrop-blur flex items-center gap-4 px-6 sticky top-0 z-30">
      <div className="relative flex-1 max-w-lg" ref={boxRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input pl-9"
          placeholder="Rechercher une entreprise, un contact, une opportunité…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {open && query.length >= 2 && data && (
          <div className="absolute mt-2 w-full card p-2 max-h-96 overflow-y-auto z-40 animate-fade-in">
            {data.companies?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-ink-faint px-2 py-1">Entreprises</p>
                {data.companies.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="block px-2 py-1.5 rounded-md text-sm hover:bg-canvas"
                    onClick={() => setOpen(false)}
                  >
                    {c.name} <span className="text-ink-faint">— {c.city}</span>
                  </Link>
                ))}
              </div>
            )}
            {data.contacts?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-ink-faint px-2 py-1">Contacts</p>
                {data.contacts.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="block px-2 py-1.5 rounded-md text-sm hover:bg-canvas"
                    onClick={() => setOpen(false)}
                  >
                    {c.firstName} {c.lastName} <span className="text-ink-faint">— {c.company?.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {data.deals?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-faint px-2 py-1">Opportunités</p>
                {data.deals.map((d: any) => (
                  <Link
                    key={d.id}
                    href={`/pipeline?dealId=${d.id}`}
                    className="block px-2 py-1.5 rounded-md text-sm hover:bg-canvas"
                    onClick={() => setOpen(false)}
                  >
                    {d.title} <span className="text-ink-faint">— {d.company?.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {!data.companies?.length && !data.contacts?.length && !data.deals?.length && (
              <p className="text-sm text-ink-faint px-2 py-2">Aucun résultat</p>
            )}
          </div>
        )}
      </div>

      <button onClick={() => setAiPanelOpen(true)} className="btn-secondary">
        <Sparkles size={16} /> Assistant IA
      </button>

      <button onClick={toggleTheme} className="btn-ghost !p-2" title="Changer de thème">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button className="btn-ghost !p-2 relative" title="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-danger" />
        )}
      </button>

      <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
        <Link href="/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Paramètres du compte">
          <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-semibold">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
          </div>
          <div className="hidden lg:block text-sm">
            <p className="font-medium text-ink leading-tight">{user ? `${user.firstName} ${user.lastName}` : "…"}</p>
            <p className="text-xs text-ink-faint leading-tight">{user?.role}</p>
          </div>
        </Link>
        <Link href="/settings" className="btn-ghost !p-2" title="Paramètres">
          <Settings size={16} />
        </Link>
        <button
          className="btn-ghost !p-2"
          title="Déconnexion"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
