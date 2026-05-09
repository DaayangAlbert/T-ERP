import { clsx } from "clsx";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CashFlowType } from "@prisma/client";
import type { MajorDueDate } from "@/hooks/useDgCashflow";
import { formatFCFA, formatDate } from "@/lib/format";

interface Props {
  items: MajorDueDate[];
}

const CATEGORY_LABEL: Record<string, string> = {
  CLIENT_PAYMENT: "Encaissement client",
  SUPPLIER: "Règlement fournisseur",
  SALARY: "Paie",
  TAX_VAT: "TVA",
  TAX_CNPS: "CNPS",
  TAX_IRPP: "IRPP",
  OTHER: "Autre",
};

function criticality(daysAhead: number, probability: number): { label: string; tone: "danger" | "warning" | "info" } {
  if (daysAhead <= 7) {
    return probability < 80 ? { label: "Critique", tone: "danger" } : { label: "Imminent", tone: "warning" };
  }
  if (daysAhead <= 21) return { label: "À surveiller", tone: "warning" };
  return { label: "Planifié", tone: "info" };
}

export function MajorDueDates({ items }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold text-ink">Échéances majeures à risque</h2>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-3">
          Aucune échéance supérieure à 50 M FCFA sur l'horizon.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((it) => {
            const daysAhead = Math.max(
              0,
              Math.round((new Date(it.expectedDate).getTime() - Date.now()) / 86_400_000)
            );
            const crit = criticality(daysAhead, it.probability);
            const isIncome = it.type === CashFlowType.INCOME;
            return (
              <li key={it.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className={clsx(
                        "mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md",
                        isIncome ? "bg-green-50 text-success" : "bg-rose-50 text-danger"
                      )}
                    >
                      {isIncome ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">{it.label}</div>
                      <div className="text-[11px] text-ink-3">
                        {CATEGORY_LABEL[it.category] ?? it.category}
                        {" · "}
                        {formatDate(it.expectedDate)} ({daysAhead} j)
                        {it.probability < 100 && ` · ${it.probability} % probable`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={clsx(
                        "font-mono text-[13px] font-semibold tabular-nums",
                        isIncome ? "text-success" : "text-danger"
                      )}
                    >
                      {isIncome ? "+ " : "- "}
                      {formatFCFA(BigInt(it.amount))}
                    </div>
                    <span
                      className={clsx(
                        "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                        crit.tone === "danger"
                          ? "bg-rose-50 text-rose-700 ring-rose-200"
                          : crit.tone === "warning"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-blue-50 text-blue-700 ring-blue-200"
                      )}
                    >
                      {crit.label}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
