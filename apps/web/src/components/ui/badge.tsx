import { clsx } from "clsx";

const TONES = {
  brand: "bg-brand/10 text-brand",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-ink/5 text-ink-muted",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return <span className={clsx("badge", TONES[tone], className)}>{children}</span>;
}

const PRIORITY_TONE: Record<string, keyof typeof TONES> = {
  A_PLUS: "danger",
  A: "warning",
  B: "brand",
  C: "neutral",
  D: "neutral",
};

const PRIORITY_LABEL: Record<string, string> = {
  A_PLUS: "A+",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
};

export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return <Badge tone="neutral">—</Badge>;
  return <Badge tone={PRIORITY_TONE[priority] ?? "neutral"}>Priorité {PRIORITY_LABEL[priority] ?? priority}</Badge>;
}

const POTENTIAL_LABEL: Record<string, string> = {
  FAIBLE: "Faible",
  MOYEN: "Moyen",
  FORT: "Fort",
  TRES_FORT: "Très fort",
};
const POTENTIAL_TONE: Record<string, keyof typeof TONES> = {
  FAIBLE: "neutral",
  MOYEN: "brand",
  FORT: "warning",
  TRES_FORT: "danger",
};

export function PotentialBadge({ potential }: { potential?: string | null }) {
  if (!potential) return <Badge tone="neutral">—</Badge>;
  return <Badge tone={POTENTIAL_TONE[potential] ?? "neutral"}>{POTENTIAL_LABEL[potential] ?? potential}</Badge>;
}
