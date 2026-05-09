"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { DashboardAlert, AlertSeverity } from "@/hooks/useDashboardDg";

interface Props {
  alerts: DashboardAlert[];
}

const SEVERITY_BG: Record<AlertSeverity, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

export function AlertsList({ alerts }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Alertes système</h3>
        <span className="text-[11px] text-ink-3">Temps réel</span>
      </header>
      {alerts.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-3">Aucune alerte active.</p>
      ) : (
        <ul>
          {alerts.map((a, i) => (
            <li
              key={a.id}
              className={clsx(
                "flex gap-2.5 px-4 py-2.5",
                i < alerts.length - 1 && "border-b border-line"
              )}
            >
              <div className={clsx("w-1.5 flex-shrink-0 rounded-md", SEVERITY_BG[a.severity])} />
              <div className="min-w-0 flex-1">
                <Link
                  href={a.link}
                  className="block truncate text-sm font-semibold text-ink hover:text-primary-700"
                >
                  {a.title}
                </Link>
                <p className="truncate text-[11.5px] text-ink-3">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
