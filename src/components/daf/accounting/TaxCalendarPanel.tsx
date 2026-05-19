"use client";

import { CalendarClock, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";
import { useTaxCalendar, type TaxCalendarItem } from "@/hooks/useDafAccounting";
import { formatDate, formatFCFA } from "@/lib/format";

function urgencyClasses(item: TaxCalendarItem): string {
  if (item.overdue) return "border-danger/30 bg-danger/5";
  if (item.daysUntil <= 7) return "border-warning/30 bg-warning/5";
  return "border-line bg-white";
}

function urgencyLabel(item: TaxCalendarItem): { text: string; cls: string } {
  if (item.overdue) return { text: `Retard ${Math.abs(item.daysUntil)} j`, cls: "bg-danger text-white" };
  if (item.daysUntil <= 7) return { text: `J-${item.daysUntil}`, cls: "bg-warning text-white" };
  return { text: `J-${item.daysUntil}`, cls: "bg-info/15 text-info" };
}

export function TaxCalendarPanel() {
  const { data, isLoading } = useTaxCalendar();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
          Échéances fiscales — 45 j à venir
        </h3>
        <div className="flex items-center gap-2 text-[11px]">
          {data.summary.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 font-semibold text-danger">
              <AlertOctagon className="h-3 w-3" /> {data.summary.overdueCount} en retard
            </span>
          )}
          {data.summary.next7Days > 0 && (
            <span className="rounded bg-warning/10 px-1.5 py-0.5 font-semibold text-warning">
              {data.summary.next7Days} sous 7 j
            </span>
          )}
        </div>
      </header>

      {data.items.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-ink-3">
          Aucune échéance dans les 45 prochains jours.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((d) => {
            const urgency = urgencyLabel(d);
            return (
              <li
                key={d.id}
                className={clsx(
                  "flex items-center gap-3 rounded-md border px-3 py-2 text-[12.5px]",
                  urgencyClasses(d)
                )}
              >
                <span className={clsx("flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", urgency.cls)}>
                  {urgency.text}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">
                    {d.typeLabel}
                    <span className="ml-1 text-[11px] font-normal text-ink-3">· {d.authorityLabel} · période {d.period}</span>
                  </div>
                  <div className="text-[11px] text-ink-3">
                    Échéance {formatDate(d.dueDate, "dd/MM/yyyy")}
                  </div>
                </div>
                {d.amount && (
                  <span className="flex-shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-ink">
                    {formatFCFA(BigInt(d.amount))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
