"use client";

import { useState } from "react";
import { useDafValidations } from "@/hooks/useDafValidations";
import { ValidationsKpis } from "@/components/daf/validations/ValidationsKpis";
import { ValidationsList } from "@/components/daf/validations/ValidationsList";
import { clsx } from "clsx";

const TYPE_TABS = [
  { key: "", label: "Tous" },
  { key: "PAYROLL", label: "Paie" },
  { key: "PURCHASE", label: "Achats" },
  { key: "EXPENSE", label: "Dépenses" },
  { key: "CONTRACT", label: "Marchés" },
  { key: "HIRING", label: "Embauches" },
  { key: "LEAVE", label: "Congés" },
];

export default function DafValidationsPage() {
  const [type, setType] = useState("");
  const { data, isLoading, refetch } = useDafValidations({ type: type || undefined });

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Validations N2</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Vos validations DAF en attente. Workflow visuel inline et validation en lot.
        </p>
      </header>

      {data && <div className="mb-4"><ValidationsKpis summary={data.summary} /></div>}

      {/* Onglets — scroll-x sur mobile */}
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
