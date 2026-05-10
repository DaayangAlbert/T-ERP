"use client";

import { Check, Clock } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  status: string;
}

const STEPS = [
  { key: "DRAFT", label: "Saisie variables (moi)" },
  { key: "CALCULATED", label: "Calcul brut → net" },
  { key: "N1_PENDING", label: "Validation RH N1" },
  { key: "N2_PENDING", label: "Validation DAF N2" },
  { key: "N3_PENDING", label: "Validation DG N3" },
  { key: "PAID", label: "Virements → DIPE CNPS" },
];

export function PayrollWorkflowBar({ status }: Props) {
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === status));

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      {/* Desktop : horizontal */}
      <ol className="hidden items-center gap-1 md:flex">
        {STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1 min-w-0">
              <div
                className={clsx(
                  "grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-amber-500 text-white animate-pulse",
                  !done && !active && "bg-surface-alt text-ink-3"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : active ? <Clock className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={clsx(
                  "truncate text-[11px] font-medium",
                  done && "text-emerald-700",
                  active && "text-amber-700",
                  !done && !active && "text-ink-3"
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    "h-px flex-1",
                    done ? "bg-emerald-500" : "bg-line"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile : stack vertical */}
      <ol className="space-y-1.5 md:hidden">
        {STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <div
                className={clsx(
                  "grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-amber-500 text-white animate-pulse",
                  !done && !active && "bg-surface-alt text-ink-3"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : active ? <Clock className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={clsx(
                  "text-[12px] font-medium",
                  done && "text-emerald-700",
                  active && "text-amber-700",
                  !done && !active && "text-ink-3"
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
