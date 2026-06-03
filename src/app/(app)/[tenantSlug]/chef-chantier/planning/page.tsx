"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { CalendarDays, Users } from "lucide-react";
import { PlanningTab } from "@/components/cc/planning/PlanningTab";
import { TeamsTab } from "@/components/cc/planning/TeamsTab";
import { PageHelp } from "@/components/help/PageHelp";
import { CcPlanningTutorial } from "@/components/help/tutorials/CcPlanningTutorial";

type Tab = "planning" | "teams";

export default function CcPlanningPage() {
  const [tab, setTab] = useState<Tab>("planning");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="text-[20px] font-bold text-ink">Planning & équipes</h1>
          <p className="text-[12.5px] text-ink-3">
            Tâches journalières · constitution d&apos;équipes · suivi avancement
          </p>
        </div>
        <PageHelp title="Aide — Planning CC"><CcPlanningTutorial /></PageHelp>
      </header>

      <nav className="flex gap-1 rounded-lg border border-line bg-white p-1 shadow-card">
        <TabBtn active={tab === "planning"} onClick={() => setTab("planning")} icon={<CalendarDays className="h-4 w-4" />}>
          Planning du jour
        </TabBtn>
        <TabBtn active={tab === "teams"} onClick={() => setTab("teams")} icon={<Users className="h-4 w-4" />}>
          Mes équipes
        </TabBtn>
      </nav>

      {tab === "planning" && <PlanningTab />}
      {tab === "teams" && <TeamsTab />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12.5px] font-semibold transition",
        active ? "bg-violet-600 text-white shadow" : "text-ink-2 hover:bg-surface-alt",
      )}
    >
      {icon} {children}
    </button>
  );
}
