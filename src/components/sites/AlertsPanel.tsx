"use client";

import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { useSiteAlerts } from "@/hooks/useSites";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

const ICONS = {
  CRITICAL: <AlertOctagon className="h-4 w-4" />,
  HIGH: <AlertTriangle className="h-4 w-4" />,
  MEDIUM: <AlertTriangle className="h-4 w-4" />,
  LOW: <Info className="h-4 w-4" />,
};

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "border-danger/40 bg-danger/5 text-danger",
  HIGH: "border-warning/40 bg-warning/5 text-warning",
  MEDIUM: "border-info/30 bg-info/5 text-info",
  LOW: "border-line bg-surface-alt text-ink-3",
};

export function AlertsPanel({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSiteAlerts(siteId);

  if (isLoading) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        ✓ Aucune alerte sur ce chantier.
      </div>
    );
  }

  const open = data.items.filter((a) => !a.resolved);
  const closed = data.items.filter((a) => a.resolved);

  return (
    <div className="space-y-3">
      {open.length > 0 && (
        <ul className="space-y-2">
          {open.map((a) => (
            <li
              key={a.id}
              className={clsx("flex items-start gap-3 rounded-lg border p-3", SEVERITY_STYLE[a.severity])}
            >
              <span className="mt-0.5">{ICONS[a.severity as keyof typeof ICONS]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider">
                  <span>{a.severity}</span>
                  <span className="text-ink-3">·</span>
                  <span>{a.type.replace(/_/g, " ")}</span>
                </div>
                <p className="mt-1 text-[13px] text-ink-2">{a.message}</p>
                <div className="mt-1 text-[10.5px] text-ink-3">
                  Détectée le {formatDate(a.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <details className="rounded-lg border border-line bg-white p-3 text-[12.5px]">
          <summary className="cursor-pointer text-ink-3">
            {closed.length} alerte{closed.length > 1 ? "s" : ""} résolue{closed.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {closed.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-[12px]">
                <span className="text-ink-2 line-through">{a.message}</span>
                <span className="text-[10.5px] text-ink-3">{formatDate(a.resolvedAt ?? a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
