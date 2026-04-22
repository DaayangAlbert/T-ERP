import { ArrowDownCircle, ArrowUpCircle, BellRing, CalendarClock, FileCheck2, Landmark, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComptableChartCard } from "@/features/comptable/components/ComptableChartCard";
import { ComptableHero } from "@/features/comptable/components/ComptableHero";
import { ComptableKpiCard } from "@/features/comptable/components/ComptableKpiCard";
import { ComptableQuickActions } from "@/features/comptable/components/ComptableQuickActions";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { MessageInboxPreview } from "@/features/comptable/components/MessageInboxPreview";
import { NotificationFeed } from "@/features/comptable/components/NotificationFeed";
import { PayslipLibrary } from "@/features/comptable/components/PayslipLibrary";
import { comptableProjectPill, comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import { useComptableWorkspace } from "@/features/comptable/hooks/useComptableWorkspace";

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(value || 0);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

export function ComptableDashboardPage() {
  const workspace = useComptableWorkspace();
  const monthlyMax = maxValue(workspace.monthlyFlow.flatMap((point) => [point.inflow, point.outflow]));
  const projectMax = maxValue(workspace.projectFinance.flatMap((point) => [point.expenses, point.revenues]));
  const chargeMax = maxValue(workspace.chargeSplit.map((point) => point.amount));
  const attendanceMax = maxValue(
    workspace.attendanceTrend.map((point) => point.present + point.late + point.absent)
  );

  return (
    <div className={comptableTheme.page}>
      <ComptableHero
        eyebrow="Espace comptable"
        title="Cockpit financier et social par projet"
        description="Un espace recentre sur les flux financiers, les presences, la paie et la traceabilite. Les modules hors scope sont masques et toutes les donnees sont bornees a vos projets affectes."
        stats={[
          { label: "Projets suivis", value: String(workspace.workspace.projects.length) },
          { label: "Solde global", value: formatMoney(workspace.totals.totalBalance) },
          { label: "Messages recus", value: String(workspace.totals.unreadMessages) },
          { label: "Bulletins", value: String(workspace.totals.payslipCount) },
        ]}
        actions={<ComptableQuickActions />}
        sideContent={<NotificationFeed items={workspace.workspace.notifications.slice(0, 4)} />}
      />

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Perimetre projet"
          title="Filtrage comptable actif"
          description="Les cartes, graphiques et historiques s'ajustent a vos affectations projet sans exposer l'administration, les projets globaux ou les modifications stock."
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
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ComptableKpiCard
          icon={ArrowUpCircle}
          label="Entrees d'argent"
          value={formatMoney(workspace.totals.inflow)}
          helper="Recettes et encaissements confirmes"
          tone="success"
          trend={workspace.monthlyFlow.map((point) => point.inflow)}
        />
        <ComptableKpiCard
          icon={ArrowDownCircle}
          label="Sorties d'argent"
          value={formatMoney(workspace.totals.outflow)}
          helper="Depenses, salaires et paiements"
          tone="warning"
          trend={workspace.monthlyFlow.map((point) => point.outflow)}
        />
        <ComptableKpiCard
          icon={CalendarClock}
          label="Presences consolidees"
          value={String(workspace.totals.presentCount)}
          helper={`${workspace.totals.lateCount} retards, ${workspace.totals.absenceCount} absences`}
          tone="info"
          trend={workspace.attendanceTrend.map((point) => point.present + point.late)}
        />
        <ComptableKpiCard
          icon={FileCheck2}
          label="Justificatifs traces"
          value={String(workspace.totals.proofsCount)}
          helper="Chaque flux comptable garde une preuve exploitable"
          tone="neutral"
          trend={workspace.monthlyFlow.map((point) => point.balance)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ComptableChartCard
          eyebrow="Flux financiers"
          title="Evolution mensuelle"
          description="Lecture visuelle des encaissements et decaissements sur le perimetre comptable."
          badgeLabel={workspace.workspace.transactions.length}
          badgeVariant="info"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
              {workspace.monthlyFlow.map((point) => (
                <div key={point.label} className={comptableTonePanel("neutral")}>
                  <div className="flex h-40 items-end justify-center gap-2">
                    <div className="w-4 rounded-t-full bg-emerald-500" style={{ height: `${Math.max(14, (point.inflow / monthlyMax) * 140)}px` }} />
                    <div className="w-4 rounded-t-full bg-amber-500" style={{ height: `${Math.max(14, (point.outflow / monthlyMax) * 140)}px` }} />
                  </div>
                  <p className={`mt-3 text-center text-sm font-semibold ${comptableTheme.primaryText}`}>{point.label}</p>
                  <p className={`mt-1 text-center text-xs ${comptableTheme.subtleText}`}>{formatCompact(point.balance)}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className={comptableTonePanel("success")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Recettes</p>
                <p className={`mt-2 text-lg font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.totals.inflow)}</p>
              </div>
              <div className={comptableTonePanel("warning")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Depenses</p>
                <p className={`mt-2 text-lg font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.totals.outflow)}</p>
              </div>
              <div className={comptableTonePanel("info")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Solde</p>
                <p className={`mt-2 text-lg font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.totals.totalBalance)}</p>
              </div>
            </div>
          </div>
        </ComptableChartCard>

        <ComptableChartCard
          eyebrow="Paie & presence"
          title="Suivi social"
          description="Retards, absences et heures supplementaires consolides pour la paie."
          badgeLabel={`${workspace.totals.overtimeHours.toFixed(1)} h`}
          badgeVariant="warning"
        >
          <div className="space-y-4">
            {workspace.attendanceTrend.map((point) => {
              const total = point.present + point.late + point.absent;
              return (
                <div key={point.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>{point.label}</p>
                    <p className={`text-xs ${comptableTheme.subtleText}`}>{point.overtime.toFixed(1)} h supp.</p>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="flex h-full">
                      <div className="bg-emerald-500" style={{ width: `${((point.present || 0) / Math.max(total, attendanceMax)) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${((point.late || 0) / Math.max(total, attendanceMax)) * 100}%` }} />
                      <div className="bg-rose-500" style={{ width: `${((point.absent || 0) / Math.max(total, attendanceMax)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={comptableTonePanel("success")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Presents</p>
                <p className={`mt-2 text-xl font-semibold ${comptableTheme.primaryText}`}>{workspace.totals.presentCount}</p>
              </div>
              <div className={comptableTonePanel("warning")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Retards</p>
                <p className={`mt-2 text-xl font-semibold ${comptableTheme.primaryText}`}>{workspace.totals.lateCount}</p>
              </div>
              <div className={comptableTonePanel("danger")}>
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Absences</p>
                <p className={`mt-2 text-xl font-semibold ${comptableTheme.primaryText}`}>{workspace.totals.absenceCount}</p>
              </div>
            </div>
          </div>
        </ComptableChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ComptableChartCard
          eyebrow="Performance par projet"
          title="Recettes vs depenses"
          description="Chaque projet garde son propre signal financier."
        >
          <div className="space-y-4">
            {workspace.projectFinance.map((point) => (
              <div key={point.projectId}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>{point.label}</p>
                  <p className={`text-sm ${comptableTheme.mutedText}`}>{formatMoney(point.balance)}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(point.revenues / projectMax) * 100}%` }} />
                  </div>
                  <div className="rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(point.expenses / projectMax) * 100}%` }} />
                  </div>
                </div>
                <div className={`mt-2 flex justify-between text-xs ${comptableTheme.subtleText}`}>
                  <span>Recettes {formatCompact(point.revenues)}</span>
                  <span>Depenses {formatCompact(point.expenses)}</span>
                </div>
              </div>
            ))}
          </div>
        </ComptableChartCard>

        <ComptableChartCard
          eyebrow="Repartition des charges"
          title="Charges par categorie"
          description="Vision synthese pour expliquer les sorties d'argent rapidement."
        >
          <div className="space-y-3">
            {workspace.chargeSplit.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "info"} />
                    <p className={`text-sm font-medium ${comptableTheme.primaryText}`}>{item.label}</p>
                  </div>
                  <p className={`text-sm ${comptableTheme.mutedText}`}>{formatMoney(item.amount)}</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/10 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b,#ef4444)]" style={{ width: `${(item.amount / chargeMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ComptableChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection
            eyebrow="Messages recus"
            title="Inbox comptable"
            description="Messages terrain et demandes de rapprochement utiles au comptable."
            action={
              <Link to="/app/chat" className="text-sm font-medium text-primary hover:underline">
                Ouvrir
              </Link>
            }
          />
          <MessageInboxPreview items={workspace.workspace.inbox.slice(0, 4)} />
        </Card>

        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection
            eyebrow="Bulletins"
            title="Bulletins salaries centralises dans Finance"
            description="Le tableau de bord renvoie vers la bibliotheque Finance pour les bulletins des travailleurs, tandis que la paie personnelle reste separee."
            action={
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{workspace.workspace.payslips.length} bulletins</Badge>
                <Link to="/app/finance?section=payslips" className="text-sm font-medium text-primary hover:underline">
                  Ouvrir Finance
                </Link>
              </div>
            }
          />
          <PayslipLibrary
            payslips={workspace.workspace.payslips.slice(0, 3)}
            proofsById={workspace.proofsById}
            projects={workspace.workspace.projects}
            workers={workspace.workspace.workers}
            compact
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/app/finance?section=expenses" className={`${comptableTheme.insetPanel} block transition hover:border-primary/30`}>
          <Landmark className="h-5 w-5 text-primary" />
          <p className={`mt-3 font-semibold ${comptableTheme.primaryText}`}>Finance restructuree</p>
          <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Depenses, recettes, paiements, bulletins et justificatifs separes clairement.</p>
        </Link>
        <Link to="/app/payroll" className={`${comptableTheme.insetPanel} block transition hover:border-primary/30`}>
          <CalendarClock className="h-5 w-5 text-primary" />
          <p className={`mt-3 font-semibold ${comptableTheme.primaryText}`}>Temps & paie</p>
          <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Retards, absences et heures supplementaires consolides dans l'espace paie existant.</p>
        </Link>
        <Link to="/app/payroll" className={`${comptableTheme.insetPanel} block transition hover:border-primary/30`}>
          <Wallet className="h-5 w-5 text-primary" />
          <p className={`mt-3 font-semibold ${comptableTheme.primaryText}`}>Ma paie & conges</p>
          <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Bulletins personnels, conges, retards, absences et heures supplementaires du comptable.</p>
        </Link>
        <Link to="/app/inventory" className={`${comptableTheme.insetPanel} block transition hover:border-primary/30`}>
          <BellRing className="h-5 w-5 text-primary" />
          <p className={`mt-3 font-semibold ${comptableTheme.primaryText}`}>Stock en lecture</p>
          <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Consultation des quantites et mouvements sans action d'edition.</p>
        </Link>
      </div>
    </div>
  );
}
