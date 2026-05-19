"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useDafAccountingDashboard } from "@/hooks/useDafAccounting";
import { AccountingDashboardKpis } from "@/components/daf/accounting/AccountingDashboardKpis";
import { EntriesToValidateTable } from "@/components/daf/accounting/EntriesToValidateTable";
import { BankReconciliationsTable } from "@/components/daf/accounting/BankReconciliationsTable";
import { MonthlyClosingChecklist } from "@/components/daf/accounting/MonthlyClosingChecklist";
import { AnomaliesPanel } from "@/components/daf/accounting/AnomaliesPanel";
import { PendingInvoicesPanel } from "@/components/daf/accounting/PendingInvoicesPanel";
import { TaxCalendarPanel } from "@/components/daf/accounting/TaxCalendarPanel";
import { VariationPanel } from "@/components/daf/accounting/VariationPanel";
import { AuditTrailPanel } from "@/components/daf/accounting/AuditTrailPanel";

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DafComptabilitePage() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useDafAccountingDashboard();

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Comptabilité — supervision DAF
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Validation écritures, rapprochements, préparation clôture.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1">
          <button
            type="button"
            onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[13px] font-semibold text-ink">{period}</span>
          <button
            type="button"
            onClick={() => setPeriod((p) => shiftPeriod(p, +1))}
            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AccountingDashboardKpis kpis={data.kpis} />
          <AnomaliesPanel period={period} />
          <EntriesToValidateTable />
          <div className="grid gap-3 lg:grid-cols-2">
            <BankReconciliationsTable />
            <MonthlyClosingChecklist period={period} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <PendingInvoicesPanel />
            <TaxCalendarPanel />
          </div>
          <VariationPanel period={period} />
          <AuditTrailPanel />
        </div>
      )}
    </>
  );
}
