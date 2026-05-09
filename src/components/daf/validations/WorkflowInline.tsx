"use client";

import { Check, Clock } from "lucide-react";
import { Role } from "@prisma/client";
import { clsx } from "clsx";

interface Step {
  key: string;
  label: string;
  role: Role;
  status: string;
  decidedByName?: string;
}

interface Props {
  steps: Step[];
  initiatorName: string;
  // mode horizontal (desktop) ou vertical (mobile)
  vertical?: boolean;
}

export function WorkflowInline({ steps, initiatorName, vertical }: Props) {
  const all = [
    { key: "INIT", label: "Initiateur", role: "EMPLOYEE" as Role, status: "APPROVED" as const, decidedByName: initiatorName },
    ...steps,
  ];

  if (vertical) {
    return (
      <ol className="space-y-1 text-[11px]">
        {all.map((s) => {
          const isApproved = s.status === "APPROVED";
          const isPending = s.status === "PENDING";
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={clsx(
                  "grid h-4 w-4 place-items-center rounded-full text-white text-[8px] font-bold",
                  isApproved && "bg-success",
                  isPending && "bg-primary-500",
                  !isApproved && !isPending && "bg-ink-3/40"
                )}
              >
                {isApproved ? <Check className="h-2.5 w-2.5" /> : isPending ? <Clock className="h-2.5 w-2.5" /> : ""}
              </span>
              <span className={clsx("font-medium", isPending ? "text-primary-700" : "text-ink-2")}>
                {s.key === "INIT" ? "Initié" : s.label}
                {isPending && " (vous)"}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[11px] flex-wrap">
      {all.map((s, i) => {
        const isApproved = s.status === "APPROVED";
        const isPending = s.status === "PENDING";
        return (
          <span key={s.key} className="flex items-center gap-1">
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 font-semibold",
                isApproved && "bg-success/10 text-success",
                isPending && "bg-primary-100 text-primary-700",
                !isApproved && !isPending && "bg-ink-3/10 text-ink-3"
              )}
            >
              {isApproved && "✓ "}
              {s.key === "INIT" ? "Init" : s.label.replace(/Validation /, "")}
              {isPending && " (vous)"}
            </span>
            {i < all.length - 1 && <span className="text-ink-3">→</span>}
          </span>
        );
      })}
    </div>
  );
}
