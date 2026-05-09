import { ArrowRight, GitBranch } from "lucide-react";
import type { IntragroupTx } from "@/hooks/useDgConsolidation";
import { formatDate, formatFCFA } from "@/lib/format";

interface Props {
  transactions: IntragroupTx[];
}

export function IntragroupTransactions({ transactions }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-ink">Synergies inter-filiales</h2>
        </div>
        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
          {transactions.length}
        </span>
      </header>
      {transactions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-3">
          Aucune transaction intra-groupe enregistrée sur la période.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {transactions.map((tx) => (
            <li key={tx.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
                  <span className="truncate font-semibold text-ink">{tx.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
                  <span className="truncate text-ink-2">{tx.to}</span>
                </div>
                <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">
                  {formatFCFA(tx.amount)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
                <span className="truncate">{tx.type}</span>
                <span>{formatDate(tx.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
