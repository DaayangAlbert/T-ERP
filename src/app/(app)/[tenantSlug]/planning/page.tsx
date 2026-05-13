"use client";

import Link from "next/link";
import { useState } from "react";
import { GanttChartSquare, Activity, Diamond, Calendar, Scale } from "lucide-react";
import { GanttView } from "@/components/planning/GanttView";
import { ResourceHeatmap } from "@/components/planning/ResourceHeatmap";
import { MilestonesTimeline } from "@/components/planning/MilestonesTimeline";
import { CalendarView } from "@/components/planning/CalendarView";
import { useArbitrations } from "@/hooks/usePlanning";
import { clsx } from "clsx";

type View = "gantt" | "resources" | "milestones" | "calendar";

const VIEWS: Array<{ key: View; label: string; icon: React.ReactNode }> = [
  { key: "gantt", label: "Gantt", icon: <GanttChartSquare className="h-3.5 w-3.5" /> },
  { key: "resources", label: "Charge ressources", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "milestones", label: "Jalons stratégiques", icon: <Diamond className="h-3.5 w-3.5" /> },
  { key: "calendar", label: "Calendrier", icon: <Calendar className="h-3.5 w-3.5" /> },
];

export default function PlanningPage() {
  const [view, setView] = useState<View>("gantt");
  const { data: arbitrations } = useArbitrations();
  const pending = arbitrations?.items.filter((a) => a.arbitrationStatus === "PENDING").length ?? 0;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Planning</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue Gantt, charge ressources, jalons stratégiques, calendrier consolidé.
          </p>
        </div>
        <Link
          href="/planning/arbitrages"
          className={clsx(
            "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium",
            pending > 0
              ? "bg-warning text-white hover:opacity-90"
              : "border border-line-2 bg-white text-ink-2 hover:border-primary-300"
          )}
        >
          <Scale className="h-3.5 w-3.5" />
          Arbitrages DG
          {pending > 0 && (
            <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] font-bold">{pending}</span>
          )}
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              view === v.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {v.icon}
            {v.label}
            {view === v.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {view === "gantt" && <GanttView />}
      {view === "resources" && <ResourceHeatmap />}
      {view === "milestones" && <MilestonesTimeline />}
      {view === "calendar" && <CalendarView />}
    </>
  );
}
