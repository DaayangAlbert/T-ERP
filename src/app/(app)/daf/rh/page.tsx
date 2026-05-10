"use client";

import { useState } from "react";
import { LineChart, ShieldCheck, UserMinus, TimerReset, HandCoins } from "lucide-react";
import { clsx } from "clsx";
import { HrFinancialOverview } from "@/components/daf/hr/HrFinancialOverview";
import { SocialProvisionsTable } from "@/components/daf/hr/SocialProvisionsTable";
import { DeparturesTable } from "@/components/daf/hr/DeparturesTable";
import { OvertimeAnalysis } from "@/components/daf/hr/OvertimeAnalysis";
import { SubsidiesTracker } from "@/components/daf/hr/SubsidiesTracker";

type Tab = "overview" | "provisions" | "departures" | "overtime" | "subsidies";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "overview", label: "Vue financière DAF", icon: <LineChart className="h-3.5 w-3.5" /> },
  { key: "provisions", label: "Provisions sociales", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "departures", label: "Départs et indemnités", icon: <UserMinus className="h-3.5 w-3.5" /> },
  { key: "overtime", label: "Heures supplémentaires", icon: <TimerReset className="h-3.5 w-3.5" /> },
  { key: "subsidies", label: "Subventions et exonérations", icon: <HandCoins className="h-3.5 w-3.5" /> },
];

export default function DafRhPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          RH & Paie — vue financière DAF
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Masse salariale, provisions sociales, départs et indemnités, heures supplémentaires, subventions.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "overview" && <HrFinancialOverview />}
      {tab === "provisions" && <SocialProvisionsTable />}
      {tab === "departures" && <DeparturesTable />}
      {tab === "overtime" && <OvertimeAnalysis />}
      {tab === "subsidies" && <SubsidiesTracker />}
    </>
  );
}
