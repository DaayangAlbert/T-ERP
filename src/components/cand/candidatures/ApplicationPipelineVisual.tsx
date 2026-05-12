import { clsx } from "clsx";
import { Check, Clock } from "lucide-react";

export type AppStage =
  | "RECEIVED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "TECHNICAL_TEST"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

const STEPS = [
  { stage: "RECEIVED" as const, label: "Reçue", num: 1 },
  { stage: "SHORTLISTED" as const, label: "Présélection", num: 2 },
  { stage: "INTERVIEW" as const, label: "Entretien", num: 3 },
  { stage: "TECHNICAL_TEST" as const, label: "Test", num: 4 },
  { stage: "OFFER" as const, label: "Offre", num: 5 },
];

const STAGE_INDEX: Record<string, number> = {
  RECEIVED: 0,
  SHORTLISTED: 1,
  INTERVIEW: 2,
  TECHNICAL_TEST: 3,
  OFFER: 4,
  HIRED: 5, // tous passés
};

type State = "done" | "current" | "future" | "rejected";

export function ApplicationPipelineVisual({
  stage,
  compact = false,
}: {
  stage: AppStage;
  compact?: boolean;
}) {
  const isRejected = stage === "REJECTED" || stage === "WITHDRAWN" || stage === "EXPIRED";
  const isHired = stage === "HIRED";
  const currentIdx = STAGE_INDEX[stage] ?? 0;

  function stateOf(idx: number): State {
    if (isRejected) return idx === 0 ? "rejected" : "future";
    if (isHired) return "done";
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "current";
    return "future";
  }

  const circleSize = compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const state = stateOf(idx);
        const isLast = idx === STEPS.length - 1;
        return (
          <div key={step.stage} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  "grid place-items-center rounded-full font-semibold transition-colors",
                  circleSize,
                  state === "done" && "bg-emerald-500 text-white",
                  state === "current" && "bg-amber-500 text-white",
                  state === "future" && "bg-ink-3/20 text-ink-3",
                  state === "rejected" && "bg-rose-500 text-white",
                )}
                aria-label={`Étape ${step.num} ${step.label} : ${state}`}
              >
                {state === "done" || state === "rejected" ? (
                  <Check className="h-3 w-3" />
                ) : state === "current" ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  step.num
                )}
              </div>
              {!compact ? (
                <span
                  className={clsx(
                    "text-[9px] font-medium",
                    state === "done" && "text-emerald-700",
                    state === "current" && "text-amber-700",
                    state === "future" && "text-ink-3",
                    state === "rejected" && "text-rose-700",
                  )}
                >
                  {step.label}
                </span>
              ) : null}
            </div>
            {!isLast ? (
              <div
                className={clsx(
                  "h-0.5 flex-1 rounded-full",
                  state === "done" ? "bg-emerald-500" : "bg-ink-3/20",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
