"use client";

import { useState } from "react";
import { useGeneralLedger } from "@/hooks/useAccounting";
import { SYSCOHADA_ACCOUNTS } from "@/lib/syscohada";
import { formatDate } from "@/lib/format";

function fmtFCFA(n: bigint): string {
  if (n === 0n) return "—";
  const num = Number(n);
  return new Intl.NumberFormat("fr-FR").format(num);
}

export function GeneralLedger() {
  const [account, setAccount] = useState<string>("411");
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useGeneralLedger(account);

  const suggestions = filter
    ? SYSCOHADA_ACCOUNTS.filter(
        (a) => a.code.startsWith(filter) || a.label.toLowerCase().includes(filter.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-white p-3 shadow-card">
        <label className="block text-[12px] font-semibold text-ink-2">
          Compte SYSCOHADA
          <div className="relative mt-1">
            <input
              value={filter || account}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="ex : 411 (clients), 521 (banques)…"
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px] font-mono"
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-white shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setAccount(s.code);
                        setFilter("");
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-surface-alt"
                    >
                      <span className="font-mono text-primary-700">{s.code}</span>
                      <span className="text-ink-2">{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : !data || data.movements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
          Aucun mouvement sur le compte {account}.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[760px] text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="py-2 pl-3 text-left">Date</th>
                  <th className="py-2 text-left">Pièce</th>
                  <th className="py-2 text-left">Journal</th>
                  <th className="py-2 text-left">Libellé</th>
                  <th className="py-2 text-right">Débit</th>
                  <th className="py-2 text-right">Crédit</th>
                  <th className="py-2 pr-3 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id} className="border-t border-line hover:bg-surface-alt">
                    <td className="py-1.5 pl-3 font-mono text-[11px]">{formatDate(m.date)}</td>
                    <td className="py-1.5 font-mono text-[11px]">{m.reference}</td>
                    <td className="py-1.5 text-ink-3">{m.journal}</td>
                    <td className="py-1.5 text-ink-2">{m.entryLabel}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtFCFA(BigInt(m.debit))}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtFCFA(BigInt(m.credit))}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums font-semibold">
                      {fmtFCFA(BigInt(m.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-primary-300 bg-primary-50/40 font-bold">
                <tr>
                  <td colSpan={4} className="py-2 pl-3 text-ink">Totaux</td>
                  <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(data.summary.totalDebit))}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(data.summary.totalCredit))}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-primary-800">
                    {fmtFCFA(BigInt(data.summary.finalBalance))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
