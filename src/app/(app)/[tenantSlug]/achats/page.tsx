"use client";

import { useState } from "react";
import { ShoppingCart, ClipboardCheck, Crown, FileSignature, BarChart3, Package } from "lucide-react";
import { PendingPosTable } from "@/components/purchase/PendingPosTable";
import { OrdersManager } from "@/components/purchase/OrdersManager";
import { ArticlesCatalogue } from "@/components/purchase/ArticlesCatalogue";
import { SupplierCreate } from "@/components/purchase/SupplierCreate";
import { SuppliersTable } from "@/components/purchase/SuppliersTable";
import { FrameworkContractsTable } from "@/components/purchase/FrameworkContractsTable";
import { PurchaseAnalytics } from "@/components/purchase/PurchaseAnalytics";
import { usePendingPos } from "@/hooks/usePurchase";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { clsx } from "clsx";

type Tab = "orders" | "pending" | "articles" | "suppliers" | "contracts" | "analytics";

const ALL_TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "orders", label: "Bons de commande", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  { key: "pending", label: "À valider", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  { key: "articles", label: "Articles", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "suppliers", label: "Fournisseurs stratégiques", icon: <Crown className="h-3.5 w-3.5" /> },
  { key: "contracts", label: "Contrats-cadres", icon: <FileSignature className="h-3.5 w-3.5" /> },
  { key: "analytics", label: "Analyse achats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

export default function AchatsPage() {
  // La validation des bons de commande relève du DG. Les rôles qui ne valident
  // pas au niveau DG (chargé des achats, DAF…) ne voient pas l'onglet « À valider ».
  const canValidateDg = useAccess(MODULES.DG).canValidate;
  const TABS = ALL_TABS.filter((t) => t.key !== "pending" || canValidateDg);
  const [tab, setTab] = useState<Tab>(canValidateDg ? "pending" : "orders");
  const { data: pending } = usePendingPos();
  const pendingCount = pending?.summary.total ?? 0;

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">Achats</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Validations DG, fournisseurs stratégiques, contrats-cadres et analyse.
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
            {t.key === "pending" && pendingCount > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersManager />}
      {tab === "pending" && <PendingPosTable />}
      {tab === "articles" && <ArticlesCatalogue />}
      {tab === "suppliers" && (
        <>
          <SupplierCreate />
          <SuppliersTable />
        </>
      )}
      {tab === "contracts" && <FrameworkContractsTable />}
      {tab === "analytics" && <PurchaseAnalytics />}
    </>
  );
}
