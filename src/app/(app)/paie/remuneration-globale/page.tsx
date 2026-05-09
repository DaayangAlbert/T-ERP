"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BarChart3, Gift, Award, FileText, LogOut } from "lucide-react";
import { TotalCompensationPyramid } from "@/components/payroll/TotalCompensationPyramid";
import { BenefitsTable } from "@/components/payroll/BenefitsTable";
import { PerformanceBonusesHistory } from "@/components/payroll/PerformanceBonusesHistory";
import { IncomeAttestationGenerator } from "@/components/payroll/IncomeAttestationGenerator";
import { StcSimulator } from "@/components/payroll/StcSimulator";
import { clsx } from "clsx";

type Tab = "pyramid" | "benefits" | "bonuses" | "fiscal" | "stc";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "pyramid", label: "Pyramide rémunération", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "benefits", label: "Avantages en nature", icon: <Gift className="h-3.5 w-3.5" /> },
  { key: "bonuses", label: "Primes performance", icon: <Award className="h-3.5 w-3.5" /> },
  { key: "fiscal", label: "Déclarations fiscales", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "stc", label: "Simulation STC", icon: <LogOut className="h-3.5 w-3.5" /> },
];

export default function RemunerationGlobalePage() {
  const [tab, setTab] = useState<Tab>("pyramid");

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link href="/paie" className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à ma paie
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">Rémunération globale annuelle</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Vue exhaustive : salaire, bonus, avantages en nature, déclarations fiscales et simulation STC.
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

      {tab === "pyramid" && <TotalCompensationPyramid />}
      {tab === "benefits" && <BenefitsTable />}
      {tab === "bonuses" && <PerformanceBonusesHistory />}
      {tab === "fiscal" && <IncomeAttestationGenerator />}
      {tab === "stc" && <StcSimulator />}
    </>
  );
}
