"use client";

import { Building2, BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";

interface Props {
  kpis: DtDashboardResponse["kpis"];
}

export function DtKpiRow({ kpis }: Props) {
  const cards = [
    {
      label: "Chantiers actifs",
      value: kpis.activeSites.toString(),
      icon: Building2,
      tone: "violet",
    },
    {
      label: "Avancement moyen",
      value: `${kpis.avgProgress} %`,
      icon: BarChart3,
      tone: "blue",
    },
    {
      label: "N2 à valider",
      value: kpis.pendingN2Validations.toString(),
      icon: ClipboardCheck,
      tone: kpis.pendingN2Validations > 5 ? "amber" : "slate",
    },
    {
      label: "Jours sans accident",
      value: kpis.hseRecord.toString(),
      icon: ShieldCheck,
      tone: "emerald",
    },
  ] as const;

  const toneClasses: Record<string, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
          >
            <div className={`grid h-10 w-10 place-items-center rounded-lg border ${toneClasses[c.tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-none tracking-tight text-ink">
                {c.value}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{c.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
