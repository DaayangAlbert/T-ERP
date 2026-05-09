"use client";

import { Check } from "lucide-react";
import { clsx } from "clsx";

export interface WizardStep {
  key: string;
  label: string;
}

interface Props {
  steps: WizardStep[];
  currentIndex: number;
  onJump?: (index: number) => void;
}

export function ReportWizardStepper({ steps, currentIndex, onJump }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const clickable = onJump && i <= currentIndex;
        return (
          <li key={step.key} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(i)}
              className={clsx(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition",
                active
                  ? "border-primary-500 bg-primary-500 text-white shadow-brand"
                  : done
                    ? "border-primary-300 bg-primary-50 text-primary-700 hover:border-primary-400"
                    : "border-line bg-white text-ink-3",
                clickable && !active && "cursor-pointer",
                !clickable && !active && "cursor-default"
              )}
            >
              <span
                className={clsx(
                  "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                  active ? "bg-white text-primary-700" : done ? "bg-primary-500 text-white" : "bg-line text-ink-3"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-4 bg-line" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
