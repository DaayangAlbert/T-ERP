"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Package,
  TrendingUp,
  Calendar,
  Wrench,
  Flag,
  ShieldAlert,
} from "lucide-react";

interface ReportItem {
  id: string;
  reportDate: string;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
  site: { id: string; code: string; name: string; client: string };
  workforcePresent: number;
  workforcePlanned: number;
  normalHours: number;
  overtimeHours: number;
  productionValue: number;
  tasksCompleted: Array<{ task: string; quantity: number; unit: string; value: number }>;
  consumedMaterials: Array<{ code?: string; label?: string; quantity: number; unit: string }>;
  incidents: string | null;
  photos: string[];
  submittedBy: { firstName: string; lastName: string };
  validatedBy: { firstName: string; lastName: string } | null;
  validatedAt: string | null;
}

interface ReportsPayload {
  items: ReportItem[];
  kpis: {
    totalReports: number;
    monthReports: number;
    pendingValidation: number;
    monthProduction: number;
  };
  sites: Array<{ id: string; code: string; name: string }>;
}

const STATUS_LABELS: Record<ReportItem["status"], { label: string; tone: string }> = {
  DRAFT: { label: "Brouillon", tone: "bg-ink-3/10 text-ink-3" },
  SUBMITTED: { label: "Soumis", tone: "bg-amber-100 text-amber-800" },
  VALIDATED: { label: "Validé", tone: "bg-success/10 text-success" },
  REJECTED: { label: "Rejeté", tone: "bg-rose-100 text-rose-700" },
};

