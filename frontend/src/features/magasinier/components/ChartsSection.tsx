import { Card } from "@/components/ui/card";
import type { CategorySplit, MovementTrendPoint, ProjectConsumption, StockItem } from "@/features/magasinier/types";
import { formatCompactNumber, formatPercent } from "@/features/magasinier/utils/format";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";

interface ChartsSectionProps {
  movementTrend: MovementTrendPoint[];
  projectConsumption: ProjectConsumption[];
  categorySplit: CategorySplit[];
  criticalItems: StockItem[];
}

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

function BarGroup({ label, primary, secondary, max }: { label: string; primary: number; secondary: number; max: number }) {
  const primaryHeight = Math.max(10, (primary / max) * 120);
  const secondaryHeight = Math.max(10, (secondary / max) * 120);

  return (
    <div className="flex items-end gap-2">
      <div className="flex h-40 items-end gap-1">
        <div className="w-4 rounded-t-full bg-sky-500" style={{ height: `${primaryHeight}px` }} />
        <div className="w-4 rounded-t-full bg-amber-500" style={{ height: `${secondaryHeight}px` }} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{label}</p>
        <p className="text-xs text-slate-500">{primary} / {secondary}</p>
      </div>
    </div>
  );
}

export function ChartsSection({
  movementTrend,
  projectConsumption,
  categorySplit,
  criticalItems,
}: ChartsSectionProps) {
  const trendMax = maxValue(movementTrend.flatMap((point) => [point.entries, point.exits]));
  const consumptionMax = maxValue(projectConsumption.map((project) => project.quantity));
  const categoryMax = maxValue(categorySplit.map((category) => category.quantity));

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Graphiques"
          title="Mouvements stock"
          description="Lecture rapide des entrees et sorties recentes, lisible en clair comme en sombre."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Entrees vs sorties</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {movementTrend.map((point) => (
                <BarGroup
                  key={point.label}
                  label={point.label}
                  primary={point.entries}
                  secondary={point.exits}
                  max={trendMax}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Consommation par projet</p>
            <div className="mt-4 space-y-3">
              {projectConsumption.map((project) => (
                <div key={project.projectId}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{project.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{project.quantity}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#0f766e,#f59e0b)]"
                      style={{ width: `${(project.quantity / consumptionMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Niveau de stock"
            title="Repartition par categorie"
            description="Vue compacte du poids de chaque categorie dans le stock autorise."
          />
          <div className="space-y-3">
            {categorySplit.map((category) => (
              <div key={category.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{category.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{formatCompactNumber(category.quantity)}</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#14b8a6,#0ea5e9)]"
                    style={{ width: `${(category.quantity / categoryMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Critiques"
            title="Articles a surveiller"
            description="Seuls les articles critiques de votre perimetre sont affiches."
          />
          <div className="space-y-3">
            {criticalItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.name}</p>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    {formatPercent((item.onHand / item.minThreshold) * 100)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {item.onHand} {item.unit} disponibles, seuil mini {item.minThreshold}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
