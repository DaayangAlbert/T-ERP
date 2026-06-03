"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  useDtValidationsPending,
  useDtValidationApprove,
  useDtValidationReject,
  useDtValidationsBulkApprove,
} from "@/hooks/useDtValidations";
import { useDtPortfolio } from "@/hooks/useDtPortfolio";
import { DtValidationsKpis } from "@/components/dt/validations/DtValidationsKpis";
import { DtValidationsTable } from "@/components/dt/validations/DtValidationsTable";
import { DtBulkValidateBar } from "@/components/dt/validations/DtBulkValidateBar";
import { PageHelp } from "@/components/help/PageHelp";
import { DtValidationsTutorial } from "@/components/help/tutorials/DtValidationsTutorial";
import { RejectModal } from "@/components/dt/validations/RejectModal";
import { DtCircuitView } from "@/components/dt/validations/DtCircuitView";
import { DtDelegationsManager } from "@/components/dt/validations/DtDelegationsManager";

type Tab = "n2" | "circuit" | "delegations";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "n2", label: "Mes N2 techniques" },
  { key: "circuit", label: "Tout le circuit technique" },
  { key: "delegations", label: "Délégations DT" },
];

export default function DtValidationsPage() {
  const [tab, setTab] = useState<Tab>("n2");
  const { data, isLoading } = useDtValidationsPending();
  // Récupère la liste des dir. travaux pour le formulaire de délégation
  const { data: portfolio } = useDtPortfolio({ limit: 1 });
  const approve = useDtValidationApprove();
  const reject = useDtValidationReject();
  const bulkApprove = useDtValidationsBulkApprove();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Validations techniques
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data?.kpis.pendingCount ?? "—"} N2 en attente · {data?.kpis.monthValidatedCount ?? "—"} validés ce mois · délai moyen{" "}
            {data?.kpis.avgDelayHours.toFixed(1) ?? "—"} h
          </p>
        </div>
        <PageHelp title="Aide — Validations techniques"><DtValidationsTutorial /></PageHelp>
      </header>

      {data && <DtValidationsKpis kpis={data.kpis} />}

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative px-3 py-2 text-[12.5px] font-medium",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {tab === "n2" && (
        <>
          {isLoading || !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
          ) : (
            <>
              <DtValidationsTable
                items={data.items}
                selectedIds={selected}
                onToggleSelect={toggleSelect}
                onApprove={(id) => approve.mutate({ id })}
                onReject={(id) => setRejectingId(id)}
              />
              <DtBulkValidateBar
                count={selected.size}
                isLoading={bulkApprove.isPending}
                onClear={() => setSelected(new Set())}
                onBulkApprove={() => {
                  bulkApprove.mutate(Array.from(selected));
                  setSelected(new Set());
                }}
              />
            </>
          )}
        </>
      )}

      {tab === "circuit" && <DtCircuitView />}

      {tab === "delegations" && (
        <DtDelegationsManager worksDirectors={portfolio?.facets.managers ?? []} />
      )}

      <RejectModal
        open={rejectingId !== null}
        onCancel={() => setRejectingId(null)}
        onConfirm={async (reason) => {
          if (rejectingId) {
            await reject.mutateAsync({ id: rejectingId, reason });
            setRejectingId(null);
          }
        }}
      />
    </div>
  );
}
