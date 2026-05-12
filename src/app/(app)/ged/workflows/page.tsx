"use client";

import { Workflow, AlertTriangle, CheckCircle2, Clock, FileText, ArrowRight, Bell, History } from "lucide-react";
import { clsx } from "clsx";
import { useGedWorkflows, type WorkflowInstanceRow } from "@/hooks/useGedWorkflows";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function GedWorkflowsPage() {
  const { data, isLoading } = useGedWorkflows();

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Workflows de validation</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {data.kpis.inProgress} en cours · délai moyen {data.kpis.avgDelayDays} j · {data.kpis.completedYtd} finalisés YTD · {data.kpis.completionRate}% taux complétion
        </p>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi label="En cours" value={String(data.kpis.inProgress)} icon={<Workflow className="h-4 w-4 text-primary-600" />} />
        <Kpi label="Délai moyen" value={`${data.kpis.avgDelayDays} j`} icon={<Clock className="h-4 w-4 text-amber-600" />} hint="cible 5 j" />
        <Kpi label="En retard" value={String(data.kpis.overdue)} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} alert={data.kpis.overdue > 0} />
        <Kpi label="Tx complétion" value={`${data.kpis.completionRate}%`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
      </div>

      {data.critical && <CriticalWorkflowCard wf={data.critical} />}

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Tous les workflows en cours ({data.instances.length})
        </h2>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Réf</th>
                <th className="px-3 py-2 text-left">Document</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Étape actuelle</th>
                <th className="px-3 py-2 text-left">Initiateur</th>
                <th className="px-3 py-2 text-left">Échéance</th>
                <th className="px-3 py-2 text-left">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.instances.map((wf) => (
                <tr key={wf.id} className={clsx("hover:bg-surface-alt/40", wf.status === "OVERDUE" && "bg-rose-50/40")}>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-primary-700">{wf.reference}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink truncate max-w-[260px]">{wf.documentName}</div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{wf.templateCode}</td>
                  <td className="px-3 py-2 text-[12px] text-ink">
                    {wf.currentStepName}
                    <div className="text-[10.5px] text-ink-3">étape {wf.currentStepIndex + 1}/{wf.totalSteps}</div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">Christelle</td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(wf.dueAt)}</td>
                  <td className="px-3 py-2">
                    <span className={clsx(
                      "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                      wf.status === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {wf.status === "OVERDUE" ? "En retard" : "En cours"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <ul className="space-y-2 md:hidden">
          {data.instances.map((wf) => (
            <li key={wf.id} className={clsx(
              "rounded-xl border p-3",
              wf.status === "OVERDUE" ? "border-rose-200 bg-rose-50" : "border-line bg-white"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10.5px] text-primary-700">{wf.reference}</div>
                  <div className="text-[13px] font-semibold text-ink line-clamp-2">{wf.documentName}</div>
                  <div className="text-[11px] text-ink-3">{wf.templateCode} · étape {wf.currentStepIndex + 1}/{wf.totalSteps}</div>
                </div>
                <span className={clsx(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0",
                  wf.status === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                )}>
                  {wf.status === "OVERDUE" ? "Retard" : "En cours"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                <span>{wf.currentStepName}</span>
                <span>{fmtDate(wf.dueAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Templates de workflows</h2>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-white p-3">
              <div className="font-mono text-[10.5px] text-primary-700">{t.code}</div>
              <div className="text-[13px] font-semibold text-ink">{t.name}</div>
              <div className="mt-1 text-[11px] text-ink-3">{t.stepsCount} étape{t.stepsCount > 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, hint, alert }: { icon: React.ReactNode; label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-rose-200 bg-rose-50" : "border-line")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : "text-ink")}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

function CriticalWorkflowCard({ wf }: { wf: WorkflowInstanceRow }) {
  return (
    <article className="rounded-xl border-l-[4px] border-l-primary-500 border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary-700">
            ⏳ Workflow critique en cours
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-primary-700">{wf.reference}</div>
          <h3 className="text-[15px] font-bold text-ink">{wf.documentName}</h3>
          {wf.daysToDue !== null && (
            <p className="text-[12px] text-ink-3">
              Échéance dans <span className={clsx("font-semibold", wf.daysToDue < 0 ? "text-rose-700" : wf.daysToDue <= 2 ? "text-amber-700" : "text-ink")}>{Math.abs(wf.daysToDue)} j{wf.daysToDue < 0 ? " (retard)" : ""}</span>
              {" · "}status <span className="font-semibold">{wf.currentStepName}</span>
            </p>
          )}
        </div>
      </header>

      {/* Pipeline visuel */}
      <div className="mt-4">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {wf.pipeline.slice(0, 5).map((step, idx) => (
            <div key={step.stepIndex} className="flex flex-col items-center text-center">
              <span className={clsx(
                "grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold",
                step.status === "DONE" && "bg-emerald-500 text-white",
                step.status === "ACTIVE" && "bg-amber-500 text-white animate-pulse",
                step.status === "OVERDUE" && "bg-rose-500 text-white animate-pulse",
                step.status === "PENDING" && "bg-surface-alt text-ink-3"
              )}>
                {step.status === "DONE" ? <CheckCircle2 className="h-4 w-4" /> : step.status === "OVERDUE" ? <AlertTriangle className="h-4 w-4" /> : (idx + 1)}
              </span>
              <span className="mt-1 line-clamp-2 text-[10px] text-ink-2">{step.name}</span>
              <span className="text-[9px] text-ink-3">{step.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="inline-flex h-10 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-surface-alt">
          <FileText className="h-3.5 w-3.5" /> Voir document
        </button>
        <button type="button" className="inline-flex h-10 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12px] font-semibold text-white hover:bg-primary-600">
          <Bell className="h-3.5 w-3.5" /> Relancer {wf.currentStepRole}
        </button>
        <button type="button" className="inline-flex h-10 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-surface-alt">
          <History className="h-3.5 w-3.5" /> Historique commentaires
          <ArrowRight className="ml-1 h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
