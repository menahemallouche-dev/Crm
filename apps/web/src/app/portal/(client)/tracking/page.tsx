"use client";

import { useQuery } from "@tanstack/react-query";
import { portalApiClient } from "@/lib/portal-api-client";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

// Client-friendly wording — deliberately distinct from the internal sales-pipeline
// labels (PIPELINE_STAGE_LABELS), which use sales-team jargon ("Prospect froid"…)
// that wouldn't make sense shown back to the client about their own request.
const CLIENT_STAGE_LABELS: Record<string, string> = {
  PROSPECT_FROID: "Demande enregistrée",
  PREMIER_APPEL: "Prise de contact",
  RELANCE_1: "En cours d'échange",
  RELANCE_2: "En cours d'échange",
  RDV: "Rendez-vous planifié",
  DEVIS: "Devis en préparation",
  NEGOCIATION: "Devis en discussion",
  GAGNE: "Confirmé",
  PERDU: "Clôturé",
};

export default function PortalTrackingPage() {
  const { data, isLoading } = useQuery({ queryKey: ["portal-tracking"], queryFn: async () => (await portalApiClient.get("/tracking")).data });

  return (
    <div>
      <PageHeader title="Suivi de mes dossiers" description="État d'avancement de vos demandes auprès de Gecodis." />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState title="Aucun dossier en cours" description="Vos demandes en cours apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {data.map((d: any) => (
            <Card key={d.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{d.title}</p>
                {d.nextActionDate && (
                  <p className="text-xs text-ink-faint mt-1">
                    Prochaine étape prévue le {new Date(d.nextActionDate).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
              <Badge tone="brand">{CLIENT_STAGE_LABELS[d.stage] ?? d.stage}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
