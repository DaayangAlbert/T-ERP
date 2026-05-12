import { CheckCircle2, Star } from "lucide-react";

interface Props {
  payslip: {
    periodLabel: string | null;
    period: string;
    netAmount: number;
    grossAmount: number;
    cnpsAmount: number;
    irppAmount: number;
    paymentDate: string;
    paymentReference: string | null;
    paymentBankAccount: string | null;
    status: string;
  };
}

const MONTHS_FR = [
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

function formatFcfa(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function formatPeriod(label: string | null, period: string): string {
  if (label) {
    const [y, m] = label.split("-");
    return `${MONTHS_FR[Number(m) - 1] ?? m} ${y}`;
  }
  const d = new Date(period);
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/**
 * Card focus du dernier bulletin : border-left violet épais, gradient
 * subtil, statut "Payé" en chip vert. 3 chiffres clés en grid (brut /
 * cotisations / net mis en avant sur fond violet).
 *
 * ⚠️ CRITIQUE selon la spec — fait office d'écran d'atterrissage et de
 * pré-visualisation avant téléchargement PDF.
 */
export function LatestPayslipCard({ payslip }: Props) {
  const totalDeductions = payslip.cnpsAmount + payslip.irppAmount;
  return (
    <section className="mt-4">
      <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-3">
        <Star className="h-3.5 w-3.5 text-amber-500" /> Dernier bulletin ·{" "}
        {formatPeriod(payslip.periodLabel, payslip.period)}
      </h2>
      <article className="overflow-hidden rounded-2xl border-l-4 border-purple-600 bg-gradient-to-br from-purple-50 via-white to-white shadow-card">
        <div className="flex items-start justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-ink">
              {formatPeriod(payslip.periodLabel, payslip.period)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              Versé le {formatShortDate(payslip.paymentDate)}
              {payslip.paymentReference ? ` · ${payslip.paymentReference}` : ""}
            </p>
            {payslip.paymentBankAccount && (
              <p className="text-[11px] text-ink-3">{payslip.paymentBankAccount}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {payslip.status === "PAID" ? "Payé" : payslip.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-white p-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-3">Salaire brut</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatFcfa(payslip.grossAmount)}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-3">Cotisations</p>
            <p className="mt-1 text-lg font-semibold text-red-600">− {formatFcfa(totalDeductions)}</p>
            <p className="text-[10px] text-ink-3">
              CNPS {formatFcfa(payslip.cnpsAmount)} · IRPP {formatFcfa(payslip.irppAmount)}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 p-3 text-white">
            <p className="text-[11px] uppercase tracking-wider text-purple-100">Net à payer</p>
            <p className="mt-1 text-xl font-bold">{formatFcfa(payslip.netAmount)}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
