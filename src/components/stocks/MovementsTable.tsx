"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Edit3, X } from "lucide-react";
import { useMovements } from "@/hooks/useStocks";
import { MovementType } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_ICON: Record<MovementType, React.ReactNode> = {
  INBOUND: <ArrowDownLeft className="h-3 w-3 text-success" />,
  OUTBOUND: <ArrowUpRight className="h-3 w-3 text-danger" />,
  TRANSFER: <ArrowLeftRight className="h-3 w-3 text-info" />,
  ADJUSTMENT: <Edit3 className="h-3 w-3 text-warning" />,
  WRITEOFF: <X className="h-3 w-3 text-danger" />,
};

const TYPE_LABEL: Record<MovementType, string> = {
  INBOUND: "Entrée",
  OUTBOUND: "Sortie",
  TRANSFER: "Transfert",
  ADJUSTMENT: "Ajustement",
  WRITEOFF: "Mise au rebut",
};

export function MovementsTable() {
  const [type, setType] = useState<string>("");
  const [anomalousOnly, setAnomalousOnly] = useState(false);
  const { data, isLoading } = useMovements({ type: type || undefined, anomalous: anomalousOnly });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <input type="checkbox" checked={anomalousOnly} onChange={(e) => setAnomalousOnly(e.target.checked)} />
          Anomalies seulement
        </label>
        <span className="ml-auto text-[11.5px] text-ink-3">
          {data.summary.total} mouvements · {data.summary.anomalousCount} anomalie{data.summary.anomalousCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Date</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Article</th>
              <th className="py-2 text-right">Quantité</th>
              <th className="py-2 text-right">Valeur</th>
              <th className="py-2 text-left">Initiateur</th>
              <th className="py-2 pr-3 text-left">Motif</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">Aucun mouvement.</td>
              </tr>
            ) : (
              data.items.map((m) => (
                <tr key={m.id} className={clsx("border-t border-line hover:bg-surface-alt", m.anomalous && "bg-danger/5")}>
                  <td className="py-2 pl-3 font-mono text-[11px]">{formatDate(m.createdAt, "dd/MM HH:mm")}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold">
                      {TYPE_ICON[m.type]} {TYPE_LABEL[m.type]}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="font-medium text-ink">{m.itemLabel}</div>
                    <div className="font-mono text-[10.5px] text-ink-3">{m.itemCode}</div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{m.quantity}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(m.totalValue))}</td>
                  <td className="py-2 text-ink-2">{m.initiator}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-ink-3">
                    {m.anomalous && (
                      <span className="mr-1 inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger" title={m.anomalyReason ?? ""}>
                        <AlertTriangle className="h-2.5 w-2.5" /> Anomalie
                      </span>
                    )}
                    {m.reason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
