"use client";

import { LossType } from "@prisma/client";
import { useLosses } from "@/hooks/useStocks";
import { formatDate, formatFCFA } from "@/lib/format";
import { ShieldOff } from "lucide-react";

const TYPE_LABEL: Record<LossType, string> = {
  THEFT: "Vol",
  DAMAGE: "Casse",
  LOSS: "Perte",
  OTHER: "Autre",
};

export function LossesTable() {
  const { data, isLoading } = useLosses();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sinistres" value={String(data.summary.total)} />
        <Stat label="Valeur totale" value={formatFCFA(BigInt(data.summary.totalValue))} />
        <Stat label="Indemnisé" value={formatFCFA(BigInt(data.summary.totalIndemnification))} />
        <Stat label="Perte nette" value={formatFCFA(BigInt(data.summary.netLoss))} highlight />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Type</th>
              <th className="py-2 text-left">Bien</th>
              <th className="py-2 text-right">Valeur</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-center">Assurance</th>
              <th className="py-2 text-right">Indemnisation</th>
              <th className="py-2 pr-3 text-left">Actions correctives</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">Aucun sinistre déclaré.</td>
              </tr>
            ) : (
              data.items.map((l) => (
                <tr key={l.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">
                      <ShieldOff className="h-3 w-3" /> {TYPE_LABEL[l.type]}
                    </span>
                  </td>
                  <td className="py-2 text-ink">{l.itemDescription}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(l.value))}</td>
                  <td className="py-2 text-[11.5px] text-ink-3">{formatDate(l.occurredAt)}</td>
                  <td className="py-2 text-center">
                    {l.declaredToInsurance ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {l.indemnification ? formatFCFA(BigInt(l.indemnification)) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-[11.5px] text-ink-3">{l.correctiveActions ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-danger/30 bg-danger/5" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-danger" : "text-ink")}>{value}</div>
    </div>
  );
}
