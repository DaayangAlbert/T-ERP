"use client";

import { AlertOctagon, AlertTriangle, ArrowDown } from "lucide-react";
import { MessagePriority } from "@prisma/client";
import { clsx } from "clsx";

const STYLE: Record<MessagePriority, { label: string; cls: string; icon: React.ReactNode }> = {
  LOW: { label: "Bas", cls: "bg-ink-3/10 text-ink-3", icon: <ArrowDown className="h-2.5 w-2.5" /> },
  NORMAL: { label: "", cls: "", icon: null },
  HIGH: { label: "Important", cls: "bg-warning/10 text-warning", icon: <AlertTriangle className="h-2.5 w-2.5" /> },
  URGENT: { label: "URGENT", cls: "bg-danger/10 text-danger", icon: <AlertOctagon className="h-2.5 w-2.5" /> },
};

export function MessagePriorityBadge({ priority }: { priority: MessagePriority }) {
  if (priority === "NORMAL") return null;
  const s = STYLE[priority];
  return (
    <span className={clsx("inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9.5px] font-semibold", s.cls)}>
      {s.icon} {s.label}
    </span>
  );
}
