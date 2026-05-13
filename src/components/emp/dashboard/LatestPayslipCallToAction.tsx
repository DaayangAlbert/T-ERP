import Link from "next/link";
import { Banknote, ArrowRight } from "lucide-react";
import { formatFcfa, formatPeriodLabel, formatDateShort } from "@/lib/emp-format";

interface Props {
  payslip: {
    id: string;
    periodLabel: string | null;
    netAmount: number;
    paymentDate: string;
    paymentBankAccount: string | null;
    status: string;
  } | null;
}

/**
 * Carte CTA mise en avant en tête du dashboard quand un bulletin est dispo.
 * Touch target final ≥ 52 px (cf. spec). Lien profond vers la fiche bulletin.
 */
export function LatestPayslipCallToAction({ payslip }: Props) {
  if (!payslip) return null;
  const bank = payslip.paymentBankAccount?.split("·")[0]?.trim() ?? "votre banque";

  return (
    <Link
      href={`/employe/paie?bulletin=${payslip.id}`}
      className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-4 py-4 text-white shadow-lg transition active:scale-[0.99]"
      data-testid="emp-cta-payslip"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Banknote className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider opacity-80">
          💰 Nouveau bulletin de paie disponible
        </p>
        <p className="mt-0.5 text-sm font-semibold">
          {formatPeriodLabel(payslip.periodLabel, payslip.paymentDate)} · net {formatFcfa(payslip.netAmount)}
        </p>
        <p className="text-[11px] opacity-90">
          viré sur {bank} le {formatDateShort(payslip.paymentDate)}
        </p>
      </div>
      <div className="flex h-[52px] min-w-[52px] items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-purple-700">
        Voir <ArrowRight className="ml-1 h-4 w-4" />
      </div>
    </Link>
  );
}
