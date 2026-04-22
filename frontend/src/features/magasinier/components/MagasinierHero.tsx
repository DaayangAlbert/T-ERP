import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface HeroStat {
  label: string;
  value: string;
}

interface MagasinierHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  stats: HeroStat[];
  actions?: ReactNode;
  sideContent?: ReactNode;
}

export function MagasinierHero({
  eyebrow,
  title,
  description,
  stats,
  actions,
  sideContent,
}: MagasinierHeroProps) {
  return (
    <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.2),_transparent_35%),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96)_50%,rgba(240,253,250,0.95))] p-0 dark:bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.2),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.15),_transparent_35%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98)_55%,rgba(17,24,39,0.95))]">
      <div className="grid gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">{description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                className="rounded-[22px] border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{stat.value}</p>
              </div>
            ))}
          </div>

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className="rounded-[28px] border border-white/60 bg-white/72 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur dark:border-white/10 dark:bg-slate-950/55">
          {sideContent}
        </div>
      </div>
    </Card>
  );
}
