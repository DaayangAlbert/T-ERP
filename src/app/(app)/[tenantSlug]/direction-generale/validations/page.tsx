"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, GitBranch, BarChart3, Users } from "lucide-react";
import { clsx } from "clsx";
import { useDgValidations } from "@/hooks/useDgValidations";
import { ValidationsKpis } from "@/components/daf/validations/ValidationsKpis";
import { ValidationsList } from "@/components/daf/validations/ValidationsList";
import { AllCircuitView } from "@/components/daf/validations/AllCircuitView";
import { ValidationStatsCharts } from "@/components/daf/validations/ValidationStatsCharts";
import { DelegationsManager } from "@/components/daf/validations/DelegationsManager";
import { MODULES } from "@/lib/rbac/modules";
import { PageHelp } from "@/components/help/PageHelp";
import { DgValidationsTutorial } from "@/components/help/tutorials/DgValidationsTutorial";

type Tab = "n3" | "circuit" | "stats" | "delegations";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "n3", label: "Mes N3", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
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

function MyN3Tab({ focusId }: { focusId: string | null }) {
  const [type, setType] = useState("");
  const { data, isLoading, refetch } = useDgValidations({ type: type || undefined });

  // Auto-scroll + highlight de l'item ciblé (?focus=<id>) une fois la liste rendue
  useEffect(() => {
    if (!focusId || !data?.items.some((it) => it.id === focusId)) return;
    const el = document.getElementById(`validation-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary-400", "ring-offset-2");
    const t = setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary-400", "ring-offset-2");
    }, 2500);
    return () => clearTimeout(t);
  }, [focusId, data]);

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
        <ValidationsList
          items={data.items}
          onChange={refetch}
          module={MODULES.DG}
          levelLabel="N3"
        />
      )}
    </>
  );
}

export default function DgValidationsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [tab, setTab] = useState<Tab>("n3");

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Validations — vue DG
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Mes N3 (décision finale), vue transverse du circuit, statistiques et délégations.
          </p>
        </div>
        <PageHelp title="Aide — Validations N3 DG"><DgValidationsTutorial /></PageHelp>
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

      {tab === "n3" && <MyN3Tab focusId={focusId} />}
      {tab === "circuit" && <AllCircuitView />}
      {tab === "stats" && <ValidationStatsCharts />}
      {tab === "delegations" && <DelegationsManager />}
    </>
  );
}
