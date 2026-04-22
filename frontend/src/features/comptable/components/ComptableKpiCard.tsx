import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ComptableMiniTrend } from "@/features/comptable/components/ComptableMiniTrend";
import { comptableTheme } from "@/features/comptable/theme";
import { cn } from "@/shared/utils/cn";

const TONE_STYLES = {
  info: "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(233,246,255,0.88))] dark:border-sky-900/40 dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.5),rgba(15,23,42,0.84))]",
  success: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(221,247,234,0.88))] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.42),rgba(15,23,42,0.84))]",
  warning: "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(253,243,207,0.88))] dark:border-amber-900/40 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.42),rgba(15,23,42,0.84))]",
  danger: "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.88))] dark:border-rose-900/40 dark:bg-[linear-gradient(180deg,rgba(127,29,29,0.4),rgba(15,23,42,0.84))]",
  neutral: "border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,245,249,0.92))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.86))]",
};

interface ComptableKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: keyof typeof TONE_STYLES;
  trend?: number[];
}

export function ComptableKpiCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
  trend = [3, 5, 4, 7, 6, 8],
}: ComptableKpiCardProps) {
  return (
    <Card className={cn("space-y-4 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.4)]", TONE_STYLES[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${comptableTheme.primaryText}`}>{value}</p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/70 p-2.5 dark:border-white/10 dark:bg-slate-950/36">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="rounded-[20px] border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-slate-950/28">
        <ComptableMiniTrend values={trend} />
      </div>
      <p className={`text-sm ${comptableTheme.secondaryText}`}>{helper}</p>
    </Card>
  );
}
