"use client";

import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { usePeriods, useClosePeriod } from "@/hooks/useAccounting";
import { PeriodStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

const STATUS_BADGE: Record<PeriodStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  OPEN: { label: "Ouverte", cls: "bg-success/10 text-success", icon: <AlertCircle className="h-3 w-3" /> },
  CLOSING: { label: "En clôture", cls: "bg-warning/10 text-warning", icon: <AlertCircle className="h-3 w-3" /> },
  CLOSED: { label: "Clôturée", cls: "bg-info/10 text-info", icon: <CheckCircle2 className="h-3 w-3" /> },
  LOCKED: { label: "Verrouillée", cls: "bg-ink-3/10 text-ink-3", icon: <Lock className="h-3 w-3" /> },
};

function fmtFCFA(n: bigint): string {
  return new Intl.NumberFormat("fr-FR").format(Number(n));
}

export function PeriodsTable() {
  const { data, isLoading } = usePeriods();
  const close = useClosePeriod();

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const onClose = async (period: string) => {
    if (!confirm(`Clôturer la période ${period} ? Cette action verrouille les écritures.`)) return;
    try {
      await close.mutateAsync(period);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
      <table className="w-full min-w-[680px] text-[12.5px]">
        <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
          <tr>
            <th className="py-2 pl-3 text-left">Période</th>
            <th className="py-2 text-right">Écritures</th>
            <th className="py-2 text-right">Total débit</th>
            <th className="py-2 text-right">Total crédit</th>
            <th className="py-2 text-center">Équilibre</th>
            <th className="py-2 text-left">Clôture</th>
            <th className="py-2 pr-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-ink-3">Aucune période enregistrée.</td>
            </tr>
          ) : (
            data.items.map((p) => {
              const badge = STATUS_BADGE[p.status];
              const isOpen = p.status === "OPEN" || p.status === "CLOSING";
              return (
                <tr key={p.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono font-semibold">{p.period}</td>
                  <td className="py-2 text-right">{p.totalEntries}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(p.totalDebit))}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{fmtFCFA(BigInt(p.totalCredit))}</td>
                  <td className="py-2 text-center">
                    {p.balanced ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="mx-auto h-4 w-4 text-danger" />
                    )}
                  </td>
                  <td className="py-2">
                    <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold", badge.cls)}>
                      {badge.icon} {badge.label}
                    </span>
                    {p.closedAt && (
                      <div className="mt-0.5 text-[10.5px] text-ink-3">{formatDate(p.closedAt)}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => onClose(p.period)}
                        disabled={close.isPending || !p.balanced}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[11.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-40"
                      >
                        Clôturer
                      </button>
                    ) : (
                      <span className="text-[11.5px] text-ink-3">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
