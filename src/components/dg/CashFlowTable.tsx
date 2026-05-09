import { clsx } from "clsx";
import type { WeeklyRow } from "@/hooks/useDgCashflow";
import { formatFCFA } from "@/lib/format";

interface Props {
  weeks: WeeklyRow[];
}

const LEVEL_LABEL = { ok: "Sain", warning: "Vigilance", critical: "Critique" } as const;
const LEVEL_TONE = {
  ok: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
} as const;

function fmt(v: number, options: { signed?: boolean } = {}) {
  if (v === 0) return "—";
  const sign = options.signed && v > 0 ? "+ " : v < 0 ? "- " : "";
  return sign + formatFCFA(Math.abs(v));
}

export function CashFlowTable({ weeks }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Détail semaine par semaine</h2>
        <span className="text-[11.5px] text-ink-3">{weeks.length} semaines</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-[12px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2.5 pl-4 text-left">Sem.</th>
              <th className="py-2.5 text-right">Solde début</th>
              <th className="py-2.5 text-right">Encais. clients</th>
              <th className="py-2.5 text-right">Autres entrées</th>
              <th className="py-2.5 text-right">Total entrées</th>
              <th className="py-2.5 text-right">Fournisseurs</th>
              <th className="py-2.5 text-right">Salaires</th>
              <th className="py-2.5 text-right">Fiscalité</th>
              <th className="py-2.5 text-right">Total sorties</th>
              <th className="py-2.5 text-right">Solde fin</th>
              <th className="py-2.5 pr-4 text-left">État</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {weeks.map((w, i) => (
              <tr
                key={w.weekIndex}
                className={clsx("transition hover:bg-surface-alt", i < weeks.length - 1 && "border-b border-line")}
              >
                <td className="py-2 pl-4 font-bold text-ink">
                  <span className="block">{w.weekLabel}</span>
                  <span className="block text-[10px] font-normal text-ink-3 font-sans">
                    {new Date(w.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </td>
                <td className="py-2 text-right text-ink-2">{fmt(w.openingBalance)}</td>
                <td className="py-2 text-right text-success">{fmt(w.clientPayments, { signed: true })}</td>
                <td className="py-2 text-right text-success">{fmt(w.otherIncome, { signed: true })}</td>
                <td className="py-2 text-right font-semibold text-success">{fmt(w.totalIncome, { signed: true })}</td>
                <td className="py-2 text-right text-danger">{fmt(-w.suppliers, { signed: true })}</td>
                <td className="py-2 text-right text-danger">{fmt(-w.salaries, { signed: true })}</td>
                <td className="py-2 text-right text-danger">{fmt(-w.taxes, { signed: true })}</td>
                <td className="py-2 text-right font-semibold text-danger">{fmt(-w.totalExpense, { signed: true })}</td>
                <td
                  className={clsx(
                    "py-2 text-right font-bold",
                    w.level === "critical" ? "text-danger" : w.level === "warning" ? "text-warning" : "text-ink"
                  )}
                >
                  {fmt(w.closingBalance)}
                </td>
                <td className="py-2 pr-4 font-sans">
                  <span
                    className={clsx(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      LEVEL_TONE[w.level]
                    )}
                  >
                    {LEVEL_LABEL[w.level]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
