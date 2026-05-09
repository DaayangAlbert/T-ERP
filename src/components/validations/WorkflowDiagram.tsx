"use client";

import { Check, X, Clock, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { formatDate } from "@/lib/format";

interface Step {
  key: string;
  label: string;
  role: string;
  status: string;
  decidedByName?: string;
  decidedAt?: string;
  comment?: string;
}

interface Props {
  steps: Step[];
  initiatorName: string;
}

export function WorkflowDiagram({ steps, initiatorName }: Props) {
  const allSteps = [
    { key: "INIT", label: "Initiateur", role: "—", status: "APPROVED" as const, decidedByName: initiatorName },
    ...steps,
  ];

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-fit items-stretch gap-2">
        {allSteps.map((s, i) => {
          const isLast = i === allSteps.length - 1;
          const isPending = s.status === "PENDING";
          const isApproved = s.status === "APPROVED";
          const isRejected = s.status === "REJECTED";
          return (
            <li key={s.key} className="flex items-center gap-2">
              <div
                className={clsx(
                  "min-w-[150px] rounded-lg border px-3 py-2",
                  isApproved && "border-success/30 bg-success/5",
                  isRejected && "border-danger/30 bg-danger/5",
                  isPending && "border-primary-300 bg-primary-50",
                  !isApproved && !isRejected && !isPending && "border-line bg-white"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "grid h-5 w-5 place-items-center rounded-full text-white",
                      isApproved && "bg-success",
                      isRejected && "bg-danger",
                      isPending && "bg-primary-500",
                      !isApproved && !isRejected && !isPending && "bg-ink-3"
                    )}
                  >
                    {isApproved ? (
                      <Check className="h-3 w-3" />
                    ) : isRejected ? (
                      <X className="h-3 w-3" />
                    ) : isPending ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <UserIcon className="h-3 w-3" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                    {s.role}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] font-medium text-ink">{s.label}</div>
                {s.decidedByName && (
                  <div className="mt-0.5 truncate text-[11px] text-ink-3">{s.decidedByName}</div>
                )}
                {s.decidedAt && (
                  <div className="text-[10.5px] text-ink-4">{formatDate(s.decidedAt)}</div>
                )}
                {s.comment && (
                  <div className="mt-1 line-clamp-2 text-[10.5px] italic text-ink-3">
                    « {s.comment} »
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className={clsx(
                    "h-0.5 w-6 flex-shrink-0",
                    isApproved ? "bg-success" : "bg-line-2"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
