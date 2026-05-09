"use client";

import { useState } from "react";
import { AlertTriangle, Wrench, Users } from "lucide-react";
import { useResourceLoad } from "@/hooks/usePlanning";
import { clsx } from "clsx";

export function ResourceHeatmap() {
  const [view, setView] = useState<"skill" | "equipment">("skill");
  const { data, isLoading } = useResourceLoad(view);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const cellColor = (load: number) => {
    if (load > 110) return "bg-danger text-white";
    if (load > 95) return "bg-warning text-white";
    if (load > 75) return "bg-success/70 text-white";
    if (load > 50) return "bg-success/40 text-ink";
    return "bg-success/15 text-ink-3";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="inline-flex rounded-md border border-line">
          <button
            type="button"
            onClick={() => setView("skill")}
            className={clsx(
              "inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px] font-medium transition",
              view === "skill" ? "bg-primary-500 text-white" : "text-ink-3 hover:bg-surface-alt"
            )}
          >
            <Users className="h-3.5 w-3.5" /> Par compétence
          </button>
          <button
            type="button"
            onClick={() => setView("equipment")}
            className={clsx(
              "inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px] font-medium transition",
              view === "equipment" ? "bg-primary-500 text-white" : "text-ink-3 hover:bg-surface-alt"
            )}
          >
            <Wrench className="h-3.5 w-3.5" /> Par engin
          </button>
        </div>
        {data.conflictsCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11.5px] font-semibold text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {data.conflictsCount} conflit{data.conflictsCount > 1 ? "s" : ""} non résolu{data.conflictsCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[11.5px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Ressource</th>
              {data.rows[0]?.points.map((p) => (
                <th key={p.month} className="py-2 text-center font-mono">
                  {new Date(p.month + "-01").toLocaleDateString("fr-FR", { month: "short" })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-2 pl-3 font-medium text-ink">{r.label}</td>
                {r.points.map((p) => (
                  <td key={p.month} className="p-1">
                    <div
                      className={clsx("grid h-9 place-items-center rounded font-mono text-[11px] font-bold", cellColor(p.load))}
                      title={`${p.month} · ${p.load}%`}
                    >
                      {p.load}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-ink-3">
        <span>Charge :</span>
        <Legend label="< 50%" cls="bg-success/15 text-ink-3" />
        <Legend label="50–75%" cls="bg-success/40 text-ink" />
        <Legend label="75–95% (optimal)" cls="bg-success/70 text-white" />
        <Legend label="95–110% (saturé)" cls="bg-warning text-white" />
        <Legend label="> 110% (surchauffe)" cls="bg-danger text-white" />
      </div>
    </div>
  );
}

function Legend({ label, cls }: { label: string; cls: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={clsx("h-2.5 w-4 rounded-sm", cls)} />
      {label}
    </span>
  );
}
