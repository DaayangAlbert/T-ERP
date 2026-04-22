import { Boxes, Eye, MoveRight, PackageSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComptableDataTable } from "@/features/comptable/components/ComptableDataTable";
import { ComptableHero } from "@/features/comptable/components/ComptableHero";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { comptableProjectPill, comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import { useComptableWorkspace } from "@/features/comptable/hooks/useComptableWorkspace";

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(value || 0);
}

export function ComptableStockPage() {
  const workspace = useComptableWorkspace();

  return (
    <div className={comptableTheme.page}>
      <ComptableHero
        eyebrow="Stock en lecture seule"
        title="Consultation stock et mouvements"
        description="Le comptable peut consulter les niveaux de stock et les mouvements lies a ses projets, sans creation, modification ni suppression."
        stats={[
          { label: "Articles visibles", value: String(workspace.scopedStockItems.length) },
          { label: "Mouvements", value: String(workspace.scopedStockMovements.length) },
          { label: "Valeur stock", value: formatMoney(workspace.totals.stockValue) },
          { label: "Projet actif", value: workspace.selectedProject?.code || "-" },
        ]}
        sideContent={
          <Card className={`${comptableTheme.insetPanel} space-y-3 shadow-none`}>
            <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>Restriction</p>
            <p className={`text-sm ${comptableTheme.secondaryText}`}>Lecture seule stricte: aucun bouton d'ajout, d'edition ou de suppression n'est expose au comptable.</p>
          </Card>
        }
      />

      <div className="flex flex-wrap gap-2">
        {workspace.workspace.projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => workspace.actions.setSelectedProjectId(project.id)}
            className={comptableProjectPill(workspace.selectedProject?.id === project.id)}
          >
            {project.code} - {project.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={`${comptableTonePanel("neutral")} space-y-2`}>
          <Boxes className="h-5 w-5 text-primary" />
          <p className={`text-sm ${comptableTheme.subtleText}`}>Articles</p>
          <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.scopedStockItems.length}</p>
        </Card>
        <Card className={`${comptableTonePanel("info")} space-y-2`}>
          <MoveRight className="h-5 w-5 text-primary" />
          <p className={`text-sm ${comptableTheme.subtleText}`}>Mouvements</p>
          <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.scopedStockMovements.length}</p>
        </Card>
        <Card className={`${comptableTonePanel("success")} space-y-2`}>
          <PackageSearch className="h-5 w-5 text-primary" />
          <p className={`text-sm ${comptableTheme.subtleText}`}>Categories</p>
          <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{new Set(workspace.scopedStockItems.map((item) => item.category)).size}</p>
        </Card>
        <Card className={`${comptableTonePanel("warning")} space-y-2`}>
          <Eye className="h-5 w-5 text-primary" />
          <p className={`text-sm ${comptableTheme.subtleText}`}>Mode acces</p>
          <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>Lecture</p>
        </Card>
      </div>

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Visibilite"
          title="Points stock consultables"
          description="Le comptable voit les stocks disponibles, les reserves et les derniers mouvements, uniquement pour ses projets."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {workspace.scopedStockItems.slice(0, 3).map((item) => (
            <div key={item.id} className={comptableTonePanel("neutral")}>
              <div className="flex items-center justify-between gap-2">
                <p className={`font-semibold ${comptableTheme.primaryText}`}>{item.name}</p>
                <Badge variant="info">{item.category}</Badge>
              </div>
              <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>{item.available} {item.unit} disponibles</p>
              <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>{item.reserved} {item.unit} reserves</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Stock projet"
          title="Articles suivis"
          description="Consultation uniquement, sans action d'edition."
        />
        <ComptableDataTable
          rows={workspace.scopedStockItems}
          emptyText="Aucun article visible."
          columns={[
            {
              key: "item",
              header: "Article",
              render: (row) => (
                <div>
                  <p className={`font-medium ${comptableTheme.primaryText}`}>{row.name}</p>
                  <p className={`text-xs ${comptableTheme.subtleText}`}>{row.sku}</p>
                </div>
              ),
            },
            { key: "category", header: "Categorie", render: (row) => row.category },
            { key: "available", header: "Disponible", render: (row) => `${row.available} ${row.unit}` },
            { key: "reserved", header: "Reserve", render: (row) => `${row.reserved} ${row.unit}` },
            { key: "value", header: "Valeur", render: (row) => formatMoney(row.value) },
          ]}
        />
      </Card>

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Mouvements"
          title="Historique des mouvements"
          description="Entrees, sorties et transferts en lecture seule."
        />
        <ComptableDataTable
          rows={workspace.scopedStockMovements}
          emptyText="Aucun mouvement visible."
          columns={[
            { key: "item", header: "Article", render: (row) => row.itemName },
            { key: "kind", header: "Type", render: (row) => <Badge variant={row.kind === "entry" ? "success" : row.kind === "exit" ? "warning" : "info"}>{row.kind}</Badge> },
            { key: "quantity", header: "Quantite", render: (row) => `${row.quantity} ${row.unit}` },
            { key: "reference", header: "Reference", render: (row) => row.reference },
            { key: "actor", header: "Acteur", render: (row) => row.actorName },
            { key: "note", header: "Note", render: (row) => row.note },
          ]}
        />
      </Card>
    </div>
  );
}
