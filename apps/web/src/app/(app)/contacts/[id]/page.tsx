"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { CONTACT_DECISION_ROLE_LABELS, ContactDecisionRole } from "@gecodis/shared";
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

        <Card className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-ink mb-3">Activités récentes</h3>
          <div className="space-y-2">
            {contact.activities?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-border-subtle last:border-0 py-2">
                <span className="text-ink">{a.type} {a.subject && `— ${a.subject}`}</span>
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
