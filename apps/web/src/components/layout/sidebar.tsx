"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Building2,
  LayoutDashboard,
  Users,
  KanbanSquare,
  FileText,
  Receipt,
  TrendingUp,
  Mail,
  Warehouse,
  FileSignature,
  Sparkles,
  Truck,
  Radar,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/prospecting", label: "Chasse commerciale", icon: Radar },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/quotes", label: "Devis", icon: FileText },
  { href: "/invoices", label: "Factures", icon: Receipt },
  { href: "/profitability", label: "Rentabilité", icon: TrendingUp },
  { href: "/campaigns", label: "Campagnes", icon: Mail },
  { href: "/real-estate", label: "Immobilier", icon: Warehouse },
  { href: "/contracts", label: "Contrats", icon: FileSignature },
  { href: "/assistant", label: "Assistant IA", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  return (
    <aside
      className={clsx(
        "hidden md:flex flex-col shrink-0 border-r border-border-subtle bg-surface transition-all duration-200",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="h-16 flex items-center gap-2 px-4 border-b border-border-subtle">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-brand-foreground shrink-0">
          <Truck size={18} />
        </div>
        {!collapsed && <span className="font-semibold text-ink tracking-tight">Gecodis CRM</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-4 py-3 text-xs text-ink-faint hover:text-ink border-t border-border-subtle"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && "Réduire"}
      </button>
    </aside>
  );
}
