"use client";

import type { MissionPriority } from "@/hooks/useOuvMissions";

interface Props {
  priority: MissionPriority;
  size?: "sm" | "md";
}

const META: Record<MissionPriority, { label: string; tone: string }> = {
  URGENT: { label: "URGENT", tone: "bg-rose-600 text-white" },
  HIGH: { label: "PRIORITAIRE", tone: "bg-amber-500 text-white" },
  NORMAL: { label: "NORMAL", tone: "bg-blue-500 text-white" },
  LOW: { label: "FAIBLE", tone: "bg-slate-400 text-white" },
};

export function MissionPriorityChip({ priority, size = "md" }: Props) {
  const meta = META[priority];
  const cls =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center rounded-md font-bold ${meta.tone} ${cls}`}>
      {meta.label}
    </span>
  );
}
