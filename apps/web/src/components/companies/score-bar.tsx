import { clsx } from "clsx";

export function ScoreBar({ label, value }: { label: string; value?: number | null }) {
  const v = value ?? 0;
  const tone = v >= 70 ? "bg-brand" : v >= 40 ? "bg-warning" : "bg-ink/20";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium text-ink tabular-nums">{v}/100</span>
      </div>
      <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", tone)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
