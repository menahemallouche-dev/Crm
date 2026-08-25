"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Linkedin, MailOpen, PhoneCall } from "lucide-react";
import { CONTACT_DECISION_ROLE_LABELS, ContactDecisionRole } from "@gecodis/shared";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card, Skeleton, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [decisionOnly, setDecisionOnly] = useState(false);
  const [view, setView] = useState<"tous" | "engages">("tous");

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search, decisionOnly],
    queryFn: async () =>
      (
        await apiClient.get("/contacts", {
          params: { search, pageSize: 50, sortBy: "aiDecisionPower", sortDir: "desc" },
        })
      ).data,
    enabled: view === "tous",
  });

  const { data: engaged, isLoading: isLoadingEngaged } = useQuery({
    queryKey: ["contacts-engaged"],
    queryFn: async () => (await apiClient.get("/contacts/engaged")).data as any[],
    enabled: view === "engages",
  });

  const rows = decisionOnly ? data?.data?.filter((c: any) => (c.aiDecisionPower ?? 0) >= 60) : data?.data;

  return (
    <div>
      <PageHeader title="Contacts" description="Classification IA automatique du rôle et du pouvoir de décision." />

      <div className="flex gap-1 border-b border-border-subtle mb-4">
        {(
          [
            ["tous", "Tous les contacts"],
            ["engages", "Contacts engagés (ouvrent les mailings)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              view === key ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "tous" ? (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex flex-wrap items-center gap-3">
            <input
              className="input max-w-sm"
              placeholder="Rechercher un contact…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={decisionOnly} onChange={(e) => setDecisionOnly(e.target.checked)} />
              Décisionnaires uniquement (≥60%)
            </label>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !rows?.length ? (
            <div className="p-8">
              <EmptyState title="Aucun contact" description="Ajoutez des contacts depuis une fiche entreprise." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Rôle IA</th>
                  <th className="px-4 py-3">Pouvoir de décision</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: any) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand">
                        <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs">
                          <Users size={14} />
                        </span>
                        {c.firstName} {c.lastName}
                        {c.linkedinUrl && <Linkedin size={13} className="text-ink-faint" />}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.company?.name}</td>
                    <td className="px-4 py-3">
                      {c.aiDecisionRole ? (
                        <Badge tone="brand">{CONTACT_DECISION_ROLE_LABELS[c.aiDecisionRole as ContactDecisionRole] ?? c.aiDecisionRole}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.aiDecisionPower != null ? `${c.aiDecisionPower}%` : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <p className="text-sm text-ink-muted flex items-center gap-2">
              <MailOpen size={15} className="text-brand" /> Ces contacts ouvrent les emails qu'on leur envoie — à
              appeler en priorité plutôt que de leur envoyer un email de plus.
            </p>
          </div>

          {isLoadingEngaged ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !engaged?.length ? (
            <div className="p-8">
              <EmptyState
                title="Aucun contact engagé pour l'instant"
                description="Dès qu'un contact ouvrira un email de campagne, il apparaîtra ici."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint uppercase border-b border-border-subtle">
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Emails envoyés</th>
                  <th className="px-4 py-3">Emails ouverts</th>
                  <th className="px-4 py-3">Taux d'ouverture</th>
                  <th className="px-4 py-3">Dernière ouverture</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {engaged.map((c: any) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand">
                        <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs">
                          <Users size={14} />
                        </span>
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.company?.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.mailingEngagement.sentCount}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.mailingEngagement.openedCount}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.mailingEngagement.openRate >= 50 ? "success" : "neutral"}>
                        {c.mailingEngagement.openRate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.mailingEngagement.lastOpenedAt ? new Date(c.mailingEngagement.lastOpenedAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.phone || c.mobilePhone ? (
                        <a href={`tel:${c.mobilePhone ?? c.phone}`} className="btn-ghost !p-1.5" title="Appeler">
                          <PhoneCall size={15} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
