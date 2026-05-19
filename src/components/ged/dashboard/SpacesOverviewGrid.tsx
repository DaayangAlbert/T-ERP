"use client";

import Link from "next/link";
import type { GedDashboardResponse } from "@/hooks/useGedDashboard";

interface Props {
  spaces: GedDashboardResponse["spaces"];
}

function indexationTone(rate: number): { bar: string; text: string } {
  if (rate >= 95) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (rate >= 85) return { bar: "bg-violet-500", text: "text-violet-700" };
  return { bar: "bg-amber-500", text: "text-amber-700" };
}

export function SpacesOverviewGrid({ spaces }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Répartition par espace documentaire</h2>
        <Link
          href="/gestion-documentaire/espaces"
          className="text-[11.5px] font-semibold text-violet-700 hover:underline"
        >
          Voir tous les espaces →
        </Link>
      </header>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "1fr" }}>
        {spaces.map((s) => {
          const tone = indexationTone(s.indexationRate);
          const childLabel = s.childCount ? ` · ${s.childCount} espaces` : "";
          return (
            <Link
              key={s.id}
              href={s.id === "AGGREGATED_SITES" ? "/gestion-documentaire/espaces?tab=sites" : `/gestion-documentaire/espaces?openId=${s.id}`}
              className="rounded-lg border border-line bg-surface-alt/40 p-3 transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-[20px] leading-none">{s.icon}</span>
                <span className="truncate text-[13px] font-semibold text-ink">{s.name}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[18px] font-bold tracking-tight text-ink">
                    {s.docsCount.toLocaleString("fr-FR")}
                  </div>
                  <div className="text-[10.5px] text-ink-3">documents{childLabel}</div>
                </div>
                <div className="text-right">
                  <div className={`text-[13px] font-bold ${tone.text}`}>{s.indexationRate}%</div>
                  <div className="text-[10.5px] text-ink-3">indexation</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full ${tone.bar} transition-all`}
                  style={{ width: `${Math.min(100, s.indexationRate)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
