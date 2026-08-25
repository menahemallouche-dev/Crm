"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, PhoneCall } from "lucide-react";
import { ACTIVITY_TYPE_LABELS, ActivityType, CONTACT_DECISION_ROLE_LABELS, ContactDecisionRole } from "@gecodis/shared";
import { apiClient } from "@/lib/api-client";
import { Card, PageHeader, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => (await apiClient.get(`/contacts/${id}`)).data,
  });

  if (isLoading || !contact) return <Skeleton className="h-48 w-full" />;

  return (
    <div>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={contact.jobTitle ?? "Poste non renseigné"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Entreprise</h3>
          <Link href={`/companies/${contact.company.id}`} className="flex items-center gap-2 text-brand font-medium">
            <Building2 size={16} /> {contact.company.name}
          </Link>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Classification IA</h3>
          <div className="space-y-2 text-sm">
            <p className="text-ink-muted">
              Rôle :{" "}
              <Badge tone="brand">
                {contact.aiDecisionRole
                  ? CONTACT_DECISION_ROLE_LABELS[contact.aiDecisionRole as ContactDecisionRole] ?? contact.aiDecisionRole
                  : "Non classé"}
              </Badge>
            </p>
            <p className="text-ink-muted">Pouvoir de décision : {contact.aiDecisionPower ?? "—"}%</p>
            <p className="text-ink-muted">Influence : {contact.influence}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Coordonnées</h3>
          <dl className="text-sm space-y-1.5 text-ink-muted">
            <p>Email : {contact.email ?? "—"}</p>
            <p>Téléphone : {contact.phone ?? "—"}</p>
            <p>Portable : {contact.mobilePhone ?? "—"}</p>
            <p>LinkedIn : {contact.linkedinUrl ? <a className="text-brand" href={contact.linkedinUrl} target="_blank" rel="noreferrer">Profil</a> : "—"}</p>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <Mail size={16} className="text-ink-faint" /> Engagement mailing
          </h3>
          {contact.mailingEngagement?.sentCount ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Emails envoyés</span>
                <span className="text-ink font-medium">{contact.mailingEngagement.sentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Emails ouverts</span>
                <span className="text-ink font-medium">{contact.mailingEngagement.openedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Taux d'ouverture</span>
                <Badge tone={contact.mailingEngagement.openRate >= 50 ? "success" : "neutral"}>
                  {contact.mailingEngagement.openRate}%
                </Badge>
              </div>
              {contact.mailingEngagement.lastOpenedAt && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Dernière ouverture</span>
                  <span className="text-ink font-medium">
                    {new Date(contact.mailingEngagement.lastOpenedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
              {contact.mailingEngagement.openRate >= 50 && (
                <p className="text-xs text-brand flex items-center gap-1.5 mt-3 bg-brand/5 rounded-lg px-2.5 py-2">
                  <PhoneCall size={13} /> Ce contact lit ses emails — un appel a de bonnes chances d'aboutir.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Aucune campagne email envoyée à ce contact pour l'instant.</p>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-ink mb-3">Activités récentes</h3>
          <div className="space-y-2">
            {contact.activities?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-border-subtle last:border-0 py-2">
                <span className="text-ink flex items-center gap-2">
                  <Badge tone="brand">{ACTIVITY_TYPE_LABELS[a.type as ActivityType] ?? a.type}</Badge>
                  {a.subject && <span>{a.subject}</span>}
                </span>
                <span className="text-ink-faint text-xs">{new Date(a.occurredAt).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
            {!contact.activities?.length && <p className="text-sm text-ink-faint">Aucune activité enregistrée.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
