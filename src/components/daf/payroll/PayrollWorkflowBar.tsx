"use client";

import { Check, Clock, Circle } from "lucide-react";
import { PayrollCycleStatus } from "@prisma/client";
import { clsx } from "clsx";

const STEPS: Array<{ key: PayrollCycleStatus; label: string; shortLabel: string }> = [
  { key: "DRAFT", label: "Pré-validation", shortLabel: "Pré-val." },
  { key: "CALCULATED", label: "Calcul", shortLabel: "Calcul" },
  { key: "N1_PENDING", label: "N1 RH", shortLabel: "N1 RH" },
  { key: "N2_PENDING", label: "N2 DAF", shortLabel: "N2 DAF" },
  { key: "N3_PENDING", label: "N3 DG", shortLabel: "N3 DG" },
  { key: "PAID", label: "Virement", shortLabel: "Virement" },
  { key: "DIPE_SUBMITTED", label: "DIPE CNPS", shortLabel: "DIPE" },
];

const ORDER: PayrollCycleStatus[] = STEPS.map((s) => s.key);

interface Props {
  currentStatus: PayrollCycleStatus;
}

export function PayrollWorkflowBar({ currentStatus }: Props) {
  const currentIdx = ORDER.indexOf(currentStatus);

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Workflow paie
      </h3>

      {/* Desktop ≥ md : horizontal */}
      <ol className="hidden items-center gap-2 overflow-x-auto md:flex">
        {STEPS.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 text-center min-w-[100px] xl:min-w-[120px]">
                <span
                  className={clsx(
                    "grid h-9 w-9 place-items-center rounded-full text-white shadow-sm",
                    isPast && "bg-success",
                    isCurrent && "bg-warning",
                    isFuture && "bg-ink-3/30 text-ink-3"
                  )}
                >
                  {isPast ? <Check className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                </span>
                <span
                  className={clsx(
                    "text-[10.5px] font-semibold xl:text-[11px]",
                    isPast && "text-success",
                    isCurrent && "text-warning",
                    isFuture && "text-ink-3"
                  )}
                >
                  <span className="hidden xl:inline">{s.label}</span>
                  <span className="xl:hidden">{s.shortLabel}</span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={clsx("h-0.5 w-6 xl:w-8", i < currentIdx ? "bg-success" : "bg-line-2")} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile < md : vertical stack */}
      <ol className="space-y-1 md:hidden">
        {STEPS.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          return (
            <li key={s.key} className="relative flex items-start gap-3 pb-3">
              <div className="relative flex flex-col items-center">
                <span
                  className={clsx(
                    "grid h-7 w-7 place-items-center rounded-full text-white",
                    isPast && "bg-success",
                    isCurrent && "bg-warning",
                    isFuture && "bg-ink-3/30 text-ink-3"
                  )}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : isCurrent ? <Clock className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={clsx("absolute top-7 h-full w-0.5", i < currentIdx ? "bg-success" : "bg-line-2")} />
                )}
              </div>
              <div className="flex-1 pt-0.5">
                <span
                  className={clsx(
                    "text-[13px] font-semibold",
                    isPast && "text-success",
                    isCurrent && "text-warning",
                    isFuture && "text-ink-3"
                  )}
                >
                  {s.label}
                  {isCurrent && " (en cours)"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
