import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("card p-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  trend,
  tone = "brand",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: string;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const toneClasses: Record<string, string> = {
    brand: "bg-brand/10 text-brand",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className="card p-5 flex items-start justify-between animate-fade-in">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="text-2xl font-semibold text-ink mt-2">{value}</p>
        {trend && <p className="text-xs text-ink-muted mt-1">{trend}</p>}
      </div>
      {Icon && (
        <div className={clsx("rounded-xl p-2.5", toneClasses[tone])}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-border rounded-2xl">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse-soft rounded-lg bg-ink/5", className)} />;
}

export function ConfidenceMeter({ value }: { value?: number | null }) {
  if (value === undefined || value === null) return <span className="text-ink-faint text-xs">—</span>;
  const tone = value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-ink/10 overflow-hidden">
        <div className={clsx("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-ink-muted tabular-nums">{value}%</span>
    </div>
  );
}
