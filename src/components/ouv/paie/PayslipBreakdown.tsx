"use client";

import type { CurrentPayslipResponse } from "@/hooks/useOuvPayslips";

interface Props {
  payslip: NonNullable<CurrentPayslipResponse["payslip"]>;
}

// Composition 6 lignes : base, sup, prime (otherBonuses[0] ou transport), CNPS, IRPP, NET.
// Dernière ligne fond violet pâle pour le NET À PAYER.
export function PayslipBreakdown({ payslip }: Props) {
  const monthLabel = formatPeriod(payslip.periodLabel);
  const otherBonusesArray = Array.isArray(payslip.otherBonuses)
    ? (payslip.otherBonuses as Array<{ label?: string; amount?: number }>)
    : [];
  const primeAmount =
    otherBonusesArray.reduce((s, b) => s + (b.amount ?? 0), 0) +
    (payslip.transportAllowance ?? 0) +
    (payslip.seniorityBonus ?? 0);
  const primeLabel =
    otherBonusesArray[0]?.label ??
    (payslip.transportAllowance > 0 ? "Indemnité transport · panier repas" : "Prime ancienneté");

  const hourlyRate =
    payslip.reportedHours > 0 ? Math.round(payslip.baseSalary / payslip.reportedHours) : null;

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Composition {monthLabel}</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <Row
          label="Salaire de base"
          sub={
            hourlyRate != null
              ? `${payslip.reportedHours.toFixed(0)} h × ${hourlyRate.toLocaleString("fr-FR")} FCFA/h`
              : payslip.workedDays > 0
                ? `${payslip.workedDays} jours travaillés`
                : "Base mensuelle"
          }
          value={payslip.baseSalary}
        />
        {payslip.overtimeAmount > 0 && (
          <Row
            label="Heures supplémentaires"
            sub={`${payslip.overtimeHours.toFixed(1)} h × majoration 125 %`}
            value={payslip.overtimeAmount}
            tone="positive"
          />
        )}
        {primeAmount > 0 && (
          <Row label="Prime chantier" sub={primeLabel} value={primeAmount} tone="positive" />
        )}
        {payslip.cnpsAmount > 0 && (
          <Row
            label="CNPS salarié"
            sub="4,2 % part salarié"
            value={payslip.cnpsAmount}
            tone="negative"
          />
        )}
        {payslip.irppAmount > 0 && (
          <Row
            label="IRPP retenu"
            sub="Tranche selon barème"
            value={payslip.irppAmount}
            tone="negative"
          />
        )}
        {payslip.otherDeductions > 0 && (
          <Row
            label="Autres retenues"
            sub="Avances, dommages, etc."
            value={payslip.otherDeductions}
            tone="negative"
          />
        )}
        <NetRow value={payslip.netAmount} />
      </div>
    </section>
  );
}

type Tone = "positive" | "negative" | "neutral";

function Row({
  label,
  sub,
  value,
  tone = "neutral",
}: {
  label: string;
  sub: string;
  value: number;
  tone?: Tone;
}) {
  const color =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-slate-900";
  const sign = tone === "positive" ? "+ " : tone === "negative" ? "− " : "";
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-slate-900">{label}</p>
        <p className="truncate text-[12px] text-slate-500">{sub}</p>
      </div>
      <p
        className={`text-[16px] font-extrabold ${color}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {sign}
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function NetRow({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-between bg-purple-50 px-4 py-3.5">
      <p className="text-[15px] font-extrabold uppercase text-slate-900">Net à payer</p>
      <p
        className="text-[20px] font-extrabold text-purple-700"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function formatPeriod(label: string | null): string {
  if (!label) return "";
  const match = label.match(/^(\d{4})-(\d{2})$/);
  if (!match) return label;
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${months[Number(match[2]) - 1]} ${match[1]}`;
}
