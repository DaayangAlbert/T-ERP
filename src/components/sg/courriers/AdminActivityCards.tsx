"use client";

import { Building2, Crown, Hammer, Gavel, Users, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import type { AnalyticsResponse } from "@/hooks/useSgCorrespondences";

const ICON: Record<string, typeof Building2> = {
  MINTP: Hammer,
  MINEE: Building2,
  MUNICIPALITIES: Crown,
  TAX_SOCIAL: Briefcase,
  COURTS: Gavel,
  PRIVATE_CLIENTS: Users,
};

const TONE: Record<string, string> = {
  MINTP: "border-violet-200 bg-violet-50 text-violet-700",
  MINEE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MUNICIPALITIES: "border-amber-200 bg-amber-50 text-amber-700",
  TAX_SOCIAL: "border-slate-200 bg-slate-50 text-slate-700",
  COURTS: "border-rose-200 bg-rose-50 text-rose-700",
  PRIVATE_CLIENTS: "border-violet-200 bg-violet-50 text-violet-700",
};

interface Props {
  data: AnalyticsResponse;
}

export function AdminActivityCards({ data }: Props) {
  return (
    <section>
      <h2 className="mb-2 text-[13.5px] font-semibold text-ink">
        Activité par administration ce mois ({data.totalThisMonth})
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {data.byAdmin.map((g) => {
          const Icon = ICON[g.id] ?? Building2;
          return (
            <div
              key={g.id}
              className={clsx(
                "flex items-center gap-2 rounded-xl border bg-white px-3 py-2",
                g.count === 0 && "opacity-60",
              )}
            >
              <div className={clsx("grid h-8 w-8 place-items-center rounded-lg border", TONE[g.id])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-bold text-ink">{g.count}</div>
                <div className="text-[10.5px] text-ink-3">{g.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
