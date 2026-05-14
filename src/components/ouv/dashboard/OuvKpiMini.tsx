"use client";

interface Props {
  lastNetSalary: number;
  lastPaymentDate: string | null;
  leavesRemaining: number;
}

// 2 mini-KPIs côte-à-côte : salaire du dernier bulletin payé + congés restants.
// Format compact "142,5 K" pour éviter d'écraser le mobile 414px.
export function OuvKpiMini({ lastNetSalary, lastPaymentDate, leavesRemaining }: Props) {
  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2.5">
      <KpiCard
        label="Salaire avril"
        value={formatKShort(lastNetSalary)}
        unit={lastNetSalary >= 1000 ? "K" : "FCFA"}
        sub={
          lastPaymentDate
            ? `✓ Viré ${new Date(lastPaymentDate).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              })}`
            : "En attente"
        }
        subColor="text-emerald-600"
      />
      <KpiCard
        label="Congés restants"
        value={String(Math.round(leavesRemaining))}
        unit="jours"
        sub={`cumul ${new Date().getFullYear()}`}
        subColor="text-slate-500"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-[22px] font-extrabold leading-none text-slate-900">
        {value} <span className="text-[13px] font-medium text-slate-500">{unit}</span>
      </p>
      <p className={`mt-1 text-[11px] font-semibold ${subColor}`}>{sub}</p>
    </div>
  );
}

function formatKShort(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  }
  return n.toLocaleString("fr-FR");
}
