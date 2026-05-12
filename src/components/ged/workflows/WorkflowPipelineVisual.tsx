"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export type PipelineStep = {
  stepIndex: number;
  name: string;
  role: string;
  status: "DONE" | "ACTIVE" | "OVERDUE" | "PENDING";
};

interface Props {
  steps: PipelineStep[];
  compact?: boolean;
}

// Pipeline horizontal avec circles + connecteurs (5 max sur desktop, wrap mobile).
export function WorkflowPipelineVisual({ steps, compact = false }: Props) {
  if (steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line p-3 text-center text-[11.5px] text-ink-3">
        Aucune étape configurée.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-0 items-stretch gap-1 sm:gap-2">
        {steps.map((s, idx) => (
          <li key={s.stepIndex} className="flex min-w-[88px] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div
                className={clsx(
                  "h-[2px] flex-1",
                  idx === 0 ? "opacity-0" : steps[idx - 1].status === "DONE" ? "bg-emerald-400" : "bg-line",
                )}
              />
              <span
                className={clsx(
                  "grid place-items-center rounded-full text-[12px] font-bold shrink-0",
                  compact ? "h-8 w-8" : "h-9 w-9",
                  s.status === "DONE" && "bg-emerald-500 text-white",
                  s.status === "ACTIVE" && "bg-amber-500 text-white animate-pulse",
                  s.status === "OVERDUE" && "bg-rose-500 text-white animate-pulse",
                  s.status === "PENDING" && "bg-surface-alt text-ink-3 border border-line",
                )}
                aria-label={`Étape ${idx + 1} ${s.status}`}
              >
                {s.status === "DONE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : s.status === "OVERDUE" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </span>
              <div
                className={clsx(
                  "h-[2px] flex-1",
                  idx === steps.length - 1 ? "opacity-0" : s.status === "DONE" ? "bg-emerald-400" : "bg-line",
                )}
              />
            </div>
            <span className="mt-1 line-clamp-2 text-[10.5px] font-semibold text-ink">{s.name}</span>
            <span className="text-[10px] text-ink-3">{s.role}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
