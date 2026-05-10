"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";
import { clsx } from "clsx";

interface Props {
  alerts: DtDashboardResponse["alerts"];
}

const SEVERITY_CLASSES: Record<string, string> = {
  high: "border-l-rose-500 bg-rose-50/60",
  medium: "border-l-amber-500 bg-amber-50/60",
  low: "border-l-blue-500 bg-blue-50/60",
};

const SEVERITY_TEXT: Record<string, string> = {
  high: "text-rose-700",
  medium: "text-amber-700",
  low: "text-blue-700",
};

export function DtAlertsList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-3 text-[12.5px] text-emerald-700">
        Aucune alerte technique en cours. Tous les chantiers sont dans les seuils.
      </div>
    );
  }

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          Alertes techniques
        </h2>
        <span className="text-[11px] text-ink-3">{alerts.length} alerte(s)</span>
      </header>
      <div className="flex flex-col gap-1.5">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={clsx(
              "flex flex-col gap-2 rounded-lg border border-line border-l-[4px] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
              SEVERITY_CLASSES[a.severity]
            )}
          >
            <AlertTriangle
              className={clsx("h-4 w-4 flex-shrink-0", SEVERITY_TEXT[a.severity])}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{a.title}</div>
              {a.details && <div className="text-[11.5px] text-ink-3">{a.details}</div>}
            </div>
            {a.link && (
              <Link
                href={a.link}
                className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-line-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:border-primary-300 sm:w-auto"
              >
                Drill-down <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
