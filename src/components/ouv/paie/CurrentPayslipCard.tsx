"use client";

import { FileText, Share2, Loader2 } from "lucide-react";
import type { CurrentPayslipResponse } from "@/hooks/useOuvPayslips";

interface Props {
  payslip: CurrentPayslipResponse["payslip"];
  onOpenPdf: () => void;
  onShareWhatsapp: () => void;
  sharing: boolean;
}

// Card gradient violet (#2A1B3D → #7E22CE) avec montant 32px + 2 boutons
// "Voir bulletin" (blanc · violet) et "WhatsApp" (vert #25D366).
// Mirror direct du bloc "Bulletin actuel" de screen-ouv-paie.
export function CurrentPayslipCard({ payslip, onOpenPdf, onShareWhatsapp, sharing }: Props) {
  if (!payslip) {
    return (
      <div className="mb-3.5 rounded-2xl bg-gradient-to-br from-[#2A1B3D] to-[#7E22CE] p-5 text-white">
        <p className="text-[13px] uppercase tracking-wide opacity-80">Aucun bulletin émis</p>
        <p className="mt-2 text-[15px] opacity-90">
          Ton premier bulletin sera disponible à la fin du mois en cours.
        </p>
      </div>
    );
  }

  const monthLabel = formatPeriod(payslip.periodLabel, payslip.period);
  const statusChip = renderStatusChip(payslip.status);

  return (
    <article className="mb-3.5 rounded-2xl bg-gradient-to-br from-[#2A1B3D] to-[#7E22CE] p-5 text-white shadow-[0_4px_16px_rgba(126,34,206,0.25)]">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold uppercase tracking-wide opacity-80">
            Bulletin {monthLabel}
          </p>
          <p className="mt-1.5 text-[32px] font-extrabold leading-tight">
            {payslip.netAmount.toLocaleString("fr-FR")}{" "}
            <span className="text-[16px] font-semibold opacity-85">FCFA</span>
          </p>
          <p className="mt-1 text-[13px] opacity-85">
            Net à payer · viré le{" "}
            {new Date(payslip.paymentDate).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
        </div>
        {statusChip}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenPdf}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[14px] font-bold text-purple-700 transition active:scale-[0.98]"
        >
          <FileText className="h-5 w-5" />
          Voir bulletin
        </button>
        <button
          type="button"
          onClick={onShareWhatsapp}
          disabled={sharing}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[14px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {sharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          WhatsApp
        </button>
      </div>
    </article>
  );
}

function renderStatusChip(status: string) {
  const isPaid = status === "PAID" || status === "ARCHIVED";
  return (
    <span
      className={`flex-shrink-0 rounded-md border px-3 py-1 text-[11px] font-bold ${
        isPaid
          ? "border-emerald-400/50 bg-emerald-400/25 text-white"
          : "border-amber-400/50 bg-amber-400/25 text-white"
      }`}
    >
      {isPaid ? "✓ Payé" : "À valider"}
    </span>
  );
}

function formatPeriod(label: string | null, isoDate: string): string {
  if (label) {
    const match = label.match(/^(\d{4})-(\d{2})$/);
    if (match) {
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
  }
  return new Date(isoDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
