"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useBalance } from "@/hooks/useAccounting";
import { SYSCOHADA_CLASSES } from "@/lib/syscohada";
import { clsx } from "clsx";

function fmtFCFA(n: bigint): string {
  if (n === 0n) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(n));
}

export function BalanceSheet() {
  const [level, setLevel] = useState<"class" | "account">("class");
  const { data, isLoading } = useBalance(level);

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="inline-flex rounded-md border border-line">
          <button
            type="button"
            onClick={() => setLevel("class")}
            className={clsx("px-3 py-1.5 text-[12.5px] font-medium", level === "class" ? "bg-primary-500 text-white" : "text-ink-3")}
          >
            Par classe
          </button>
          <button
            type="button"
            onClick={() => setLevel("account")}
            className={clsx("px-3 py-1.5 text-[12.5px] font-medium", level === "account" ? "bg-primary-500 text-white" : "text-ink-3")}
          >
            Par compte
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11.5px]">
          {data.summary.balanced ? (
            <span className="rounded bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              ✓ Balance équilibrée
            </span>
          ) : (
            <span className="rounded bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
              ⚠ Déséquilibrée
            </span>
          )}
          {data.summary.anomalies > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <AlertTriangle className="h-3 w-3" /> {data.summary.anomalies} anomalie{data.summary.anomalies > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Compte</th>
              <th className="py-2 text-left">Libellé</th>
              <th className="py-2 text-right">Débit</th>
              <th className="py-2 text-right">Crédit</th>
              <th className="py-2 pr-3 text-right">Solde</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const balance = BigInt(r.balance);
              return (
                <tr key={r.account} className={clsx("border-t border-line", r.anomaly && "bg-warning/5")}>
                  <td className="py-1.5 pl-3 font-mono">
                    {level === "class" ? (
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-white"
                        style={{ background: SYSCOHADA_CLASSES[r.account]?.color ?? "#6B7280" }}
                      >
                        Classe {r.account}
                      </span>
                    ) : (
                      r.account
                    )}
                  </td>
                  <td className="py-1.5 text-ink-2">
                    {r.label}
                    {r.anomaly && (
                      <span className="ml-2 rounded bg-warning/10 px-1 py-0.5 text-[10px] text-warning">
                        {r.anomaly}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{fmtFCFA(BigInt(r.debit))}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{fmtFCFA(BigInt(r.credit))}</td>
                  <td className={clsx("py-1.5 pr-3 text-right font-mono tabular-nums font-semibold", balance < 0n ? "text-danger" : "text-ink")}>
                    {balance < 0n ? `(${fmtFCFA(-balance)})` : fmtFCFA(balance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-primary-300 bg-primary-50/40 font-bold">
            <tr>
              <td colSpan={2} className="py-2 pl-3 text-ink">Totaux</td>
              <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(data.summary.totalDebit))}</td>
              <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(data.summary.totalCredit))}</td>
              <td className="py-2 pr-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
