"use client";

import { Check, Clock, X } from "lucide-react";
import { clsx } from "clsx";

interface Step {
  key: string;
  label: string;
  status: string;
}

const STATUS_ICON: Record<string, { Icon: typeof Check; cls: string }> = {
  approved: { Icon: Check, cls: "bg-emerald-500 text-white border-emerald-500" },
  rejected: { Icon: X, cls: "bg-rose-500 text-white border-rose-500" },
  pending: { Icon: Clock, cls: "bg-amber-500 text-white border-amber-500" },
  waiting: { Icon: Clock, cls: "bg-white text-slate-400 border-slate-300" },
};

interface Props {
  steps: Step[];
  variant?: "horizontal" | "vertical";
}

export function DtValidationWorkflowVisual({ steps, variant = "horizontal" }: Props) {
  return (
    <div
      className={clsx(
        variant === "horizontal"
          ? "flex items-center gap-1.5 overflow-x-auto"
          : "flex flex-col gap-1.5"
      )}
    >
      {steps.map((step, i) => {
        const cfg = STATUS_ICON[step.status] ?? STATUS_ICON.waiting;
        const Icon = cfg.Icon;
        return (
          <div
            key={step.key}
            className={clsx(
              "flex items-center gap-1.5",
              variant === "horizontal" ? "flex-shrink-0" : ""
            )}
          >
            <div
              className={clsx(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border-2",
                cfg.cls
              )}
            >
              <Icon className="h-2.5 w-2.5" />
            </div>
            <span
              className={clsx(
                "text-[11px] whitespace-nowrap",
                step.status === "pending"
                  ? "font-semibold text-ink"
                  : step.status === "waiting"
                    ? "text-ink-3"
                    : "text-ink-2"
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && variant === "horizontal" && (
              <span className="h-px w-4 bg-line" />
            )}
          </div>
        );
      })}
    </div>
  );
}
