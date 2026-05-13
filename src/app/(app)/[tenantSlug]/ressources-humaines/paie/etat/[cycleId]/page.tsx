"use client";

import { useQuery } from "@tanstack/react-query";
import { PayrollStateView } from "@/components/payroll/PayrollStateView";
import type { PayrollStateData } from "@/lib/payroll/build-payroll-state";

async function fetchPayrollState(cycleId: string): Promise<PayrollStateData> {
  const res = await fetch(`/api/rh/payroll/cycles/${cycleId}/state`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Erreur etat des salaires");
  }
  return res.json();
}

export default function RhPayrollStatePage({ params }: { params: { cycleId: string } }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rh", "payroll", "state", params.cycleId],
    queryFn: () => fetchPayrollState(params.cycleId),
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error instanceof Error ? error.message : "Etat des salaires introuvable"}
      </div>
    );
  }

  return (
    <PayrollStateView
      state={data}
      pdfHref={`/api/rh/payroll/cycles/${params.cycleId}/state-pdf`}
      exportHref={`/api/daf/payroll/${data.cycle.period}/state-pdf?type=csv`}
    />
  );
}
