"use client";

import { useState } from "react";
import { AlertOctagon, Calendar, Users, Wrench } from "lucide-react";
import { clsx } from "clsx";
import type { DtCapacityResponse } from "@/hooks/useDtCapacity";

const ACTIONS = [
  { key: "postpone", label: "Reporter 1 sem.", Icon: Calendar, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "recruit", label: "Recruter intérim", Icon: Users, cls: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "subcontract", label: "Sous-traiter", Icon: Wrench, cls: "bg-amber-50 text-amber-700 border-amber-200" },
];

export function OverloadsList({ overloads }: { overloads: DtCapacityResponse["overloads"] }) {
  const [decided, setDecided] = useState<Record<string, string>>({});

  if (overloads.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-3 text-[12.5px] text-emerald-700">
        Aucune surcharge détectée cette semaine.
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
        <AlertOctagon className="h-4 w-4 text-rose-600" /> Surcharges et arbitrages
      </h2>
      <div className="flex flex-col gap-2">
        {overloads.map((o) => (
          <article
            key={o.id}
            className={clsx(
              "rounded-lg border border-l-[4px] border-l-rose-500 bg-white p-3",
              decided[o.id] && "opacity-70"
            )}
          >
            <header className="flex flex-wrap items-baseline justify-between gap-1">
              <div>
                <div className="text-[13px] font-semibold text-ink">{o.crewName}</div>
                <div className="text-[11.5px] text-ink-3">
                  {o.site} · semaine {o.weekIso.slice(-3)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-bold text-rose-700">{o.overloadPercent} %</div>
                <div className="text-[10.5px] text-ink-3">{o.plannedHours.toFixed(0)} h planifiées</div>
              </div>
            </header>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACTIONS.map((a) => {
                const Icon = a.Icon;
                const isDone = decided[o.id] === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setDecided((p) => ({ ...p, [o.id]: a.key }))}
                    className={clsx(
                      "inline-flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11.5px] font-semibold transition sm:flex-none",
                      isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : a.cls
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {isDone ? "✓ Validé" : a.label}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
