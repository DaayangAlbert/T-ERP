"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Award, Gift, Wallet, PiggyBank, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { PerformanceBonusesHistory } from "@/components/payroll/PerformanceBonusesHistory";
import { BenefitsTable } from "@/components/payroll/BenefitsTable";
import { useBonuses } from "@/hooks/useDgProfile";

type Tab = "bonuses" | "benefits" | "savings";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "bonuses", label: "Bonus performance financière", icon: <Award className="h-3.5 w-3.5" /> },
  { key: "benefits", label: "Avantages DAF", icon: <Gift className="h-3.5 w-3.5" /> },
  { key: "savings", label: "Plan d'épargne entreprise", icon: <PiggyBank className="h-3.5 w-3.5" /> },
];

function fmt(amount: string | null): string {
  if (!amount) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(Number(amount))} FCFA`;
}

function BonusProvisionBanner() {
  const { data } = useBonuses();
  const year = new Date().getFullYear();
  const yearItems = (data?.items ?? []).filter((b) => b.fiscalYear === year);
  if (yearItems.length === 0) return null;
  const totalProvisioned = yearItems
    .filter((b) => b.status === "PROVISIONED" || b.status === "VALIDATED")
    .reduce((s, b) => s + (b.actualAmount ? BigInt(b.actualAmount) : 0n), 0n);

  return (
    <div className="rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-primary-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[13px] font-semibold text-primary-900">Provision bonus en cours · exercice {year}</h3>
          <p className="text-[12px] text-primary-700">
            Total provisionné à date :{" "}
            <span className="font-mono font-bold">{fmt(totalProvisioned.toString())}</span> sur{" "}
            <span className="font-mono">{yearItems.length}</span> mécanisme{yearItems.length > 1 ? "s" : ""} de bonus DAF.
          </p>
        </div>
      </div>
    </div>
  );
}

function SavingsPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center">
      <PiggyBank className="mx-auto h-8 w-8 text-ink-3" />
      <h3 className="mt-2 text-[13px] font-semibold text-ink">Plan d&apos;épargne entreprise (placeholder)</h3>
      <p className="mt-1 text-[12px] text-ink-3">
        Module à venir : épargne salariale + abondement employeur + déblocage anticipé.
      </p>
    </div>
  );
}

export default function DafPaiePersoPage() {
  const [tab, setTab] = useState<Tab>("bonuses");

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <Link href="/paie" className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à ma paie
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Ma rémunération DAF
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Bonus performance financière, avantages spécifiques DAF et plan d&apos;épargne.
        </p>
      </header>

      <BonusProvisionBanner />

      <div className="my-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
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

      {tab === "bonuses" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-3">
            <h3 className="text-[13px] font-semibold text-ink">Mécanismes de bonus DAF</h3>
            <ul className="mt-2 space-y-1.5 text-[12px] text-ink">
              <li className="flex items-start gap-2"><Wallet className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-600" /> <span><b>Bonus annuel sur résultat net</b> — 1 % du résultat net, déclenché si seuil atteint.</span></li>
              <li className="flex items-start gap-2"><Wallet className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-600" /> <span><b>Bonus DSO</b> — prime au prorata de la réduction du DSO (vs N-1).</span></li>
              <li className="flex items-start gap-2"><Wallet className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-600" /> <span><b>Bonus conformité fiscale</b> — prime fixe si 100 % des dépôts dans les délais.</span></li>
            </ul>
          </div>
          <PerformanceBonusesHistory />
        </div>
      )}
      {tab === "benefits" && <BenefitsTable />}
      {tab === "savings" && <SavingsPlaceholder />}
    </>
  );
}
