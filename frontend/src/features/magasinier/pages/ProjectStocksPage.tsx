import { useDeferredValue, useState } from "react";
import { Boxes, Filter, PackageSearch, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/features/magasinier/components/KpiCard";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { ProjectSelector } from "@/features/magasinier/components/ProjectSelector";
import { ResponsiveDataTable } from "@/features/magasinier/components/ResponsiveDataTable";
import type { MagasinierWorkspaceModel } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { formatMoney, formatDateTime } from "@/features/magasinier/utils/format";

interface ProjectStocksPageProps {
  workspace: MagasinierWorkspaceModel;
}

export function ProjectStocksPage({ workspace }: ProjectStocksPageProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredItems = workspace.scopedItems.filter((item) => {
    const haystack = `${item.name} ${item.sku} ${item.category} ${item.locationLabel}`.toLowerCase();
    return haystack.includes(deferredSearch.trim().toLowerCase());
  });

  return (
    <div className="space-y-5">
      <ProjectSelector
        projects={workspace.workspace.projects}
        selectedProjectId={workspace.workspace.selectedProjectId}
        onSelect={workspace.actions.setSelectedProjectId}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Boxes}
          label="Articles autorises"
          value={String(workspace.projectSummary?.articleCount || 0)}
          helper="Catalogue limite au projet selectionne"
          tone="info"
        />
        <KpiCard
          icon={TriangleAlert}
          label="Demandes en attente"
          value={String(workspace.projectSummary?.pendingRequests || 0)}
          helper="Demandes liees au stock du projet"
          tone="warning"
        />
        <KpiCard
          icon={PackageSearch}
          label="Dernier mouvement"
          value={workspace.projectSummary?.latestMovementAt || "Aucun"}
          helper="Historique recent"
          tone="success"
        />
        <KpiCard
          icon={Filter}
          label="Valeur stock"
          value={workspace.projectSummary?.stockValue || formatMoney(0)}
          helper="Estimation du stock visible"
          tone="neutral"
        />
      </div>

      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Catalogue filtre"
          title={`Stock projet ${workspace.selectedProject?.name || ""}`}
          description="Categories, quantites, seuils critiques et historique de mise a jour uniquement pour ce projet."
        />
        <div className="relative">
          <PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un article, un SKU ou une categorie"
            className="pl-9"
          />
        </div>

        <ResponsiveDataTable
          rows={filteredItems}
          emptyText="Aucun article visible pour ce filtre."
          columns={[
            {
              key: "article",
              header: "Article",
              render: (item) => (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku}</p>
                </div>
              ),
            },
            {
              key: "categorie",
              header: "Categorie",
              render: (item) => <Badge variant="neutral">{item.category}</Badge>,
            },
            {
              key: "stock",
              header: "Quantite",
              render: (item) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{item.onHand} {item.unit}</p>
                  <p className="text-xs text-slate-500">Reserve {item.reserved}</p>
                </div>
              ),
            },
            {
              key: "seuil",
              header: "Seuil critique",
              render: (item) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{item.minThreshold}</p>
                  <p className="text-xs text-slate-500">Max {item.maxThreshold}</p>
                </div>
              ),
            },
            {
              key: "localisation",
              header: "Localisation",
              render: (item) => item.locationLabel,
            },
            {
              key: "historique",
              header: "Derniere MAJ",
              render: (item) => formatDateTime(item.updatedAt),
            },
          ]}
        />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Demandes liees au stock"
            title="Suivi des demandes projet"
            description="Besoins d'appro, urgence chantier et demandes preparees."
            action={<Badge variant="warning">{workspace.scopedRequests.length}</Badge>}
          />
          <div className="space-y-3">
            {workspace.scopedRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{request.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={request.priority === "urgent" ? "danger" : request.priority === "high" ? "warning" : "neutral"}>
                      {request.priority}
                    </Badge>
                    <Badge variant="info">{request.statusLabel}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {request.itemName} · {request.quantity}
                </p>
                <p className="mt-1 text-sm text-slate-500">{request.requesterName}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Historique court"
            title="Mouvements du projet"
            description="Vision compacte des dernieres operations de stock sur le projet selectionne."
          />
          <div className="space-y-3">
            {workspace.scopedMovements.slice(0, 6).map((movement) => (
              <div
                key={movement.id}
                className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={movement.kind === "entry" ? "success" : movement.kind === "exit" ? "warning" : "info"}>
                    {movement.kind}
                  </Badge>
                  <p className="text-sm text-slate-500">{formatDateTime(movement.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">{movement.note}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {movement.fromLabel} → {movement.toLabel}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