function formatXAF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SgRapportsChantiersPage() {
  const [siteId, setSiteId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const sp = new URLSearchParams();
  if (siteId) sp.set("siteId", siteId);
  if (status) sp.set("status", status);
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sg", "site-reports", { siteId, status, from, to }],
    queryFn: async (): Promise<ReportsPayload> => {
      const res = await fetch(`/api/sg/site-reports?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const openItem = data?.items.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Rapports chantiers</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue consolidée des rapports journaliers remontés par les Chefs de Chantier — lecture seule.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard icon={ClipboardList} label="Rapports affichés" value={String(data?.kpis.totalReports ?? "—")} />
        <KpiCard icon={Clock} label="Ce mois" value={String(data?.kpis.monthReports ?? "—")} />
        <KpiCard
          icon={AlertTriangle}
          label="En attente validation"
          value={String(data?.kpis.pendingValidation ?? "—")}
          alert={(data?.kpis.pendingValidation ?? 0) > 0}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Production du mois"
          value={data ? formatXAF(data.kpis.monthProduction) : "—"}
        />
      </section>

      <section className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3 shadow-card">
        <Field label="Chantier">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Tous chantiers</option>
            {data?.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Tous statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumis</option>
            <option value="VALIDATED">Validé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
        </Field>
        <Field label="Du">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          />
        </Field>
        <Field label="Au">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          />
        </Field>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {isError ? (
          <p className="p-6 text-center text-[12.5px] text-rose-700">Impossible de charger les rapports.</p>
        ) : isLoading || !data ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun rapport ne correspond aux filtres.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Chantier</th>
                <th className="px-3 py-2 text-right font-semibold">Effectif</th>
                <th className="px-3 py-2 text-right font-semibold">Heures</th>
                <th className="px-3 py-2 text-right font-semibold">Production</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-left font-semibold">Auteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-surface-alt"
                  onClick={() => setOpenId(r.id)}
                >
                  <td className="px-3 py-2 text-ink">{new Date(r.reportDate).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{r.site.code}</div>
                    <div className="text-[11px] text-ink-3">{r.site.client}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {r.workforcePresent}/{r.workforcePlanned}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">{r.normalHours + r.overtimeHours}h</td>
                  <td className="px-3 py-2 text-right font-medium text-ink">{formatXAF(r.productionValue)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_LABELS[r.status].tone}`}>
                      {STATUS_LABELS[r.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-3">
                    {r.submittedBy.firstName} {r.submittedBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {openItem && <ReportDetailDrawer report={openItem} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <article className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-rose-600" : "text-primary-600"}`} />
        {label}
      </div>
      <div className={`mt-1 text-[18px] font-semibold ${alert ? "text-rose-700" : "text-ink"}`}>{value}</div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      {children}
    </label>
  );
}

interface SiteSynthesis {
  site: {
    code: string;
    name: string;
    client: string;
    region: string | null;
    status: string;
    manager: string | null;
    budget: number;
    actualSpentAmount: number;
    budgetConsumedPct: number;
    progress: number;
    physicalProgress: number;
    financialProgress: number;
    deviationPercent: number;
    margin: number;
    marginTarget: number;
    startDate: string;
    plannedEndDate: string;
    actualEndDate: string | null;
    daysToDeadline: number;
  };
  planning: {
    totalDurationDays: number;
    phases: Array<{
      id: string;
      name: string;
      orderIndex: number;
      plannedStart: string;
      plannedEnd: string;
      actualStart: string | null;
      actualEnd: string | null;
      progressPercent: number;
      status: string;
    }>;
    milestones: Array<{
      id: string;
      code: string;
      description: string;
      contractDueDate: string;
      forecastDate: string | null;
      actualDate: string | null;
      status: string;
      moaValidation: boolean;
    }>;
  } | null;
  cumulatedKpis: {
    totalDailyReports: number;
    totalNormalHours: number;
    totalOvertimeHours: number;
    totalProductionValue: number;
    avgWorkforce: number;
  };
  achievements: Array<{
    id: string;
    reportType: string;
    period: string;
    periodLabel: string | null;
    physicalProgressPercent: number;
    previousProgressPercent: number | null;
    mainAchievements: string | null;
    delaysIdentified: string | null;
    valueProducedXAF: number;
    valueProducedCumulXAF: number;
    avgWorkforce: number;
    issuesEncountered: string | null;
    supportNeeded: string | null;
    nextPeriodPriorities: string | null;
    hseIncidentsCount: number;
    daysWithoutAccident: number;
    validatedAt: string | null;
    author: string | null;
  }>;
  issues: Array<{
    id: string;
    category: string;
    criticality: "MINOR" | "MAJOR" | "CRITICAL";
    description: string;
    correctiveAction: string | null;
    dueDate: string | null;
    status: string;
    isResolved: boolean;
    closedAt: string | null;
    createdAt: string;
    owner: string | null;
  }>;
  tasksCumulative: Array<{ task: string; unit: string; quantity: number; value: number; days: number }>;
}

const PHASE_STATUS_TONE: Record<string, string> = {
  PLANNED: "bg-ink-3/10 text-ink-3",
  IN_PROGRESS: "bg-primary-50 text-primary-700",
  COMPLETED: "bg-success/10 text-success",
  DELAYED: "bg-amber-100 text-amber-800",
  BLOCKED: "bg-rose-100 text-rose-700",
};

const NC_CRITICALITY_TONE: Record<string, string> = {
  MINOR: "bg-ink-3/10 text-ink-3",
  MAJOR: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-rose-100 text-rose-700",
};

function ReportDetailDrawer({ report, onClose }: { report: ReportItem; onClose: () => void }) {
  const synthesisQ = useQuery({
    queryKey: ["sg", "site-synthesis", report.site.id],
    queryFn: async (): Promise<SiteSynthesis> => {
      const res = await fetch(`/api/sg/site-synthesis/${report.site.id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const synth = synthesisQ.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-3xl overflow-y-auto bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-[15px] font-bold text-ink">
              Rapport du {new Date(report.reportDate).toLocaleDateString("fr-FR")}
            </h2>
            <p className="text-[12.5px] text-ink-3">
              {report.site.code} — {report.site.name} · {report.site.client}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-3 hover:bg-surface-alt"
          >
            Fermer
          </button>
        </div>

        {/* SECTION 1 — Synthèse chantier (avancement, budget, deadline) */}
        <section className="mt-3">
          <SectionTitle icon={TrendingUp} title="Avancement chantier" />
          {synthesisQ.isLoading || !synth ? (
            <SectionSkeleton />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniKpi label="Avancement physique" value={`${synth.site.physicalProgress.toFixed(0)}%`} bar={synth.site.physicalProgress} />
                <MiniKpi label="Avancement financier" value={`${synth.site.financialProgress.toFixed(0)}%`} bar={synth.site.financialProgress} tone="violet" />
                <MiniKpi
                  label="Budget consommé"
                  value={`${synth.site.budgetConsumedPct.toFixed(0)}%`}
                  bar={Math.min(100, synth.site.budgetConsumedPct)}
                  tone={synth.site.budgetConsumedPct > synth.site.physicalProgress + 10 ? "rose" : "violet"}
                />
                <MiniKpi
                  label="Échéance"
                  value={`${synth.site.daysToDeadline > 0 ? `J-${synth.site.daysToDeadline}` : `+${Math.abs(synth.site.daysToDeadline)}j`}`}
                  tone={synth.site.daysToDeadline < 30 ? "rose" : synth.site.daysToDeadline < 90 ? "amber" : "emerald"}
                />
              </div>
              <div className="rounded-md border border-line bg-surface-alt p-2 text-[11.5px] text-ink-3">
                Budget {formatXAF(synth.site.budget)} · Dépensé {formatXAF(synth.site.actualSpentAmount)} · Marge réelle{" "}
                <span className={synth.site.margin < synth.site.marginTarget ? "font-semibold text-rose-700" : "font-semibold text-emerald-700"}>
                  {synth.site.margin.toFixed(1)}%
                </span>{" "}
                (cible {synth.site.marginTarget.toFixed(0)}%) · Démarrage{" "}
                {new Date(synth.site.startDate).toLocaleDateString("fr-FR")} · Livraison{" "}
                {new Date(synth.site.plannedEndDate).toLocaleDateString("fr-FR")}
                {synth.site.manager && <> · Resp. {synth.site.manager}</>}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2 — Planning (phases + jalons) */}
        <section className="mt-4">
          <SectionTitle icon={Calendar} title="Planning" />
          {synthesisQ.isLoading || !synth ? (
            <SectionSkeleton />
          ) : !synth.planning ? (
            <EmptyHint>Aucun planning enregistré pour ce chantier.</EmptyHint>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border border-line">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wider text-ink-3">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold">Phase</th>
                      <th className="px-2 py-1 text-left font-semibold">Période</th>
                      <th className="px-2 py-1 text-right font-semibold">Avancement</th>
                      <th className="px-2 py-1 text-left font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {synth.planning.phases.map((p) => (
                      <tr key={p.id}>
                        <td className="px-2 py-1.5 text-ink">{p.name}</td>
                        <td className="px-2 py-1.5 text-ink-3">
                          {new Date(p.plannedStart).toLocaleDateString("fr-FR")} →{" "}
                          {new Date(p.plannedEnd).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="tabular-nums text-ink-2">{p.progressPercent.toFixed(0)}%</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full bg-primary-500"
                                style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10.5px] font-medium ${PHASE_STATUS_TONE[p.status] ?? "bg-ink-3/10 text-ink-3"}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {synth.planning.milestones.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    <Flag className="h-3 w-3" /> Jalons contractuels
                  </div>
                  <ul className="space-y-1">
                    {synth.planning.milestones.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-2 py-1.5 text-[12px]">
                        <span>
                          <strong className="text-ink">{m.code}</strong>{" "}
                          <span className="text-ink-2">{m.description}</span>
                        </span>
                        <span className="whitespace-nowrap text-[11px] text-ink-3">
                          contrat {new Date(m.contractDueDate).toLocaleDateString("fr-FR")}
                          {m.actualDate && <> · réalisé {new Date(m.actualDate).toLocaleDateString("fr-FR")}</>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 3 — Détail du rapport du jour */}
        <section className="mt-4">
          <SectionTitle icon={ClipboardList} title="Détail du rapport du jour" />
          <div className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
            <DetailRow label="Statut" inline>
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_LABELS[report.status].tone}`}>
                {STATUS_LABELS[report.status].label}
              </span>
            </DetailRow>
            <DetailRow label="Effectif" inline>
              {report.workforcePresent}/{report.workforcePlanned}
            </DetailRow>
            <DetailRow label="Heures" inline>
              {report.normalHours}h + {report.overtimeHours}h sup
            </DetailRow>
            <DetailRow label="Production" inline>
              {formatXAF(report.productionValue)}
            </DetailRow>
          </div>

          {report.tasksCompleted.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Tâches réalisées ce jour ({report.tasksCompleted.length})
              </div>
              <ul className="divide-y divide-line rounded-md border border-line bg-white">
                {report.tasksCompleted.map((t, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 px-2 py-1.5 text-[12px]">
                    <span className="text-ink-2">{t.task}</span>
                    <span className="whitespace-nowrap tabular-nums text-ink-3">
                      {t.quantity} {t.unit} · {formatXAF(t.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.consumedMaterials.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                <Package className="h-3 w-3" /> Matériaux consommés ({report.consumedMaterials.length})
              </div>
              <ul className="divide-y divide-line rounded-md border border-line bg-white">
                {report.consumedMaterials.map((m, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 px-2 py-1.5 text-[12px]">
                    <span className="text-ink-2">{m.label ?? m.code ?? "—"}</span>
                    <span className="whitespace-nowrap tabular-nums text-ink-3">
                      {m.quantity} {m.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.incidents && (
            <div className="mt-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                <AlertTriangle className="h-3 w-3" /> Incidents du jour
              </div>
              <p className="whitespace-pre-wrap rounded-md bg-rose-50 p-2 text-[12px] text-rose-900">{report.incidents}</p>
            </div>
          )}

          {report.photos.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                <ImageIcon className="h-3 w-3" /> Photos ({report.photos.length})
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {report.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={p} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-md object-cover" />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 4 — Ce qui a déjà été fait (réalisations cumulées) */}
        <section className="mt-4">
          <SectionTitle icon={Wrench} title="Réalisations cumulées" />
          {synthesisQ.isLoading || !synth ? (
            <SectionSkeleton />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
                <MiniStat label="Rapports valides" value={String(synth.cumulatedKpis.totalDailyReports)} />
                <MiniStat label="Heures normales" value={`${Math.round(synth.cumulatedKpis.totalNormalHours)}h`} />
                <MiniStat label="Heures sup" value={`${Math.round(synth.cumulatedKpis.totalOvertimeHours)}h`} />
                <MiniStat label="Production cumulée" value={formatXAF(synth.cumulatedKpis.totalProductionValue)} />
              </div>

              {synth.tasksCumulative.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Top tâches réalisées (cumul depuis démarrage)
                  </div>
                  <ul className="divide-y divide-line rounded-md border border-line bg-white">
                    {synth.tasksCumulative.map((t, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-2 px-2 py-1.5 text-[12px]">
                        <span className="text-ink-2">
                          {t.task}{" "}
                          <span className="text-[10.5px] text-ink-3">({t.days} jour{t.days > 1 ? "s" : ""})</span>
                        </span>
                        <span className="whitespace-nowrap tabular-nums text-ink-3">
                          {t.quantity.toFixed(t.quantity % 1 === 0 ? 0 : 1)} {t.unit} · {formatXAF(t.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {synth.achievements.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Rapports de progression ({synth.achievements.length})
                  </div>
                  <ul className="space-y-2">
                    {synth.achievements.map((r) => (
                      <li key={r.id} className="rounded-md border border-line bg-white p-2 text-[12px]">
                        <div className="flex flex-wrap items-baseline justify-between gap-1">
                          <strong className="text-ink">
                            {r.reportType === "WEEKLY" ? "Hebdo" : r.reportType === "MONTHLY" ? "Mensuel" : "Ad hoc"}{" "}
                            · {r.periodLabel ?? new Date(r.period).toLocaleDateString("fr-FR")}
                          </strong>
                          <span className="text-[11px] text-ink-3">
                            Avancement {r.physicalProgressPercent.toFixed(0)}%
                            {r.previousProgressPercent !== null && (
                              <> (+{(r.physicalProgressPercent - r.previousProgressPercent).toFixed(0)} pts)</>
                            )}
                            {r.author && <> · {r.author}</>}
                          </span>
                        </div>
                        {r.mainAchievements && (
                          <p className="mt-1 whitespace-pre-wrap text-ink-2">
                            <strong className="text-ink-3">Réalisations : </strong>
                            {r.mainAchievements}
                          </p>
                        )}
                        {r.delaysIdentified && (
                          <p className="mt-1 whitespace-pre-wrap text-amber-800">
                            <strong>Retards : </strong>
                            {r.delaysIdentified}
                          </p>
                        )}
                        {r.nextPeriodPriorities && (
                          <p className="mt-1 whitespace-pre-wrap text-ink-2">
                            <strong className="text-ink-3">Priorités suivantes : </strong>
                            {r.nextPeriodPriorities}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 5 — Problèmes rencontrés & solutions */}
        <section className="mt-4">
          <SectionTitle icon={ShieldAlert} title="Problèmes rencontrés & solutions" />
          {synthesisQ.isLoading || !synth ? (
            <SectionSkeleton />
          ) : synth.issues.length === 0 ? (
            <EmptyHint>Aucune non-conformité enregistrée sur ce chantier.</EmptyHint>
          ) : (
            <ul className="space-y-2">
              {synth.issues.map((n) => (
                <li key={n.id} className="rounded-md border border-line bg-white p-2 text-[12px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10.5px] font-medium ${NC_CRITICALITY_TONE[n.criticality]}`}>
                        {n.criticality}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-ink-3">{n.category}</span>
                    </div>
                    <span className="text-[11px] text-ink-3">
                      {new Date(n.createdAt).toLocaleDateString("fr-FR")}
                      {n.isResolved && n.closedAt && <> · résolu {new Date(n.closedAt).toLocaleDateString("fr-FR")}</>}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-ink-2">
                    <strong className="text-ink-3">Problème : </strong>
                    {n.description}
                  </p>
                  {n.correctiveAction ? (
                    <p className="mt-1 whitespace-pre-wrap text-emerald-800">
                      <strong>Solution adoptée : </strong>
                      {n.correctiveAction}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11.5px] italic text-amber-700">Action corrective en cours de définition.</p>
                  )}
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3">
                    <span>{n.owner ? `Resp. ${n.owner}` : ""}</span>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10.5px] font-medium ${n.isResolved ? "bg-success/10 text-success" : "bg-amber-100 text-amber-800"}`}>
                      {n.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof TrendingUp; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-2">
      <Icon className="h-3.5 w-3.5 text-primary-600" />
      {title}
    </h3>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 animate-pulse rounded-md bg-surface-alt" />
      <div className="h-10 animate-pulse rounded-md bg-surface-alt" />
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line bg-surface-alt p-3 text-center text-[12px] text-ink-3">{children}</p>;
}

function MiniKpi({
  label,
  value,
  bar,
  tone = "violet",
}: {
  label: string;
  value: string;
  bar?: number;
  tone?: "violet" | "rose" | "amber" | "emerald";
}) {
  const colors: Record<string, { text: string; bar: string }> = {
    violet: { text: "text-ink", bar: "bg-primary-500" },
    rose: { text: "text-rose-700", bar: "bg-rose-500" },
    amber: { text: "text-amber-800", bar: "bg-amber-500" },
    emerald: { text: "text-emerald-700", bar: "bg-emerald-500" },
  };
  const c = colors[tone];
  return (
    <div className="rounded-md border border-line bg-white p-2">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`mt-0.5 text-[15px] font-semibold ${c.text}`}>{value}</div>
      {typeof bar === "number" && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
          <div className={`h-full ${c.bar}`} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt p-2">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function DetailRow({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="rounded-md border border-line bg-surface-alt p-2">
        <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</div>
        <div className="mt-0.5 font-medium text-ink">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line/40 pb-1.5">
      <span className="text-[11.5px] text-ink-3">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}
