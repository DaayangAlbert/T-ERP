"use client";

import { useState } from "react";
import { Clock, Coffee, AlertTriangle, CheckCircle2, X, Save, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useTimeToday, useCurrentMonth, useContestTimeReport, type MonthDay } from "@/hooks/useEmpTimeReport";

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "En poste",
  ABSENT_JUSTIFIED: "Absence justifiée",
  ABSENT_UNJUSTIFIED: "Absence non justifiée",
  HOLIDAY: "Jour férié",
  LEAVE: "Congé",
  SICK: "Maladie",
};

function fmtDay(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" });
}

function fmtTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function startOfISOWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function EmpPointagePage() {
  const today = useTimeToday();
  const month = useCurrentMonth();
  const [contestDay, setContestDay] = useState<MonthDay | null>(null);

  if (today.isLoading || month.isLoading || !month.data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const data = month.data;
  const weekStart = startOfISOWeek(new Date());
  const weekDays = data.days.filter((d) => {
    const date = new Date(d.date);
    const diff = (date.getTime() - weekStart.getTime()) / 86400000;
    return diff >= 0 && diff < 5;
  });
  const weekNumber = getIsoWeek(new Date());

  return (
    <div className="space-y-3 pb-20">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Mon temps de travail</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {data.monthLabel} (jour {data.currentDay} / {data.totalDays}) · pointé par <span className="font-semibold text-ink">{data.pointerName}</span>
          {data.lastSyncAt && <> · synchro {fmtTime(data.lastSyncAt)}</>}
        </p>
      </header>

      {/* Card aujourd'hui */}
      {today.data?.hasReport && (
        <article className="rounded-xl border-l-[4px] border-l-emerald-500 border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-emerald-700">
            <Clock className="h-3.5 w-3.5" /> Aujourd&apos;hui
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div>
              <div className="text-[15px] font-bold text-ink">⏰ Pointé présent à {today.data.arrivalLabel}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">Par {today.data.pointerName ?? "—"}</div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              {STATUS_LABEL[today.data.status] ?? today.data.status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white/60 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-ink-3">Arrivée</div>
              <div className="font-mono text-[14px] font-bold text-ink">{today.data.arrivalLabel}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-3">
                <Coffee className="h-2.5 w-2.5" /> Pause prévue
              </div>
              <div className="font-mono text-[14px] font-bold text-ink">12:00 · 1h</div>
            </div>
          </div>
        </article>
      )}

      {/* KPIs mois */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Heures travaillées" value={`${data.kpis.totalHours} h`} hint={data.monthLabel} />
        <Kpi label="Heures sup" value={`${data.kpis.overtimeHours} h`} hint="majoration 125-200%" highlight={data.kpis.overtimeHours > 0} />
        <Kpi label="Retards" value={String(data.kpis.lates)} hint="arrivées > 7h" alert={data.kpis.lates > 0} />
        <Kpi label="Absences" value={`${data.kpis.absences} j`} hint="non justifiées" alert={data.kpis.absences > 0} />
      </div>

      {/* Semaine */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Cette semaine (semaine {weekNumber})
        </h2>
        {weekDays.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-alt p-4 text-center text-[12.5px] text-ink-3">
            Pas encore de pointage cette semaine.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {weekDays.map((d) => {
              const isToday = new Date(d.date).toDateString() === new Date().toDateString();
              return (
                <li
                  key={d.id}
                  className={clsx(
                    "flex min-h-[68px] items-center gap-2.5 rounded-xl border p-3",
                    isToday ? "border-primary-200 bg-primary-50/40" : "border-line bg-white",
                  )}
                >
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-md bg-surface-alt font-mono text-[11px] uppercase font-bold text-ink">
                    {fmtDay(d.date).split(" ")[0]}
                    <span className="text-[14px]">{new Date(d.date).getDate()}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {fmtTime(d.arrivalTime)} → {fmtTime(d.departureTime)}
                      {d.contested && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[9.5px] font-bold text-amber-800">Contesté</span>
                      )}
                      {isToday && !d.departureTime && (
                        <span className="rounded bg-primary-100 px-1 py-0.5 text-[9.5px] font-bold text-primary-800">En cours</span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-3">
                      {d.totalHours} h{" "}
                      {d.overtimeHours > 0 && (
                        <span className="font-semibold text-emerald-700">
                          (+{d.overtimeHours}h sup{d.overtimeType ? ` ${d.overtimeType}` : ""})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContestDay(d)}
                    disabled={d.contested}
                    className="inline-flex min-h-[48px] items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink-3 hover:bg-surface-alt disabled:opacity-40"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Signaler
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* CTA contester globalement */}
      <section className="rounded-xl border-l-[4px] border-l-amber-500 border border-amber-200 bg-amber-50 p-3">
        <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5" /> Vous constatez un désaccord ?
        </h3>
        <p className="mt-1 text-[11.5px] text-amber-800">
          Vous pouvez signaler un désaccord sur un pointage des 48 dernières heures. Sélectionnez la ligne concernée et tapez « Signaler ».
        </p>
      </section>

      {contestDay && <ContestDialog day={contestDay} onClose={() => setContestDay(null)} />}
    </div>
  );
}

function Kpi({ label, value, hint, alert, highlight }: { label: string; value: string; hint: string; alert?: boolean; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-rose-200 bg-rose-50" : highlight ? "border-emerald-200 bg-emerald-50" : "border-line")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : highlight ? "text-emerald-700" : "text-ink")}>
        {value}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>
    </div>
  );
}

function ContestDialog({ day, onClose }: { day: MonthDay; onClose: () => void }) {
  const [kind, setKind] = useState("DEPARTURE_INCORRECT");
  const [expectedTime, setExpectedTime] = useState("");
  const [reason, setReason] = useState("");
  const contest = useContestTimeReport();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Signaler un désaccord — {new Date(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "short" })}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-2.5">
          <div className="rounded-md bg-surface-alt p-2 text-[11.5px] text-ink-3">
            <Calendar className="mr-1 inline h-3 w-3" /> Pointage actuel : {fmtTime(day.arrivalTime)} → {fmtTime(day.departureTime)} · {day.totalHours} h
          </div>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Type de désaccord</div>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]">
              <option value="ARRIVAL_INCORRECT">Arrivée incorrecte</option>
              <option value="DEPARTURE_INCORRECT">Départ incorrect</option>
              <option value="OVERTIME_MISSING">Heures sup non comptées</option>
              <option value="ABSENCE_WRONG">Absence injustifiée erronée</option>
            </select>
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Heure réelle selon vous</div>
            <input
              type="time"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 font-mono text-[16px]"
            />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Justification (témoin, doc...)</div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]"
              placeholder="Ex. Marcel TANG était présent jusqu'à 17h30 — j'ai chargé du matériel zone B"
            />
          </label>
          {contest.isError && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {(contest.error as Error).message}
            </div>
          )}
          <button
            type="button"
            disabled={contest.isPending || !reason.trim() || !expectedTime}
            onClick={() => contest.mutate({ id: day.id, kind, expectedTime, reason }, { onSuccess: onClose })}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-3 text-[14px] font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {contest.isPending ? "Envoi..." : (
              <>
                <Save className="h-5 w-5" /> Signaler à mon chef
              </>
            )}
          </button>
          <p className="text-[11px] text-ink-3">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />
            Notification envoyée à votre chef de chantier. Délai max 48 h pour signaler.
          </p>
        </div>
      </div>
    </div>
  );
}
