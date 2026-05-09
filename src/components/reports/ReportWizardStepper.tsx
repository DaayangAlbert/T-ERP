"use client";

import { Check } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  steps: Array<{ key: string; label: string }>;
  current: number;
  onJump?: (index: number) => void;
}

export function ReportWizardStepper({ steps, current, onJump }: Props) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = onJump && i <= current;
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => clickable && onJump(i)}
              disabled={!clickable}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] transition",
                active && "bg-primary-100 text-primary-800 font-semibold",
                done && "text-primary-700",
                !active && !done && "text-ink-3",
                clickable && "hover:bg-primary-50"
              )}
            >
              <span
                className={clsx(
                  "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                  active && "bg-primary-500 text-white",
                  done && "bg-success text-white",
                  !active && !done && "border border-line text-ink-3"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-ink-4">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
