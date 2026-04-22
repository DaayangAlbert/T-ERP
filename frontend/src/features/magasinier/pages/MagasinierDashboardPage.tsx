import { AlertTriangle, Boxes, MessageCircleMore, Siren, TrendingUp, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChartsSection } from "@/features/magasinier/components/ChartsSection";
import { KpiCard } from "@/features/magasinier/components/KpiCard";
import { MagasinierHero } from "@/features/magasinier/components/MagasinierHero";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { NotificationsPanel } from "@/features/magasinier/components/NotificationsPanel";
import { ProjectSelector } from "@/features/magasinier/components/ProjectSelector";
import { QuickActionBar } from "@/features/magasinier/components/QuickActionBar";
import type { MagasinierWorkspaceModel } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { formatCompactNumber, formatDateTime, formatMoney } from "@/features/magasinier/utils/format";

interface MagasinierDashboardPageProps {
  workspace: MagasinierWorkspaceModel;
  onOpenSection: (section: "stock" | "movements" | "reports") => void;
  onOpenChat: () => void;
}

const metricIcons = [Boxes, Truck, AlertTriangle, TrendingUp];

export function MagasinierDashboardPage({
  workspace,
  onOpenSection,
  onOpenChat,
}: MagasinierDashboardPageProps) {
  return (
    <div className="space-y-5">
      <MagasinierHero
        eyebrow="Espace magasinier"
        title="Pilotage stock cible par projet"
        description="Un cockpit mobile-first, centre sur vos projets affectes, vos alertes critiques, vos mouvements de stock et vos echanges autorises avec l'admin et les responsables projet."
        stats={[
          { label: "Projets", value: formatCompactNumber(workspace.workspace.projects.length) },
          { label: "Signalements", value: formatCompactNumber(workspace.workspace.signalements.length) },
          { label: "Conversations", value: formatCompactNumber(workspace.workspace.conversations.length) },
          { label: "Valeur stock", value: formatMoney(workspace.totalStockValue) },
        ]}
        actions={
          <QuickActionBar
            onEntry={() => onOpenSection("movements")}
            onExit={() => onOpenSection("movements")}
            onTransfer={() => onOpenSection("movements")}
            onReport={() => onOpenSection("reports")}
            onChat={onOpenChat}
          />
        }
        sideContent={<NotificationsPanel items={workspace.workspace.notifications} />}
      />

      <ProjectSelector
        projects={workspace.workspace.projects}
        selectedProjectId={workspace.workspace.selectedProjectId}
        onSelect={workspace.actions.setSelectedProjectId}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workspace.metrics.map((metric, index) => {
          const Icon = metricIcons[index];
          return (
            <KpiCard
              key={metric.id}
              icon={Icon}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              tone={metric.tone}
            />
          );
        })}
      </div>

      <ChartsSection
        movementTrend={workspace.movementTrend}
        projectConsumption={workspace.projectConsumption}
        categorySplit={workspace.categorySplit}
        criticalItems={workspace.criticalItems}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Derniers mouvements"
            title="Activite recente"
            description="Entrees, sorties et transferts de vos seuls projets autorises."
            action={<Badge variant="info">{workspace.scopedMovements.length}</Badge>}
          />
          <div className="space-y-3">
            {workspace.scopedMovements.slice(0, 5).map((movement) => (
              <div
                key={movement.id}
                className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={movement.kind === "entry" ? "success" : movement.kind === "exit" ? "warning" : "info"}>
                      {movement.kind}
                    </Badge>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{movement.note}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(movement.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {movement.fromLabel} → {movement.toLabel}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span>{movement.quantity}</span>
                  <span>{movement.actorName}</span>
                  <span>{movement.requestedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <MagasinierSection
              eyebrow="Signalements"
              title="Dernieres remontees"
              description="Brouillons, demandes envoyees et resolution des incidents stock."
              action={<Badge variant="warning">{workspace.workspace.signalements.length}</Badge>}
            />
            <div className="space-y-3">
              {workspace.workspace.signalements.slice(0, 4).map((report) => (
                <div
                  key={report.id}
                  className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{report.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.priority === "urgent" ? "danger" : report.priority === "high" ? "warning" : "neutral"}>
                        {report.priority}
                      </Badge>
                      <Badge variant="info">{report.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{report.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <MagasinierSection
              eyebrow="Messagerie"
              title="Conversations recentes"
              description="Canaux prives et groupes limites a votre perimetre projet."
            />
            <div className="space-y-3">
              {workspace.workspace.conversations.slice(0, 4).map((conversation) => (
                <div
                  key={conversation.id}
                  className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageCircleMore className="h-4 w-4 text-slate-500" />
                      <p className="font-medium text-slate-900 dark:text-slate-50">{conversation.title}</p>
                    </div>
                    {conversation.unreadCount ? <Badge variant="warning">{conversation.unreadCount}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {conversation.messages[conversation.messages.length - 1]?.content || "Aucun message"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Alerte stock"
          title="Articles critiques a traiter"
          description="Ces alertes restent bornees aux projets ou vous etes affecte."
          action={<Badge variant="danger">{workspace.criticalItems.length}</Badge>}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workspace.criticalItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="rounded-[22px] border border-rose-200 bg-rose-50/80 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-950/20"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-50">{item.name}</p>
                <Siren className="h-4 w-4 text-rose-600 dark:text-rose-300" />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {item.onHand} {item.unit} restants
              </p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">Seuil mini {item.minThreshold}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
