"use client";

import { useState } from "react";
import { ClipboardCheck, GitBranch, BarChart3, Users } from "lucide-react";
import { clsx } from "clsx";
import { useDafValidations } from "@/hooks/useDafValidations";
import { ValidationsKpis } from "@/components/daf/validations/ValidationsKpis";
import { ValidationsList } from "@/components/daf/validations/ValidationsList";
import { AllCircuitView } from "@/components/daf/validations/AllCircuitView";
import { ValidationStatsCharts } from "@/components/daf/validations/ValidationStatsCharts";
import { DelegationsManager } from "@/components/daf/validations/DelegationsManager";

type Tab = "n2" | "circuit" | "stats" | "delegations";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "n2", label: "Mes N2", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  { key: "circuit", label: "Tout le circuit", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: "stats", label: "Statistiques", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "delegations", label: "Délégations", icon: <Users className="h-3.5 w-3.5" /> },
];

const TYPE_TABS = [
  { key: "", label: "Tous" },
  { key: "PAYROLL", label: "Paie" },
  { key: "PURCHASE", label: "Achats" },
  { key: "EXPENSE", label: "Dépenses" },
  { key: "CONTRACT", label: "Marchés" },
  { key: "HIRING", label: "Embauches" },
  { key: "LEAVE", label: "Congés" },
];

function MyN2Tab() {
  const [type, setType] = useState("");
  const { data, isLoading, refetch } = useDafValidations({ type: type || undefined });

  return (
    <>
      {data && (
        <div className="mb-4">
          <ValidationsKpis summary={data.summary} />
        </div>
      )}

      <div className="mb-4 -mx-3 overflow-x-auto px-3">
        <div className="inline-flex gap-1 border-b border-line">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={clsx(
                "relative whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
                type === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
              )}
            >
              {t.label}
              {type === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : (
        <ValidationsList items={data.items} onChange={refetch} />
      )}
    </>
  );
}

export default function DafValidationsPage() {
  const [tab, setTab] = useState<Tab>("n2");

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Validations — vue DAF
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Mes N2, vue transverse du circuit, statistiques et délégations.
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

      {tab === "n2" && <MyN2Tab />}
      {tab === "circuit" && <AllCircuitView />}
      {tab === "stats" && <ValidationStatsCharts />}
      {tab === "delegations" && <DelegationsManager />}
    </>
  );
}
