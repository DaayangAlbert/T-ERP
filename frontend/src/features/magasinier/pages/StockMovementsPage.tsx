import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, PackagePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/features/magasinier/components/KpiCard";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { ResponsiveDataTable } from "@/features/magasinier/components/ResponsiveDataTable";
import type { MagasinierWorkspaceModel } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import type { MovementDraftInput, MovementKind } from "@/features/magasinier/types";
import { formatDateTime } from "@/features/magasinier/utils/format";

interface StockMovementsPageProps {
  workspace: MagasinierWorkspaceModel;
}

const movementOptions: Array<{ value: MovementKind; label: string }> = [
  { value: "entry", label: "Entree" },
  { value: "exit", label: "Sortie" },
  { value: "transfer", label: "Transfert" },
];

export function StockMovementsPage({ workspace }: StockMovementsPageProps) {
  const [draft, setDraft] = useState<MovementDraftInput>({
    projectId: workspace.selectedProject?.id || workspace.workspace.selectedProjectId,
    itemId: workspace.scopedItems[0]?.id || "",
    kind: "entry",
    quantity: 1,
    note: "",
    fromLabel: "",
    toLabel: "",
  });

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      projectId: workspace.selectedProject?.id || current.projectId,
      itemId: workspace.scopedItems[0]?.id || current.itemId,
    }));
  }, [workspace.selectedProject?.id, workspace.scopedItems]);

  const availableItems = workspace.workspace.items.filter((item) => item.projectId === draft.projectId);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ArrowUpCircle}
          label="Entrees recentes"
          value={String(workspace.workspace.movements.filter((movement) => movement.kind === "entry").length)}
          helper="Receptions et renforts stock"
          tone="success"
        />
        <KpiCard
          icon={ArrowDownCircle}
          label="Sorties recentes"
          value={String(workspace.workspace.movements.filter((movement) => movement.kind === "exit").length)}
          helper="Mises a disposition chantier"
          tone="warning"
        />
        <KpiCard
          icon={ArrowLeftRight}
          label="Transferts"
          value={String(workspace.workspace.movements.filter((movement) => movement.kind === "transfer").length)}
          helper="Mouvements inter-projets autorises"
          tone="info"
        />
        <KpiCard
          icon={PackagePlus}
          label="Articles actifs"
          value={String(workspace.workspace.items.length)}
          helper="Catalogue charge dans votre scope"
          tone="neutral"
        />
      </div>

      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Saisie rapide"
          title="Enregistrer un mouvement"
          description="Entrees, sorties et transferts sur les seuls projets autorises pour le magasinier."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projet</span>
            <select
              value={draft.projectId}
              onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {workspace.workspace.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</span>
            <select
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as MovementKind }))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {movementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Article</span>
            <select
              value={draft.itemId}
              onChange={(event) => setDraft((current) => ({ ...current, itemId: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value || 1) }))}
            placeholder="Quantite"
          />
          <Input
            value={draft.fromLabel}
            onChange={(event) => setDraft((current) => ({ ...current, fromLabel: event.target.value }))}
            placeholder="Source / provenance"
          />
          <Input
            value={draft.toLabel}
            onChange={(event) => setDraft((current) => ({ ...current, toLabel: event.target.value }))}
            placeholder={draft.kind === "transfer" ? "Projet ou zone destination" : "Destination / zone"}
          />
        </div>

        <Textarea
          rows={3}
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="Notes operateur, reference BL, motif ou zone chantier..."
        />

        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            onClick={() => {
              workspace.actions.createMovement(draft);
              setDraft((current) => ({ ...current, quantity: 1, note: "", fromLabel: "", toLabel: "" }));
            }}
          >
            Enregistrer le mouvement
          </Button>
          <Badge variant="neutral">Filtres et donnees deja scopes par projet autorise</Badge>
        </div>
      </Card>

      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Historique"
          title="Mouvements traces"
          description="Chaque mouvement affiche l'origine, la destination, le demandeur et l'etat."
        />

        <ResponsiveDataTable
          rows={workspace.workspace.movements}
          emptyText="Aucun mouvement enregistre."
          columns={[
            {
              key: "type",
              header: "Type",
              render: (movement) => (
                <Badge variant={movement.kind === "entry" ? "success" : movement.kind === "exit" ? "warning" : "info"}>
                  {movement.kind}
                </Badge>
              ),
            },
            {
              key: "flux",
              header: "Flux",
              render: (movement) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{movement.fromLabel}</p>
                  <p className="text-xs text-slate-500">vers {movement.toLabel}</p>
                </div>
              ),
            },
            {
              key: "volume",
              header: "Quantite",
              render: (movement) => movement.quantity,
            },
            {
              key: "demandeur",
              header: "Demandeur",
              render: (movement) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{movement.requestedBy}</p>
                  <p className="text-xs text-slate-500">{movement.actorName}</p>
                </div>
              ),
            },
            {
              key: "note",
              header: "Note",
              render: (movement) => movement.note,
            },
            {
              key: "date",
              header: "Date",
              render: (movement) => formatDateTime(movement.createdAt),
            },
          ]}
        />
      </Card>
    </div>
  );
}
