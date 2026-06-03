"use client";

import { useState } from "react";
import { Workflow, AlertTriangle, CheckCircle2, Clock, FileText, Bell, History, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useGedWorkflows, useEscalateWorkflow, type WorkflowInstanceRow } from "@/hooks/useGedWorkflows";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { WorkflowPipelineVisual } from "@/components/ged/workflows/WorkflowPipelineVisual";
import { WorkflowDetailDrawer } from "@/components/ged/workflows/WorkflowDetailDrawer";
import { WorkflowTemplatesSection } from "@/components/ged/workflows/WorkflowTemplatesSection";
import { PageHelp } from "@/components/help/PageHelp";
import { GedWorkflowsTutorial } from "@/components/help/tutorials/GedWorkflowsTutorial";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function GedWorkflowsPage() {
  const { user } = useAuth();
  const canEdit = useAccess(MODULES.GED).canEdit;
  const { data, isLoading } = useGedWorkflows();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Workflows de validation</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data.kpis.inProgress} en cours · délai moyen {data.kpis.avgDelayDays} j · {data.kpis.completedYtd} finalisés YTD ·{" "}
            {data.kpis.completionRate}% taux complétion
          </p>
        </div>
        <PageHelp title="Aide — Workflows GED"><GedWorkflowsTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="En cours" value={String(data.kpis.inProgress)} icon={<Workflow className="h-4 w-4 text-violet-600" />} />
        <Kpi
          label="Délai moyen"
          value={`${data.kpis.avgDelayDays} j`}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          hint="cible 5 j"
        />
        <Kpi
          label="En retard"
          value={String(data.kpis.overdue)}
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          alert={data.kpis.overdue > 0}
        />
        <Kpi
          label="Tx complétion"
          value={`${data.kpis.completionRate}%`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      {data.critical && (
        <CriticalWorkflowCard wf={data.critical} onOpen={() => setOpenId(data.critical!.id)} />
      )}

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
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.instances.map((wf) => (
                <tr
                  key={wf.id}
                  className={clsx(
                    "cursor-pointer hover:bg-surface-alt/40",
                    wf.status === "OVERDUE" && "bg-rose-50/40",
                  )}
                  onClick={() => setOpenId(wf.id)}
                >
                  <td className="px-3 py-2 font-mono text-[11.5px] text-violet-700">{wf.reference}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[260px] truncate font-medium text-ink">{wf.documentName}</div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{wf.templateCode}</td>
                  <td className="px-3 py-2 text-[12px] text-ink">
                    {wf.currentStepName}
                    <div className="text-[10.5px] text-ink-3">
                      étape {wf.currentStepIndex + 1}/{wf.totalSteps}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{wf.initiatorName}</td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(wf.dueAt)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                        wf.status === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {wf.status === "OVERDUE" ? "En retard" : "En cours"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-ink-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <ul className="space-y-2 md:hidden">
          {data.instances.map((wf) => (
            <li key={wf.id}>
              <button
                type="button"
                onClick={() => setOpenId(wf.id)}
                className={clsx(
                  "w-full rounded-xl border p-3 text-left",
                  wf.status === "OVERDUE" ? "border-rose-200 bg-rose-50" : "border-line bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10.5px] text-violet-700">{wf.reference}</div>
                    <div className="line-clamp-2 text-[13px] font-semibold text-ink">{wf.documentName}</div>
                    <div className="text-[11px] text-ink-3">
                      {wf.templateCode} · étape {wf.currentStepIndex + 1}/{wf.totalSteps}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      wf.status === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {wf.status === "OVERDUE" ? "Retard" : "En cours"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                  <span>{wf.currentStepName}</span>
                  <span>{fmtDate(wf.dueAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <WorkflowTemplatesSection canEdit={canEdit} />

      <WorkflowDetailDrawer
        workflowId={openId}
        userRole={user?.role ?? ""}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white p-3 shadow-card min-w-0",
        alert ? "border-rose-200 bg-rose-50" : "border-line",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : "text-ink")}>
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

function CriticalWorkflowCard({ wf, onOpen }: { wf: WorkflowInstanceRow; onOpen: () => void }) {
  const escalate = useEscalateWorkflow(wf.id);
  const [feedback, setFeedback] = useState<string | null>(null);
  return (
    <article className="rounded-xl border border-violet-200 border-l-[4px] border-l-violet-500 bg-gradient-to-br from-violet-50 to-white p-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-violet-700">
            ⏳ Workflow critique en cours
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-violet-700">{wf.reference}</div>
          <h3 className="text-[15px] font-bold text-ink">{wf.documentName}</h3>
          {wf.daysToDue !== null && (
            <p className="text-[12px] text-ink-3">
              Échéance dans{" "}
              <span
                className={clsx(
                  "font-semibold",
                  wf.daysToDue < 0 ? "text-rose-700" : wf.daysToDue <= 2 ? "text-amber-700" : "text-ink",
                )}
              >
                {Math.abs(wf.daysToDue)} j{wf.daysToDue < 0 ? " (retard)" : ""}
              </span>
              {" · "}
              statut <span className="font-semibold">{wf.currentStepName}</span>
            </p>
          )}
        </div>
      </header>

      <div className="mt-4">
        <WorkflowPipelineVisual steps={wf.pipeline} />
      </div>

      {feedback && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-surface-alt"
        >
          <FileText className="h-3.5 w-3.5" /> Voir le détail
        </button>
        <button
          type="button"
          disabled={escalate.isPending}
          onClick={() => {
            setFeedback(null);
            escalate.mutate(
              { message: `Relance manuelle sur ${wf.reference}` },
              {
                onSuccess: (r) =>
                  setFeedback(
                    r.notifiedUserName
                      ? `Relance envoyée à ${r.notifiedUserName}.`
                      : "Relance enregistrée.",
                  ),
              },
            );
          }}
          className="inline-flex h-10 items-center gap-1 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Bell className="h-3.5 w-3.5" /> {escalate.isPending ? "Envoi…" : `Relancer ${wf.currentStepRole}`}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-surface-alt"
        >
          <History className="h-3.5 w-3.5" /> Historique commentaires
        </button>
      </div>
    </article>
  );
}
