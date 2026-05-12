"use client";

import { useState } from "react";
import { Users, Package, AlertTriangle, Save, CheckCircle2, ClipboardCheck } from "lucide-react";
import { clsx } from "clsx";
import type { TeamStatus } from "@prisma/client";
import { useTodayPlan, useUpdateTeamAssignment, useValidatePlan, type DailyPlanTeamRow } from "@/hooks/useCdtPlan";

const STATUS_LABEL: Record<TeamStatus, string> = {
  ASSIGNED: "Affecté",
  PENDING_RESOURCES: "À démarrer",
  REINFORCEMENT_NEEDED: "Renfort demandé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

function statusBorder(s: TeamStatus): string {
  if (s === "ASSIGNED" || s === "IN_PROGRESS") return "border-l-primary-500";
  if (s === "PENDING_RESOURCES") return "border-l-amber-500";
  if (s === "REINFORCEMENT_NEEDED") return "border-l-rose-500";
  if (s === "COMPLETED") return "border-l-emerald-500";
  return "border-l-line";
}

function statusBadge(s: TeamStatus): string {
  if (s === "ASSIGNED" || s === "IN_PROGRESS") return "bg-primary-100 text-primary-800";
  if (s === "PENDING_RESOURCES") return "bg-amber-100 text-amber-800";
  if (s === "REINFORCEMENT_NEEDED") return "bg-rose-100 text-rose-800";
  if (s === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  return "bg-surface-alt text-ink-3";
}

export default function CdtPlanPage() {
  const { data, isLoading } = useTodayPlan();
  const validate = useValidatePlan(data?.id ?? null);
  const [confirmValidate, setConfirmValidate] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
    );
  }

  const allReady = data.teams.every((t) => t.status !== "PENDING_RESOURCES" && t.status !== "REINFORCEMENT_NEEDED");

  return (
    <div className="space-y-3 pb-32">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Plan du jour</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {data.teams.length} équipes · revue avec J. KAMGA à 7h45 · statut{" "}
          <span className={clsx("font-semibold", data.status === "VALIDATED" ? "text-emerald-700" : "text-amber-700")}>
            {data.status === "VALIDATED" ? "Validé" : "Brouillon"}
          </span>
        </p>
      </header>

      <div className="space-y-2">
        {data.teams.map((t) => (
          <TeamCard key={t.id} planId={data.id} team={t} />
        ))}
      </div>

      {/* CTA sticky bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:relative sm:rounded-xl sm:border sm:border-line">
        <button
          type="button"
          disabled={data.status === "VALIDATED" || validate.isPending}
          onClick={() => setConfirmValidate(true)}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {data.status === "VALIDATED" ? (
            <>
              <CheckCircle2 className="h-5 w-5" /> Plan validé
            </>
          ) : (
            <>
              <ClipboardCheck className="h-5 w-5" /> Valider le plan du jour
            </>
          )}
        </button>
        {!allReady && data.status !== "VALIDATED" && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {data.teams.filter((t) => t.status === "REINFORCEMENT_NEEDED").length > 0 && "Équipe(s) en sous-effectif · "}
            {data.teams.filter((t) => t.status === "PENDING_RESOURCES").length > 0 && "Ressources à confirmer · "}
            Vous pouvez tout de même valider.
          </p>
        )}
      </div>

      {confirmValidate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={() => setConfirmValidate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink">Valider le plan du jour</h3>
            <p className="mt-2 text-[12.5px] text-ink-3">
              Notification équipes ({data.teams.length} chefs d'équipe) + DTrav (Paul ETOUNDI) + Magasinier (Lucas) pour préparation matières.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmValidate(false)} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">
                Annuler
              </button>
              <button
                type="button"
                disabled={validate.isPending}
                onClick={() => validate.mutate(undefined, { onSuccess: () => setConfirmValidate(false) })}
                className="h-9 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {validate.isPending ? "..." : "Valider et notifier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ planId, team }: { planId: string; team: DailyPlanTeamRow }) {
  const [mainTask, setMainTask] = useState(team.mainTask);
  const [objective, setObjective] = useState(team.objective ?? "");
  const [status, setStatus] = useState<TeamStatus>(team.status);
  const update = useUpdateTeamAssignment(planId);
  const dirty = mainTask !== team.mainTask || objective !== (team.objective ?? "") || status !== team.status;

  const save = () => {
    update.mutate({ teamId: team.teamId, mainTask, objective, status });
  };

  return (
    <article className={clsx("rounded-xl border-l-[4px] border border-line bg-white p-3", statusBorder(status))}>
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-white">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-bold text-ink">{team.teamName}</h3>
            <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusBadge(status))}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="text-[11.5px] text-ink-3">
            Chef équipe · {team.teamHeadcountTarget} ouvriers · {team.teamSpecialty}
          </p>
        </div>
      </header>

      <div className="my-3 border-t border-line" />

      <div className="space-y-2.5">
        <label className="block">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Tâche principale</div>
          <input
            type="text"
            value={mainTask}
            onChange={(e) => setMainTask(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px] focus:border-primary-500 focus:outline-none"
            placeholder="ex. Coffrage culée Nord"
          />
        </label>
        <label className="block">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Objectif chiffré</div>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px] focus:border-primary-500 focus:outline-none"
            placeholder="ex. 14 m²"
          />
        </label>
        <label className="block">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Statut</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TeamStatus)}
            className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
          >
            {(Object.keys(STATUS_LABEL) as TeamStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </div>

      {team.materialsNeeded.length > 0 && (
        <div className="mt-3 rounded-md border border-line bg-surface-alt p-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
            <Package className="h-3 w-3" /> Matières à sortir au magasin
          </div>
          <ul className="mt-1 space-y-0.5 text-[12px]">
            {team.materialsNeeded.map((m, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-ink">{m.article}</span>
                <span className="font-mono font-semibold text-ink">{m.quantity} {m.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dirty && (
        <button
          type="button"
          disabled={update.isPending}
          onClick={save}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-3 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {update.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      )}
    </article>
  );
}
