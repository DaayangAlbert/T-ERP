"use client";

import { useState } from "react";
import { CheckSquare, FileText, Users, FileSignature, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { PoN2PendingTable } from "@/components/daf/purchase/PoN2PendingTable";
import { SuppliersFinancialTable } from "@/components/daf/purchase/SuppliersFinancialTable";
import { CommitmentsTable } from "@/components/daf/purchase/CommitmentsTable";
import { ProvisionsList } from "@/components/daf/purchase/ProvisionsList";
import { PendingPosTable } from "@/components/purchase/PendingPosTable";
import { FrameworkContractsTable } from "@/components/purchase/FrameworkContractsTable";
import { usePoN2Pending } from "@/hooks/useDafPurchase";
import { PageHelp } from "@/components/help/PageHelp";
import { DafAchatsTutorial } from "@/components/help/tutorials/DafAchatsTutorial";

type Tab = "n2" | "orders" | "suppliers" | "contracts" | "commitments";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "n2", label: "À valider N2", icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { key: "orders", label: "Bons de commande", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "suppliers", label: "Fournisseurs et conditions", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "contracts", label: "Contrats-cadres", icon: <FileSignature className="h-3.5 w-3.5" /> },
  { key: "commitments", label: "Engagements et provisions", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
];

export default function DafAchatsPage() {
  const [tab, setTab] = useState<Tab>("n2");
  const { data: n2 } = usePoN2Pending();
  const n2Count = n2?.summary.total ?? 0;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Achats — supervision DAF
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Validation N2 (5 M – 50 M), suivi financier des fournisseurs, engagements et provisions.
          </p>
        </div>
        <PageHelp title="Aide — Achats DAF"><DafAchatsTutorial /></PageHelp>
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
            {t.key === "n2" && n2Count > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {n2Count}
              </span>
            )}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "n2" && <PoN2PendingTable />}
      {tab === "orders" && <PendingPosTable />}
      {tab === "suppliers" && <SuppliersFinancialTable />}
      {tab === "contracts" && <FrameworkContractsTable />}
      {tab === "commitments" && (
        <div className="space-y-4">
          <CommitmentsTable />
          <ProvisionsList />
        </div>
      )}
    </>
  );
}
