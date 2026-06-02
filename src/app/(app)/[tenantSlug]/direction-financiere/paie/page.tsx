"use client";

import { CheckCircle2 } from "lucide-react";
import { useCurrentPayrollCycle, useValidatePayrollN2 } from "@/hooks/useDafPayroll";
import { useAuth } from "@/hooks/useAuth";
import { PayrollWorkflowBar } from "@/components/daf/payroll/PayrollWorkflowBar";
import { PayrollKpis } from "@/components/daf/payroll/PayrollKpis";
import { PayrollWarningsList } from "@/components/daf/payroll/PayrollWarningsList";
import { PayrollActionsCard } from "@/components/daf/payroll/PayrollActionsCard";
import { PayrollMassChart } from "@/components/daf/payroll/PayrollMassChart";
import { PageHelp } from "@/components/help/PageHelp";
import { DafPaieTutorial } from "@/components/help/tutorials/DafPaieTutorial";

export default function DafPayrollPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useCurrentPayrollCycle();
  const validate = useValidatePayrollN2(data?.period ?? "");

  if (isError) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Aucun cycle de paie. Lancez le seed.</div>;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const canValidate =
    user?.role === "DAF" && (data.status === "N2_PENDING" || data.status === "N1_PENDING");
  const onValidate = async () => {
    if (!confirm(`Valider la paie ${data.period} en N2 ?\n\nLe DG sera notifié pour validation N3.`)) return;
    try {
      await validate.mutateAsync();
      alert("Paie validée N2. Notification DG envoyée.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Cycle de paie · {data.period}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Pilotage mensuel : statut, contrôles, validation N2, états officiels.
          </p>
        </div>
        <PageHelp title="Aide — Cycle de paie DAF"><DafPaieTutorial /></PageHelp>
      </header>

      <div className="space-y-4 pb-20 sm:pb-4">
        <PayrollWorkflowBar currentStatus={data.status} />

        <PayrollKpis
          bulletins={data.totalBulletins}
          grossAmount={data.grossAmount}
          employerCharges={data.employerCharges}
          netToPay={data.netToPay}
        />

        <PayrollWarningsList warnings={data.warnings} />

        <div className="grid gap-3 lg:grid-cols-2">
          <PayrollActionsCard period={data.period} />
          <PayrollMassChart data={data.massHistory} />
        </div>
      </div>

      {/* Bouton sticky bottom mobile / inline desktop */}
      {canValidate && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:static sm:p-0 sm:shadow-none sm:bg-transparent sm:border-0">
          <button
            type="button"
            onClick={onValidate}
            disabled={validate.isPending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-[14px] font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:h-10 sm:w-auto sm:text-[13px]"
          >
            <CheckCircle2 className="h-5 w-5" />
            {validate.isPending ? "Validation…" : `Valider la paie ${data.period} (N2)`}
          </button>
        </div>
      )}
    </>
  );
}
