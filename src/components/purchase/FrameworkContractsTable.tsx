"use client";

import { Plus, FileSignature } from "lucide-react";
import { useFrameworkContracts } from "@/hooks/usePurchase";
import { ContractStatus } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: "bg-ink-3/10 text-ink-3",
  ACTIVE: "bg-success/10 text-success",
  EXPIRED: "bg-warning/10 text-warning",
  TERMINATED: "bg-danger/10 text-danger",
};

export function FrameworkContractsTable() {
  const { data, isLoading } = useFrameworkContracts();

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3 shadow-card">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          {data.items.length} contrat{data.items.length > 1 ? "s" : ""}-cadre{data.items.length > 1 ? "s" : ""}
        </h2>
        <button
          type="button"
          disabled
          title="Wizard nouveau contrat — disponible en V2"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500/40 px-3 text-[12.5px] font-medium text-white disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" /> Nouveau contrat-cadre
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence</th>
              <th className="py-2 text-left">Fournisseur</th>
              <th className="py-2 text-left">Objet</th>
              <th className="py-2 text-right">Plafond</th>
              <th className="py-2 text-right">Utilisé</th>
              <th className="py-2 text-right">Reste</th>
              <th className="py-2 text-left">Période</th>
              <th className="py-2 pr-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-ink-3">Aucun contrat-cadre actif.</td>
              </tr>
            ) : (
              data.items.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono text-[11.5px]">
                    <FileSignature className="mr-1 inline h-3.5 w-3.5 text-primary-500" />
                    {c.reference}
                  </td>
                  <td className="py-2 font-medium text-ink">{c.supplier.name}</td>
                  <td className="py-2 text-ink-2">{c.subject}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(c.maxAmount))}</td>
                  <td className="py-2 text-right">
                    <div className="font-mono tabular-nums">{formatFCFA(BigInt(c.usedAmount))}</div>
                    <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-surface-alt">
                      <div
                        className={
                          c.usagePct > 80
                            ? "h-full bg-danger"
                            : c.usagePct > 60
                            ? "h-full bg-warning"
                            : "h-full bg-success"
                        }
                        style={{ width: `${Math.min(100, c.usagePct)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-success">
                    {formatFCFA(BigInt(c.remaining))}
                  </td>
                  <td className="py-2 text-[11.5px] text-ink-3">
                    {formatDate(c.startDate, "dd/MM")} → {formatDate(c.endDate)}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[c.status])}>
                      {c.status}
                    </span>
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
