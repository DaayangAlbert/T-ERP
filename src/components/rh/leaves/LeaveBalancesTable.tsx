"use client";

import { useLeaveBalances } from "@/hooks/useRhLeaves";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function LeaveBalancesTable() {
  const { data, isLoading } = useLeaveBalances();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Employé</th>
              <th className="px-3 py-2 text-right">CP acquis</th>
              <th className="px-3 py-2 text-right">CP pris</th>
              <th className="px-3 py-2 text-right">Solde CP</th>
              <th className="px-3 py-2 text-right">Solde RTT</th>
              <th className="px-3 py-2 text-right">Dernière prise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((b) => {
              const balance = b.paidLeaveAcquired - b.paidLeaveTaken;
              return (
                <tr key={b.employeeKey} className="hover:bg-surface-alt/40">
                  <td className="px-3 py-2 font-medium text-ink">{b.employeeName}</td>
                  <td className="px-3 py-2 text-right font-mono">{b.paidLeaveAcquired}</td>
                  <td className="px-3 py-2 text-right font-mono">{b.paidLeaveTaken}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{balance}</td>
                  <td className="px-3 py-2 text-right font-mono">{b.rttBalance}</td>
                  <td className="px-3 py-2 text-right text-[11.5px] text-ink-3">{fmtDate(b.lastTakenAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((b) => {
          const balance = b.paidLeaveAcquired - b.paidLeaveTaken;
          return (
            <li key={b.employeeKey} className="rounded-xl border border-line bg-white p-3">
              <div className="text-[13px] font-semibold text-ink">{b.employeeName}</div>
              <div className="mt-1 grid grid-cols-4 gap-1 text-center">
                <Cell label="CP acquis" value={String(b.paidLeaveAcquired)} />
                <Cell label="CP pris" value={String(b.paidLeaveTaken)} />
                <Cell label="Solde CP" value={String(balance)} bold />
                <Cell label="Solde RTT" value={String(b.rttBalance)} />
              </div>
              <div className="mt-1 text-right text-[10.5px] text-ink-3">Dernière prise : {fmtDate(b.lastTakenAt)}</div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Cell({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-ink-3">{label}</div>
      <div className={bold ? "font-mono text-[13px] font-bold text-ink" : "font-mono text-[12px] text-ink"}>{value}</div>
    </div>
  );
}
