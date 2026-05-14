"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { HistoryPayslip } from "@/hooks/useOuvPayslips";

interface Props {
  payslips: HistoryPayslip[];
  onOpenPdf: (id: string) => void;
}

// Liste compacte des derniers bulletins (4 visibles + "Voir tous"). Chip
// orange/violet pour le mois (chip violet pour le plus récent).
const MONTHS_SHORT = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEP", "OCT", "NOV", "DÉC"];

export function PayslipHistoryList({ payslips, onOpenPdf }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (!payslips.length) return null;
  const visible = showAll ? payslips : payslips.slice(0, 4);

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">
        Mes bulletins · {showAll ? payslips.length : `${Math.min(4, payslips.length)} derniers`}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {visible.map((p, idx) => (
          <PayslipRow
            key={p.id}
            payslip={p}
            isFirst={idx === 0}
            onClick={() => onOpenPdf(p.id)}
            isLast={idx === visible.length - 1}
          />
        ))}
      </div>
      {payslips.length > 4 && !showAll && (
        <p className="mt-2 text-center text-[13px]">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-semibold text-purple-600"
          >
            Voir tous mes bulletins ({payslips.length})
          </button>
        </p>
      )}
    </section>
  );
}

function PayslipRow({
  payslip,
  isFirst,
  isLast,
  onClick,
}: {
  payslip: HistoryPayslip;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const { month, year, label } = parseLabel(payslip.periodLabel, payslip.period);
  const isPaid = payslip.status === "PAID" || payslip.status === "ARCHIVED";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-purple-50 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span
        className={`grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-lg text-center text-[11px] font-extrabold leading-tight ${
          isFirst ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {month}
        <br />
        {year}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-slate-900">{label}</p>
        <p className="truncate text-[12px] text-slate-500">
          Viré le{" "}
          {new Date(payslip.paymentDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          })}
        </p>
      </div>
      <div className="text-right">
        <p
          className="text-[15px] font-extrabold text-slate-900"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {payslip.netAmount.toLocaleString("fr-FR")}
        </p>
        <p className={`text-[11px] font-bold ${isPaid ? "text-emerald-600" : "text-amber-700"}`}>
          {isPaid ? "✓ Payé" : "À valider"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-300" strokeWidth={2} />
    </button>
  );
}

function parseLabel(label: string | null, isoDate: string) {
  const match = label?.match(/^(\d{4})-(\d{2})$/);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : new Date(isoDate);
  const monthIdx = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const monthFr = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return {
    month: MONTHS_SHORT[monthIdx],
    year: String(year).slice(-2),
    label: `${monthFr[monthIdx]} ${year}`,
  };
}
