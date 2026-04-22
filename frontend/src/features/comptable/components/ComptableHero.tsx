import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { comptableTheme } from "@/features/comptable/theme";

interface HeroStat {
  label: string;
  value: string;
}

interface ComptableHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  stats: HeroStat[];
  actions?: ReactNode;
  sideContent?: ReactNode;
}

export function ComptableHero({ eyebrow, title, description, stats, actions, sideContent }: ComptableHeroProps) {
  return (
    <Card className="overflow-hidden border border-black/8 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_32%),linear-gradient(135deg,#fffdf8_0%,#f4f8f7_46%,#eef2ff_100%)] p-0 text-black shadow-[0_36px_90px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.22),transparent_32%),linear-gradient(135deg,#061622_0%,#0f172a_55%,#17162f_100%)] dark:text-white">
      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr] lg:px-6 lg:py-6">
        <div className="space-y-4">
          <Badge className="border border-black/10 bg-white/80 text-black dark:border-white/12 dark:bg-white/10 dark:text-white" variant="neutral">
            {eyebrow}
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className={`max-w-3xl text-sm leading-6 ${comptableTheme.secondaryText}`}>{description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[22px] border border-black/8 bg-white/72 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/6">
                <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>{stat.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${comptableTheme.primaryText}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          {actions}
        </div>
        <div className="min-w-0">{sideContent}</div>
      </div>
    </Card>
  );
}
