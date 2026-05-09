"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMilestones } from "@/hooks/usePlanning";
import { MilestoneType } from "@prisma/client";
import { clsx } from "clsx";

const TYPE_DOT: Record<MilestoneType, string> = {
  SITE_START: "bg-primary-500",
  SITE_DELIVERY: "bg-success",
  MILESTONE: "bg-info",
  FINANCIAL: "bg-warning",
  COMMERCIAL: "bg-info/80",
  INTERNAL: "bg-ink-3",
};

export function CalendarView() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  const { data } = useMilestones({
    from: monthStart.toISOString().slice(0, 10),
    to: monthEnd.toISOString().slice(0, 10),
  });

  // Calculer les cases (toujours commencer un lundi)
  const startDay = (monthStart.getDay() + 6) % 7; // 0 = lundi
  const days: Array<Date | null> = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  const eventsByDay: Record<string, typeof data extends { items: infer T } ? T : never[]> = {};
  data?.items.forEach((m) => {
    const key = m.date.slice(0, 10);
    if (!eventsByDay[key]) eventsByDay[key] = [] as never;
    (eventsByDay[key] as unknown[]).push(m);
  });

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="grid h-8 w-8 place-items-center rounded border border-line bg-white hover:bg-surface-alt"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="rounded border border-line bg-white px-3 py-1 text-[12px] hover:bg-surface-alt"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="grid h-8 w-8 place-items-center rounded border border-line bg-white hover:bg-surface-alt"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="bg-surface-alt p-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={i} className="bg-white p-2 min-h-[80px]" />;
          const key = d.toISOString().slice(0, 10);
          const events = (eventsByDay[key] ?? []) as Array<{ id: string; title: string; type: MilestoneType }>;
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div key={i} className={clsx("bg-white p-2 min-h-[80px]", isToday && "ring-2 ring-primary-300")}>
              <div className={clsx("text-[11px] font-semibold", isToday ? "text-primary-700" : "text-ink-3")}>
                {d.getDate()}
              </div>
              <ul className="mt-1 space-y-0.5">
                {events.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-center gap-1 truncate text-[10.5px]">
                    <span className={clsx("h-1.5 w-1.5 flex-shrink-0 rounded-full", TYPE_DOT[e.type])} />
                    <span className="truncate text-ink">{e.title}</span>
                  </li>
                ))}
                {events.length > 3 && (
                  <li className="text-[10px] text-ink-3">+{events.length - 3} autres</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
