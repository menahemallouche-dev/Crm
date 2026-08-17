"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Euro, TrendingUp, Target, Percent } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { PageHeader, StatTile, Card } from "@/components/ui/misc";

const currency = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await apiClient.get("/dashboard/stats")).data,
  });

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de votre activité commerciale et logistique." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatTile label="Prospects" value={String(data?.prospectsCount ?? "—")} icon={Users} tone="brand" />
        <StatTile label="Clients" value={String(data?.clientsCount ?? "—")} icon={Building2} tone="success" />
        <StatTile label="CA cumulé" value={currency(data?.totalRevenue ?? 0)} icon={Euro} tone="brand" />
        <StatTile label="Marge cumulée" value={currency(data?.totalMargin ?? 0)} icon={TrendingUp} tone="success" />
        <StatTile label="Taux de conversion" value={`${data?.conversionRate ?? 0}%`} icon={Percent} tone="warning" />
        <StatTile label="CA prévisionnel" value={currency(data?.forecastRevenue ?? 0)} icon={Target} tone="brand" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-ink mb-4">Pipeline commercial</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.pipelineByStage ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--ink-faint))" }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--ink-faint))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => (name === "value" ? currency(value) : value)}
              />
              <Bar dataKey="count" name="Opportunités" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4">Top commerciaux</h3>
          <div className="space-y-3">
            {(data?.topSalesReps ?? []).map((rep: any, i: number) => (
              <div key={rep.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span className="text-ink">{rep.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-ink font-medium">{currency(rep.revenue)}</p>
                  <p className="text-xs text-ink-faint">{rep.won} gagné(s)</p>
                </div>
              </div>
            ))}
            {!isLoading && !(data?.topSalesReps ?? []).length && (
              <p className="text-sm text-ink-faint">Aucune donnée pour le moment.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-ink mb-4">Activité quotidienne (14 derniers jours)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data?.dailyActivity ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--ink-faint))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--ink-faint))" }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="calls" name="Appels" stroke="hsl(var(--brand))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="emails" name="Emails" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="meetings" name="RDV/Visites" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
