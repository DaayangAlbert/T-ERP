"use client";

import { ShieldCheck, Download } from "lucide-react";

interface Props {
  complianceScore: number;
  registersCount: number;
  approvalsTotal: number;
  deadlines90d: number;
  onExportAudit: () => void;
}

export function ComplianceHeader({
  complianceScore,
  registersCount,
  approvalsTotal,
  deadlines90d,
  onExportAudit,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Conformité réglementaire</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5" />
          SA OHADA · {registersCount} registres légaux · {approvalsTotal} attestations · {deadlines90d}{" "}
          échéance{deadlines90d > 1 ? "s" : ""} dans les 90 jours · Score {complianceScore}%
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportAudit}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
        >
          <Download className="h-4 w-4" /> Rapport audit
        </button>
      </div>
    </div>
  );
}
