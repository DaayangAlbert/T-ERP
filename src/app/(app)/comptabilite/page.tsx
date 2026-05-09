"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, BookOpen, Scale, Lock, FileBarChart, ArrowRight } from "lucide-react";
import { GeneralLedger } from "@/components/accounting/GeneralLedger";
import { BalanceSheet } from "@/components/accounting/BalanceSheet";
import { PeriodsTable } from "@/components/accounting/PeriodsTable";
import { SyscohadaStateCard } from "@/components/accounting/SyscohadaStateCard";
import { useClosure } from "@/hooks/useAccounting";
import { clsx } from "clsx";

type Tab = "entries" | "ledger" | "balance" | "periods" | "syscohada";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "entries", label: "Écritures", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "ledger", label: "Grand livre", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { key: "balance", label: "Balance", icon: <Scale className="h-3.5 w-3.5" /> },
  { key: "periods", label: "Clôtures", icon: <Lock className="h-3.5 w-3.5" /> },
  { key: "syscohada", label: "États SYSCOHADA", icon: <FileBarChart className="h-3.5 w-3.5" /> },
];

function defaultPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ComptabilitePage() {
  const [tab, setTab] = useState<Tab>("entries");
  const [period, setPeriod] = useState(defaultPeriod());
  const lastYear = new Date().getFullYear() - 1;
  const { data: closure } = useClosure(lastYear);
  const requiresValidation = closure?.status === "PENDING_DG_VALIDATION" || closure?.status === "IN_PROGRESS";

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Comptabilité</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Grand livre, balance, clôtures, états SYSCOHADA et validation des comptes annuels.
          </p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2.5 text-[12.5px]"
        />
      </header>

      {requiresValidation && (
        <Link
          href={`/comptabilite/cloture/${lastYear}`}
          className="mb-4 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/5 p-4 hover:border-warning"
        >
          <div>
            <h3 className="text-[13px] font-semibold text-warning">
              Comptes annuels {lastYear} en attente de votre validation
            </h3>
            <p className="text-[12px] text-warning/80">
              Ouvrir le workflow de clôture annuelle (5 étapes).
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-warning" />
        </Link>
      )}

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

      {tab === "entries" && (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">Saisie des écritures</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Module de saisie disponible dans une livraison ultérieure (Bloc 6 — Pilotage administratif).
            Pour l'instant, les écritures sont seedées en base pour faire fonctionner Grand livre, Balance et Clôtures.
          </p>
        </div>
      )}
      {tab === "ledger" && <GeneralLedger />}
      {tab === "balance" && <BalanceSheet />}
      {tab === "periods" && <PeriodsTable />}
      {tab === "syscohada" && <SyscohadaStateCard period={period} />}
    </>
  );
}
