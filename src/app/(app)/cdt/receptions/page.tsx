"use client";

import { useState } from "react";
import { ClipboardCheck, CalendarClock, AlertOctagon, CheckCircle2, ChevronDown, ChevronUp, FolderOpen, FileText } from "lucide-react";
import { clsx } from "clsx";
import type { CdtMilestoneStatus } from "@prisma/client";
import { useMilestones, useToggleDeliverable, type MilestoneItem } from "@/hooks/useCdtMilestones";

const STATUS_LABEL: Record<CdtMilestoneStatus, string> = {
  UPCOMING: "À venir",
  IN_PREPARATION: "En préparation",
  READY_FOR_RECEPTION: "Prêt réception",
  REACHED: "Atteint",
  MISSED: "Manqué",
};

function statusClasses(s: CdtMilestoneStatus): string {
  if (s === "REACHED") return "bg-emerald-100 text-emerald-800";
  if (s === "READY_FOR_RECEPTION") return "bg-blue-100 text-blue-800";
  if (s === "IN_PREPARATION") return "bg-amber-100 text-amber-800";
  if (s === "MISSED") return "bg-rose-100 text-rose-800";
  return "bg-surface-alt text-ink-3";
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CdtReceptionsPage() {
  const { data, isLoading } = useMilestones();

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-20 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const nextMilestone = data.items.find((m) => m.status !== "REACHED");

  return (
    <div className="space-y-3 pb-20">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Réceptions techniques</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Jalons MOA · {data.kpis.total} jalons · {data.kpis.reached} atteints · prochain dans{" "}
          <span className="font-semibold text-ink">{data.kpis.daysToNext ?? "—"} jours</span>
        </p>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Jalons atteints" value={`${data.kpis.reached}/${data.kpis.total}`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
        <Kpi label="Prochain jalon" value={data.kpis.nextCode ?? "—"} icon={<CalendarClock className="h-4 w-4 text-primary-600" />} />
        <Kpi label="Délai vs contrat" value={data.kpis.onTime ? "À temps" : "En retard"} icon={<ClipboardCheck className="h-4 w-4 text-amber-600" />} alert={!data.kpis.onTime} />
        <Kpi label="Réserves ouvertes" value={String(data.kpis.openReservations)} icon={<AlertOctagon className="h-4 w-4 text-rose-600" />} alert={data.kpis.openReservations > 0} />
      </div>

      {/* Card prochain jalon */}
      {nextMilestone && <NextMilestoneCard milestone={nextMilestone} />}

      {/* Liste tous les jalons */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Tous les jalons contractuels</h2>
        <ul className="space-y-2">
          {data.items.map((m) => (
            <MilestoneCard key={m.id} milestone={m} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-rose-200 bg-rose-50" : "border-line")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function NextMilestoneCard({ milestone }: { milestone: MilestoneItem }) {
  const [open, setOpen] = useState(true);
  const toggle = useToggleDeliverable();
  const daysToNext = Math.ceil((new Date(milestone.contractDate).getTime() - Date.now()) / 86_400_000);
  const remaining = milestone.deliverables.filter((d) => !d.done).length;
  const total = milestone.deliverables.length;

  return (
    <article className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-3">
      <header className="flex items-start gap-3">
        <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-amber-500 text-white">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
            ⏳ Prochain jalon · {milestone.code} dans {daysToNext} jours
          </div>
          <h3 className="text-[15px] font-bold text-ink">{milestone.designation}</h3>
          <p className="text-[11.5px] text-ink-3">
            Contractuel : {fmtDate(milestone.contractDate)} · préparation {milestone.preparation}%
          </p>
        </div>
      </header>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full bg-amber-500" style={{ width: `${milestone.preparation}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen((p) => !p)} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Checklist préparation
        </button>
        <button type="button" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt">
          <FolderOpen className="h-3.5 w-3.5" /> DOE en cours
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-md border border-line bg-white p-2">
          <p className="mb-2 text-[11px] text-ink-3">
            {milestone.deliverables.length - remaining}/{total} livrables préparés · {remaining} restants
          </p>
          <ul className="space-y-1.5">
            {milestone.deliverables.map((d) => (
              <li key={d.key} className="flex min-h-[44px] items-center gap-3 rounded-md px-2 py-1 hover:bg-surface-alt">
                <input
                  type="checkbox"
                  checked={d.done}
                  onChange={() => toggle.mutate({ milestoneId: milestone.id, key: d.key, done: !d.done })}
                  className="h-6 w-6 flex-shrink-0 accent-emerald-600"
                />
                <span className={clsx("flex-1 text-[12.5px]", d.done ? "line-through text-ink-3" : "text-ink")}>
                  {d.label}
                </span>
                {d.done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function MilestoneCard({ milestone }: { milestone: MilestoneItem }) {
  return (
    <li className={clsx(
      "rounded-xl border bg-white p-3",
      milestone.status === "REACHED" && "border-emerald-200 bg-emerald-50",
      milestone.status === "IN_PREPARATION" && "border-amber-200 bg-amber-50",
      milestone.status === "READY_FOR_RECEPTION" && "border-blue-200 bg-blue-50",
      (milestone.status === "UPCOMING" || milestone.status === "MISSED") && "border-line",
    )}>
      <div className="flex items-start gap-3">
        <span className={clsx(
          "grid h-11 w-11 flex-shrink-0 place-items-center rounded-md font-mono text-[14px] font-bold text-white",
          milestone.status === "REACHED" && "bg-emerald-500",
          milestone.status === "IN_PREPARATION" && "bg-amber-500",
          milestone.status === "READY_FOR_RECEPTION" && "bg-blue-500",
          milestone.status === "UPCOMING" && "bg-ink-3",
          milestone.status === "MISSED" && "bg-rose-500",
        )}>
          {milestone.code}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-ink">{milestone.designation}</h3>
          <p className="text-[11px] text-ink-3">
            {milestone.actualDate ? `Atteint le ${fmtDate(milestone.actualDate)}` : `Échéance ${fmtDate(milestone.contractDate)}`}
          </p>
          {milestone.preparation > 0 && milestone.preparation < 100 && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-amber-500" style={{ width: `${milestone.preparation}%` }} />
            </div>
          )}
        </div>
        <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-bold flex-shrink-0", statusClasses(milestone.status))}>
          {STATUS_LABEL[milestone.status]}
        </span>
      </div>
      {milestone.reservations > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-800">
          <AlertOctagon className="h-3 w-3" />
          {milestone.reservations} réserve{milestone.reservations > 1 ? "s" : ""}
        </div>
      )}
    </li>
  );
}
