"use client";

import { useState } from "react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useComplianceDashboard, useRegisters } from "@/hooks/useSgCompliance";
import { ComplianceHeader } from "@/components/sg/conformite/ComplianceHeader";
import { ComplianceStatusCard } from "@/components/sg/conformite/ComplianceStatusCard";
import { UpcomingDeadlinesTable } from "@/components/sg/conformite/UpcomingDeadlinesTable";
import { RegistersGrid } from "@/components/sg/conformite/RegistersGrid";
import { RegisterDetailDrawer } from "@/components/sg/conformite/RegisterDetailDrawer";

export default function ConformitePage() {
  // Matrice : FULL sur SG pour SECRETARY_GENERAL/SG/TENANT_ADMIN, READ pour DG.
  const readOnly = !useAccess(MODULES.SG).canEdit;

  const dashQ = useComplianceDashboard();
  const regsQ = useRegisters();

  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }
  function exportAudit() {
    showToast(`Rapport audit conformité — ${dashQ.data?.complianceScore ?? "…"}% (export PDF à implémenter)`);
  }

  if (dashQ.isLoading && !dashQ.data) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }
  if (dashQ.isError || !dashQ.data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
        Impossible de charger les données de conformité.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ComplianceHeader
        complianceScore={dashQ.data.complianceScore}
        registersCount={dashQ.data.counts.registers}
        approvalsTotal={dashQ.data.counts.approvalsTotal}
        deadlines90d={dashQ.data.counts.deadlines90d}
        onExportAudit={exportAudit}
      />

      <ComplianceStatusCard data={dashQ.data} />

      <UpcomingDeadlinesTable deadlines={dashQ.data.deadlines} />

      {regsQ.data && <RegistersGrid items={regsQ.data.items} onOpen={setOpenId} />}

      <RegisterDetailDrawer
        registerId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
