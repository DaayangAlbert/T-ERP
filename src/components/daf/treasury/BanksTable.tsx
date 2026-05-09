"use client";

import { Wifi, WifiOff, Clock, AlertCircle } from "lucide-react";
import { BankSyncStatus } from "@prisma/client";
import { formatRelativeDate } from "@/lib/format";
import { clsx } from "clsx";

interface BankItem {
  id: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  balance: string;
  creditLineGranted: string;
  creditLineUsed: string;
  creditLineAvailable: string;
  lastSyncAt: string | null;
  syncStatus: BankSyncStatus;
  primaryColor: string;
}

const SYNC_BADGE: Record<BankSyncStatus, { icon: React.ReactNode; cls: string; label: string }> = {
  LIVE: { icon: <Wifi className="h-3 w-3" />, cls: "bg-success/10 text-success", label: "Live" },
  DELAYED: { icon: <Clock className="h-3 w-3" />, cls: "bg-warning/10 text-warning", label: "3 min" },
  MANUAL: { icon: <WifiOff className="h-3 w-3" />, cls: "bg-ink-3/10 text-ink-3", label: "Manuel" },
  ERROR: { icon: <AlertCircle className="h-3 w-3" />, cls: "bg-danger/10 text-danger", label: "Erreur" },
};

function fmtFCFA(n: bigint): string {
  return new Intl.NumberFormat("fr-FR").format(Number(n));
}

export function BanksTable({ items }: { items: BankItem[] }) {
  const totalBalance = items.reduce((s, b) => s + BigInt(b.balance), 0n);
  const totalGranted = items.reduce((s, b) => s + BigInt(b.creditLineGranted), 0n);
  const totalUsed = items.reduce((s, b) => s + BigInt(b.creditLineUsed), 0n);
  const totalAvailable = items.reduce((s, b) => s + BigInt(b.creditLineAvailable), 0n);

  return (
    <>
      {/* Desktop : tableau ≥ md */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card md:block">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Banque</th>
              <th className="py-2 text-left">N° compte</th>
              <th className="py-2 text-right">Solde</th>
              <th className="py-2 text-right xl:table-cell hidden">Lignes accordées</th>
              <th className="py-2 text-right">Utilisé</th>
              <th className="py-2 text-right">Disponible</th>
              <th className="py-2 pr-3 text-center">Sync</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => {
              const badge = SYNC_BADGE[b.syncStatus];
              return (
                <tr key={b.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: b.primaryColor }} />
                      {b.bank}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-ink-3">{b.accountNumber}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold">{fmtFCFA(BigInt(b.balance))}</td>
                  <td className="py-2 text-right font-mono tabular-nums xl:table-cell hidden">
                    {fmtFCFA(BigInt(b.creditLineGranted))}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(b.creditLineUsed))}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-success">
                    {fmtFCFA(BigInt(b.creditLineAvailable))}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.cls)}>
                      {badge.icon} {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-primary-300 bg-primary-50/40 font-bold">
            <tr>
              <td colSpan={2} className="py-2 pl-3 text-ink">TOTAL CONSOLIDÉ</td>
              <td className="py-2 text-right font-mono tabular-nums text-primary-800">{fmtFCFA(totalBalance)}</td>
              <td className="py-2 text-right font-mono tabular-nums xl:table-cell hidden">{fmtFCFA(totalGranted)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(totalUsed)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-success">{fmtFCFA(totalAvailable)}</td>
              <td className="py-2 pr-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile : cards < md */}
      <div className="space-y-2 md:hidden">
        {items.map((b) => {
          const badge = SYNC_BADGE[b.syncStatus];
          return (
            <div key={b.id} className="rounded-xl border border-line bg-white p-3 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: b.primaryColor }} />
                  <span className="text-[14px] font-semibold text-ink">{b.bank}</span>
                </span>
                <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.cls)}>
                  {badge.icon} {badge.label}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10.5px] text-ink-3">{b.accountNumber}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-3">Solde</div>
                  <div className="font-mono font-semibold text-ink">{fmtFCFA(BigInt(b.balance))}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-3">Disponible</div>
                  <div className="font-mono font-semibold text-success">{fmtFCFA(BigInt(b.creditLineAvailable))}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-3 shadow-card">
          <div className="text-[10px] uppercase tracking-wider text-primary-700">TOTAL CONSOLIDÉ</div>
          <div className="mt-1 font-mono text-[18px] font-bold text-primary-800">{fmtFCFA(totalBalance)}</div>
          <div className="mt-1 text-[11px] text-primary-700">
            Disponible : <span className="font-mono font-semibold">{fmtFCFA(totalAvailable)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
