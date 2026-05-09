"use client";

import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { useBanks } from "@/hooks/useFinance";
import { formatDate, formatFCFA } from "@/lib/format";

export function BanksTable() {
  const { data, isLoading } = useBanks();
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Comptes" value={String(data.summary.total)} />
        <Stat label="Solde global" value={formatFCFA(BigInt(data.summary.totalBalance))} highlight />
        <Stat label="Lignes accordées" value={formatFCFA(BigInt(data.summary.totalGranted))} />
        <Stat label="Disponible" value={formatFCFA(BigInt(data.summary.totalAvailable))} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Banque</th>
              <th className="py-2 text-left">N° compte</th>
              <th className="py-2 text-right">Solde JJ</th>
              <th className="py-2 text-right">Lignes accordées</th>
              <th className="py-2 text-right">Utilisé</th>
              <th className="py-2 text-right">Disponible</th>
              <th className="py-2 text-left">Renouvellement</th>
              <th className="py-2 pr-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => {
              const used = BigInt(b.creditLineUsed);
              const granted = BigInt(b.creditLineGranted);
              const usagePct = granted > 0n ? Number((used * 100n) / granted) : 0;
              return (
                <tr key={b.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                      <Building2 className="h-3.5 w-3.5 text-primary-500" />
                      {b.bank}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-ink-3">{b.accountNumber}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold">{formatFCFA(BigInt(b.balance))}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(granted)}</td>
                  <td className="py-2 text-right">
                    <div className="font-mono tabular-nums">{formatFCFA(used)}</div>
                    <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-surface-alt">
                      <div
                        className={
                          usagePct > 80
                            ? "h-full bg-danger"
                            : usagePct > 60
                            ? "h-full bg-warning"
                            : "h-full bg-success"
                        }
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-success">
                    {formatFCFA(BigInt(b.creditLineAvailable))}
                  </td>
                  <td className="py-2 text-[11.5px] text-ink-3">
                    {b.renewalDate ? formatDate(b.renewalDate) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Link
                      href={`/finances/banques/${b.id}`}
                      className="inline-flex items-center gap-1 text-[12px] text-primary-700 hover:underline"
                    >
                      Détail <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-lg border p-3 shadow-card " +
        (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")
      }
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
