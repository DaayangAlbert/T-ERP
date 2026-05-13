"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { clsx } from "clsx";
import type { ContractPhase } from "@prisma/client";

const PHASES: { code: ContractPhase; short: string; label: string }[] = [
  { code: "CALL_FOR_TENDERS_WATCH", short: "Veille", label: "Veille AO" },
  { code: "STUDY_AND_SUBMISSION", short: "Étude", label: "Étude & soumission" },
  { code: "AWAITING_ATTRIBUTION", short: "Attribution", label: "Attente attribution" },
  { code: "CONTRACT_SIGNATURE", short: "Signature", label: "Signature contrat" },
  { code: "ORDER_SERVICE", short: "OS", label: "Ordre de service" },
  { code: "EXECUTION", short: "Exécution", label: "Exécution" },
  { code: "RECEPTION", short: "Réception", label: "Réception" },
  { code: "GUARANTEE_PERIOD", short: "GPA", label: "Garantie GPA" },
];

interface Props {
  currentPhase: ContractPhase;
  compact?: boolean;
}

// Pipeline horizontal 8 phases (flex-wrap mobile : 4×2 ou structure verticale < 414px)
export function ContractsLifecycleVisual({ currentPhase, compact = false }: Props) {
  const currentIdx = PHASES.findIndex((p) => p.code === currentPhase);

  return (
    <ol className="flex flex-wrap items-stretch gap-1 sm:gap-2">
      {PHASES.map((p, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        return (
          <li
            key={p.code}
            className={clsx(
              "flex flex-1 min-w-[80px] flex-col items-center text-center",
              compact ? "min-w-[72px]" : "sm:min-w-[100px]",
            )}
          >
            <div className="flex w-full items-center">
              <div
                className={clsx(
                  "h-[2px] flex-1",
                  idx === 0 ? "opacity-0" : isDone || isCurrent ? "bg-emerald-400" : "bg-line",
                )}
              />
              <span
                className={clsx(
                  "grid place-items-center rounded-full text-[11px] font-bold shrink-0 transition",
                  compact ? "h-7 w-7" : "h-8 w-8 sm:h-9 sm:w-9",
                  isDone && "bg-emerald-500 text-white",
                  isCurrent && "bg-violet-600 text-white animate-pulse ring-2 ring-violet-200",
                  isFuture && "bg-surface-alt text-ink-3 border border-line",
                )}
                aria-label={`Étape ${idx + 1} ${p.label}`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? idx + 1 : <Circle className="h-3 w-3" />}
              </span>
              <div
                className={clsx(
                  "h-[2px] flex-1",
                  idx === PHASES.length - 1 ? "opacity-0" : isDone ? "bg-emerald-400" : "bg-line",
                )}
              />
            </div>
            <span
              className={clsx(
                "mt-1 line-clamp-2 text-[10px] font-semibold",
                isDone && "text-emerald-700",
                isCurrent && "text-violet-700",
                isFuture && "text-ink-3",
              )}
            >
              {p.short}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function getPhaseLabel(p: ContractPhase): string {
  return PHASES.find((x) => x.code === p)?.label ?? p;
}

export function getPhaseShort(p: ContractPhase): string {
  return PHASES.find((x) => x.code === p)?.short ?? p;
}

export const ALL_PHASES = PHASES;
