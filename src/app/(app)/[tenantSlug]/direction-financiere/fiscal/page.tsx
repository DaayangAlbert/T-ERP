"use client";

import { useTaxDeadlines } from "@/hooks/useDafFiscal";
import { FiscalKpis } from "@/components/daf/fiscal/FiscalKpis";
import { TaxDeadlinesTable } from "@/components/daf/fiscal/TaxDeadlinesTable";
import { RecentSubmissionsList } from "@/components/daf/fiscal/RecentSubmissionsList";
import { AuditsList } from "@/components/daf/fiscal/AuditsList";
import { PageHelp } from "@/components/help/PageHelp";
import { DafFiscalTutorial } from "@/components/help/tutorials/DafFiscalTutorial";

export default function FiscalPage() {
  const { data, isLoading } = useTaxDeadlines(60);

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Fiscalité &amp; déclarations</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Échéancier réglementaire, dépôts récents, audits en cours.
          </p>
        </div>
        <PageHelp title="Aide — Fiscalité DAF"><DafFiscalTutorial /></PageHelp>
      </header>

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <div className="space-y-4">
          <FiscalKpis summary={data.summary} />
          <TaxDeadlinesTable />
          <div className="grid gap-3 lg:grid-cols-2">
            <RecentSubmissionsList />
            <AuditsList />
          </div>
        </div>
      )}
    </>
  );
}
