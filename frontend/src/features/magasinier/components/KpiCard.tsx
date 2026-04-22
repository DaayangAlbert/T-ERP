import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";

const toneClassMap = {
  neutral: "from-slate-100 to-white text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50",
  info: "from-sky-100 to-cyan-50 text-sky-950 dark:from-sky-950/70 dark:to-slate-950 dark:text-sky-100",
  success: "from-emerald-100 to-teal-50 text-emerald-950 dark:from-emerald-950/60 dark:to-slate-950 dark:text-emerald-100",
  warning: "from-amber-100 to-orange-50 text-amber-950 dark:from-amber-950/60 dark:to-slate-950 dark:text-amber-100",
  danger: "from-rose-100 to-red-50 text-rose-950 dark:from-rose-950/60 dark:to-slate-950 dark:text-rose-100",
};

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: keyof typeof toneClassMap;
}

export function KpiCard({ icon: Icon, label, value, helper, tone = "neutral" }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "border-0 bg-gradient-to-br p-0 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]",
        toneClassMap[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3 rounded-[24px] border border-white/40 px-4 py-4 backdrop-blur dark:border-white/5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/60 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
