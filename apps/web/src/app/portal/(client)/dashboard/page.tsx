"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSignature, FileText, Receipt, Workflow } from "lucide-react";
import { portalApiClient } from "@/lib/portal-api-client";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { usePortalAuthStore } from "@/store/portal-auth-store";

export default function PortalDashboardPage() {
  const company = usePortalAuthStore((s) => s.company);

  const { data: quotes } = useQuery({ queryKey: ["portal-quotes"], queryFn: async () => (await portalApiClient.get("/quotes")).data });
  const { data: invoices } = useQuery({ queryKey: ["portal-invoices"], queryFn: async () => (await portalApiClient.get("/invoices")).data });
  const { data: contracts } = useQuery({ queryKey: ["portal-contracts"], queryFn: async () => (await portalApiClient.get("/contracts")).data });
  const { data: tracking } = useQuery({ queryKey: ["portal-tracking"], queryFn: async () => (await portalApiClient.get("/tracking")).data });

  return (
    <div>
      <PageHeader title={`Bienvenue, ${company?.name ?? ""}`} description="Retrouvez ici vos devis, factures et contrats Gecodis." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Devis" value={String(quotes?.length ?? "—")} icon={FileText} tone="brand" />
        <StatTile label="Factures" value={String(invoices?.length ?? "—")} icon={Receipt} tone="brand" />
        <StatTile label="Contrats actifs" value={String(contracts?.length ?? "—")} icon={FileSignature} tone="success" />
        <StatTile label="Dossiers en cours" value={String(tracking?.length ?? "—")} icon={Workflow} tone="warning" />
      </div>
    </div>
  );
}
