"use client";

import { useState } from "react";
import { Activity, Download } from "lucide-react";
import { useActivity } from "@/hooks/useDgProfile";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

export function ActivityTimeline() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useActivity(days);

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-500" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px]">
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
          <span className="text-[12px] text-ink-3">{data.summary.total} actions</span>
        </div>
        <button
          type="button"
          disabled
          title="Rapport mensuel — V2"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] text-ink-3 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" /> Rapport mensuel (V2)
        </button>
      </div>

      {data.summary.total === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
          Aucune action enregistrée sur cette période.
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.summary.byModule).map(([mod, count]) => (
              <div key={mod} className="rounded-lg border border-line bg-white p-3 shadow-card">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{mod}</div>
                <div className="mt-1 font-mono text-[18px] font-bold text-ink">{count}</div>
              </div>
            ))}
          </section>

          <ol className="relative space-y-3 border-l-2 border-line pl-5">
            {data.items.map((a) => (
              <li key={a.id} className="relative">
                <span
                  className={clsx(
                    "absolute -left-7 top-1.5 h-3 w-3 rounded-full border-2 border-white",
                    a.action.includes("approve") || a.action.includes("validate")
                      ? "bg-success"
                      : a.action.includes("reject") || a.action.includes("delete")
                      ? "bg-danger"
                      : "bg-primary-500"
                  )}
                />
                <div className="text-[12.5px] font-medium text-ink">
                  {a.action.replace(/\./g, " · ")}
                </div>
                {a.entityType && (
                  <div className="text-[11px] text-ink-3">
                    {a.entityType}
                    {a.entityId && <span className="ml-1 font-mono">#{a.entityId.slice(-6)}</span>}
                  </div>
                )}
                <div className="text-[10.5px] text-ink-3">
                  {formatDate(a.createdAt, "dd/MM/yyyy 'à' HH:mm")}
                  {a.ipAddress && <span className="ml-2 font-mono">{a.ipAddress}</span>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
