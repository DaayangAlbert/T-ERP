import { cn } from "@/shared/utils/cn";

export const comptableTheme = {
  page: "space-y-6 text-black dark:text-white",
  primaryText: "text-black dark:text-white",
  secondaryText: "text-black/72 dark:text-white/72",
  mutedText: "text-black/55 dark:text-white/55",
  subtleText: "text-black/42 dark:text-white/48",
  softPanel:
    "rounded-[24px] border border-black/8 bg-white/86 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-950/72",
  insetPanel:
    "rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,247,251,0.88))] px-4 py-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))]",
  strongPanel:
    "rounded-[24px] border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,245,244,0.94))] shadow-[0_28px_80px_-46px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(3,7,18,0.9))]",
  tableRow:
    "rounded-[22px] border border-black/6 bg-white/88 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.24)] dark:border-white/8 dark:bg-slate-950/74",
  select:
    "w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-black shadow-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-2 dark:border-white/12 dark:bg-slate-950/80 dark:text-white",
  actionLink:
    "inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black transition hover:border-primary hover:text-primary dark:border-white/12 dark:bg-slate-950/80 dark:text-white dark:hover:border-primary dark:hover:text-white",
};

export function comptableProjectPill(active: boolean) {
  return cn(
    "rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition",
    active
      ? "border-primary bg-primary text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.6)]"
      : "border-black/10 bg-white text-black hover:border-primary/30 hover:bg-white dark:border-white/12 dark:bg-slate-950/80 dark:text-white dark:hover:border-primary/40 dark:hover:bg-slate-950"
  );
}

export function comptableTonePanel(tone: "info" | "success" | "warning" | "danger" | "neutral" = "neutral") {
  const tones = {
    info: "border-sky-200/80 bg-sky-50/85 dark:border-sky-900/40 dark:bg-sky-950/26",
    success: "border-emerald-200/80 bg-emerald-50/85 dark:border-emerald-900/40 dark:bg-emerald-950/26",
    warning: "border-amber-200/80 bg-amber-50/85 dark:border-amber-900/40 dark:bg-amber-950/26",
    danger: "border-rose-200/80 bg-rose-50/85 dark:border-rose-900/40 dark:bg-rose-950/26",
    neutral: "border-black/8 bg-white/88 dark:border-white/10 dark:bg-slate-950/74",
  };

  return cn("rounded-[22px] border px-4 py-4", tones[tone]);
}
