"use client";

import { FileText, Banknote, ShieldCheck, Receipt } from "lucide-react";

interface Props {
  period: string;
}

export function PayrollActionsCard({ period }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Actions DAF disponibles
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <ActionLink icon={<FileText className="h-4 w-4 text-primary-500" />} label="État complet de paie" period={period} type="full" />
        <ActionLink icon={<Banknote className="h-4 w-4 text-success" />} label="Ordre de virement multi-banques" period={period} type="wire-order" />
        <ActionLink icon={<ShieldCheck className="h-4 w-4 text-warning" />} label="DIPE CNPS" period={period} type="dipe" />
        <ActionLink icon={<Receipt className="h-4 w-4 text-info" />} label="État IRPP" period={period} type="irpp" />
      </div>
      <p className="mt-3 text-[10.5px] text-ink-3">
        ⓘ V1 : génération PDF synthétique. La conformité officielle CNPS / DGI nécessite
        validation expert paie.
      </p>
    </section>
  );
}

function ActionLink({ icon, label, period, type }: { icon: React.ReactNode; label: string; period: string; type: string }) {
  return (
    <a
      href={`/api/daf/payroll/${period}/state-pdf?type=${type}`}
      className="flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3 py-2.5 text-[12.5px] hover:border-primary-300 hover:bg-primary-50"
    >
      {icon}
      <span className="text-ink-2">{label}</span>
    </a>
  );
}
