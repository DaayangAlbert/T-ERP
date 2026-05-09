"use client";

import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { ReconciliationStatus } from "@prisma/client";
import { useBankReconciliations } from "@/hooks/useDafAccounting";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const STATUS_BADGE: Record<ReconciliationStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING: { label: "À faire", cls: "bg-ink-3/10 text-ink-3", icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS: { label: "En cours", cls: "bg-warning/10 text-warning", icon: <Clock className="h-3 w-3" /> },
  COMPLETED: { label: "Terminé", cls: "bg-info/10 text-info", icon: <CheckCircle2 className="h-3 w-3" /> },
  VALIDATED: { label: "Validé", cls: "bg-success/10 text-success", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function BankReconciliationsTable() {
  const { data, isLoading } = useBankReconciliations();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <section>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Rapprochements bancaires · {data.period}
      </h3>

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card md:block">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Banque</th>
              <th className="py-2 text-right">Solde comptable</th>
              <th className="py-2 text-right">Solde banque</th>
              <th className="py-2 text-right">Écart</th>
              <th className="py-2 pr-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => {
              const gap = BigInt(r.gap);
              const badge = STATUS_BADGE[r.status];
              return (
                <tr key={r.bankAccountId} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: r.primaryColor ?? "#6B7280" }} />
                      {r.bank}
                    </span>
                    <div className="font-mono text-[10.5px] text-ink-3">{r.accountNumber}</div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(r.bookBalance))}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(r.bankBalance))}</td>
                  <td className={clsx("py-2 text-right font-mono tabular-nums font-semibold", gap !== 0n && "text-warning")}>
                    {gap === 0n ? "—" : (gap > 0n ? "+" : "") + formatFCFA(gap)}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold", badge.cls)}>
                      {badge.icon} {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((r) => {
          const gap = BigInt(r.gap);
          const badge = STATUS_BADGE[r.status];
          return (
            <li key={r.bankAccountId} className="rounded-xl border border-line bg-white p-3 shadow-card">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-ink">
                  <span className="h-4 w-4 rounded-full" style={{ background: r.primaryColor ?? "#6B7280" }} />
                  {r.bank}
                </span>
                <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold", badge.cls)}>
                  {badge.icon} {badge.label}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Solde comptable</div>
                  <div className="font-mono font-semibold">{formatFCFA(BigInt(r.bookBalance))}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Solde banque</div>
                  <div className="font-mono font-semibold">{formatFCFA(BigInt(r.bankBalance))}</div>
                </div>
              </div>
              {gap !== 0n && (
                <div className="mt-2 inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                  <AlertTriangle className="h-3 w-3" /> Écart {gap > 0n ? "+" : ""}{formatFCFA(gap)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
