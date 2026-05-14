"use client";

import type { ClockWeekDay, ClockWeekResponse } from "@/hooks/useOuvClock";

interface Props {
  week: ClockWeekResponse | undefined;
  isLoading: boolean;
}

// Liste compacte des 5-7 derniers jours pointés de la semaine en cours.
// Mirror direct du bloc "Cette semaine · semaine N" du prototype.
// Aujourd'hui mis en surbrillance violet, jours pointés en vert, à venir en gris.
export function WeeklyHistoryList({ week, isLoading }: Props) {
  if (isLoading || !week) {
    return (
      <section className="mb-3.5">
        <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Cette semaine</h3>
        <div className="space-y-1 overflow-hidden rounded-xl border border-slate-100 bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[60px] animate-pulse bg-slate-50" />
          ))}
        </div>
      </section>
    );
  }

  // On affiche les 5 jours ouvrés de la semaine (lun-ven)
  const start = new Date(week.weekStart);
  const today = startOfDayUtc(new Date());
  const days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString();
    const matchingDay = week.days.find(
      (x) => new Date(x.date).toUTCString() === d.toUTCString()
    );
    const isToday = startOfDayUtc(d).getTime() === today.getTime();
    return { date: d, iso, day: matchingDay, isToday };
  });

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">
        Cette semaine · semaine {week.weekNumber}
      </h3>
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        {days.map((d, idx) => (
          <DayRow
            key={d.iso}
            date={d.date}
            day={d.day}
            isToday={d.isToday}
            isLast={idx === days.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function DayRow({
  date,
  day,
  isToday,
  isLast,
}: {
  date: Date;
  day: ClockWeekDay | undefined;
  isToday: boolean;
  isLast: boolean;
}) {
  const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayNum = date.getUTCDate();
  const initial = weekday.charAt(0).toUpperCase();
  const future = !day && !isToday && date.getTime() > Date.now();
  const past = !day && !isToday && date.getTime() < Date.now();

  return (
    <div
      className={`flex min-h-[60px] items-center gap-3 px-4 py-3.5 ${
        isToday ? "bg-purple-50" : "bg-white"
      } ${!isLast ? "border-b border-slate-100" : ""}`}
    >
      <span
        className={`grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-lg text-[14px] font-extrabold ${
          isToday
            ? "bg-purple-500 text-white"
            : day
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-50 text-slate-400"
        }`}
      >
        {initial} {dayNum}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-slate-900">
          {capitalize(weekday)} {dayNum} {date.toLocaleDateString("fr-FR", { month: "long" })}
          {isToday && " · aujourd'hui"}
        </p>
        <p className="truncate text-[12px] text-slate-500">
          {day
            ? formatRange(day.arrivalTime, day.departureTime)
            : isToday
              ? "Pas encore pointé"
              : future
                ? "À venir"
                : past
                  ? "Pas pointé"
                  : "—"}
        </p>
      </div>
      {day ? (
        <div className="text-right">
          <p className="text-[16px] font-extrabold text-slate-900">
            {day.totalHours.toFixed(1)} h
          </p>
          {day.overtimeHours > 0 ? (
            <p className="text-[11px] font-bold text-emerald-600">
              +{day.overtimeHours.toFixed(1)}h sup
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">standard</p>
          )}
        </div>
      ) : isToday ? (
        <span className="rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-bold text-white">
          À pointer
        </span>
      ) : (
        <span className="text-[11px] text-slate-400">—</span>
      )}
    </div>
  );
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRange(arr: string | null, dep: string | null): string {
  const a = arr ? new Date(arr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const d = dep ? new Date(dep).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "en cours";
  return `${a} → ${d} · pause 1h`;
}
