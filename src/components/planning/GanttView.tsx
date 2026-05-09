"use client";

import Link from "next/link";
import { useGantt } from "@/hooks/usePlanning";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-success",
  AT_RISK: "bg-warning",
  DRIFTING: "bg-danger",
  PLANNED: "bg-info",
  ON_HOLD: "bg-ink-3",
  COMPLETED: "bg-primary-700",
};

export function GanttView() {
  const { data, isLoading } = useGantt();

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }
  if (data.items.length === 0) {
    return <div className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">Aucun chantier à afficher.</div>;
  }

  // Calcul des bornes : 6 mois autour d'aujourd'hui
  const now = Date.now();
  const minDate = now - 90 * 86_400_000;
  const maxDate = now + 270 * 86_400_000;
  const span = maxDate - minDate;

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(minDate);
    d.setMonth(d.getMonth() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
      <div className="min-w-[1080px]">
        {/* En-tête mois */}
        <div className="grid grid-cols-[200px_1fr] border-b border-line bg-surface-alt">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Chantier</div>
          <div className="grid grid-cols-12 border-l border-line">
            {months.map((m, i) => (
              <div key={i} className="px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-3 border-r border-line last:border-r-0">
                {m.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
              </div>
            ))}
          </div>
        </div>

        {/* Lignes chantiers */}
        {data.items.map((s) => {
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          const left = Math.max(0, ((start - minDate) / span) * 100);
          const right = Math.max(0, ((maxDate - end) / span) * 100);
          const width = Math.max(2, 100 - left - right);
          return (
            <div key={s.id} className="grid grid-cols-[200px_1fr] border-b border-line last:border-0 hover:bg-surface-alt">
              <Link href={`/chantiers/${s.id}`} className="px-3 py-2 text-[12.5px]">
                <div className="font-medium text-ink hover:text-primary-700">{s.name}</div>
                <div className="font-mono text-[10.5px] text-ink-3">{s.code}</div>
              </Link>
              <div className="relative border-l border-line" style={{ minHeight: 48 }}>
                {/* Quadrillage mensuel */}
                {months.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-line/60"
                    style={{ left: `${(i / 12) * 100}%`, width: `${100 / 12}%` }}
                  />
                ))}
                {/* Barre Gantt */}
                <div
                  className={clsx(
                    "absolute top-1/2 h-5 -translate-y-1/2 rounded text-white shadow-sm",
                    STATUS_COLOR[s.status] ?? "bg-ink-3"
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${formatDate(s.startDate)} → ${formatDate(s.endDate)} · ${s.progress}%`}
                >
                  <div
                    className="h-full rounded-l bg-white/30"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
