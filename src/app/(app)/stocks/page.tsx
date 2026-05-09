"use client";

import { useState } from "react";
import { Package, Wrench, Building, Activity, ClipboardList, ShieldOff } from "lucide-react";
import { FixedAssetsTable } from "@/components/stocks/FixedAssetsTable";
import { RenewalPlan } from "@/components/stocks/RenewalPlan";
import { MovementsTable } from "@/components/stocks/MovementsTable";
import { InventoriesTable } from "@/components/stocks/InventoriesTable";
import { LossesTable } from "@/components/stocks/LossesTable";
import { clsx } from "clsx";

type Tab = "stocks" | "equipment" | "patrimoine" | "movements" | "inventories" | "losses";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "stocks", label: "Stocks", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "equipment", label: "Matériel", icon: <Wrench className="h-3.5 w-3.5" /> },
  { key: "patrimoine", label: "Patrimoine", icon: <Building className="h-3.5 w-3.5" /> },
  { key: "movements", label: "Mouvements", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "inventories", label: "Inventaires", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { key: "losses", label: "Sinistres", icon: <ShieldOff className="h-3.5 w-3.5" /> },
];

export default function StocksPage() {
  const [tab, setTab] = useState<Tab>("patrimoine");

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">Stocks &amp; matériel</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Vue DG : valorisation patrimoniale, mouvements, inventaires et sinistres.
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

      {(tab === "stocks" || tab === "equipment") && (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">{tab === "stocks" ? "Liste des stocks" : "Liste du matériel"}</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Module opérationnel à venir. Pour le DG, utilisez les onglets « Patrimoine », « Mouvements », « Inventaires » et « Sinistres ».
          </p>
        </div>
      )}
      {tab === "patrimoine" && (
        <div className="space-y-4">
          <FixedAssetsTable />
          <RenewalPlan />
        </div>
      )}
      {tab === "movements" && <MovementsTable />}
      {tab === "inventories" && <InventoriesTable />}
      {tab === "losses" && <LossesTable />}
    </>
  );
}
