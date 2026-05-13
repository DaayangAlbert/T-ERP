"use client";

import { useState } from "react";
import { LayoutDashboard, FileText, Scale, Activity, ShieldCheck, Building2 } from "lucide-react";
import { PnLTable } from "@/components/finance/PnLTable";
import { BalanceSheetView } from "@/components/finance/BalanceSheetView";
import { BfrEvolution } from "@/components/finance/BfrEvolution";
import { CommitmentsTable } from "@/components/finance/CommitmentsTable";
import { BanksTable } from "@/components/finance/BanksTable";
import { useBfr } from "@/hooks/useFinance";
import { clsx } from "clsx";

type Tab = "overview" | "pnl" | "balance" | "bfr" | "commitments" | "banks";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { key: "pnl", label: "Compte de résultat", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "balance", label: "Bilan synthétique", icon: <Scale className="h-3.5 w-3.5" /> },
  { key: "bfr", label: "BFR & trésorerie", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "commitments", label: "Engagements", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "banks", label: "Banques", icon: <Building2 className="h-3.5 w-3.5" /> },
];

function defaultPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState(defaultPeriod());

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Finances</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            P&L, bilan, BFR, engagements, banques — vue stratégique DG.
          </p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2.5 text-[12.5px]"
        />
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

      {tab === "overview" && <Overview period={period} />}
      {tab === "pnl" && <PnLTable period={period} />}
      {tab === "balance" && <BalanceSheetView period={period} />}
      {tab === "bfr" && <BfrEvolution />}
      {tab === "commitments" && <CommitmentsTable />}
      {tab === "banks" && <BanksTable />}
    </>
  );
}

function Overview({ period }: { period: string }) {
  const { data: bfr } = useBfr();
  return (
    <div className="space-y-4">
      <PnLTable period={period} />
      {bfr && <BfrEvolution />}
    </div>
  );
}
