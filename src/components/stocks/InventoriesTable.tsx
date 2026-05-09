"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { useInventories, useCreateInventory, useValidateInventory } from "@/hooks/useStocks";
import { InventoryStatus } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const STATUS_BADGE: Record<InventoryStatus, string> = {
  PLANNED: "bg-info/10 text-info",
  IN_PROGRESS: "bg-warning/10 text-warning",
  COMPLETED: "bg-primary-100 text-primary-700",
  VALIDATED: "bg-success/10 text-success",
};

const VALIDATION_THRESHOLD = 5_000_000n;

export function InventoriesTable() {
  const { data, isLoading } = useInventories();
  const create = useCreateInventory();
  const validate = useValidateInventory();
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const submit = async () => {
    await create.mutateAsync({ period, startDate });
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3 shadow-card">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          {data.items.length} inventaire{data.items.length > 1 ? "s" : ""}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Lancer un inventaire
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Période</span>
              <input value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Date de début</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2">Annuler</button>
            <button type="button" onClick={submit} disabled={create.isPending} className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60">
              {create.isPending ? "…" : "Créer l'inventaire"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Période</th>
              <th className="py-2 text-right">Articles</th>
              <th className="py-2 text-right">Écarts</th>
              <th className="py-2 text-right">Valeur écarts</th>
              <th className="py-2 text-left">Période</th>
              <th className="py-2 text-center">Statut</th>
              <th className="py-2 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">Aucun inventaire enregistré.</td>
              </tr>
            ) : (
              data.items.map((i) => {
                const gapsValue = BigInt(i.gapsValue);
                const requiresDg = i.status === "COMPLETED" && gapsValue > VALIDATION_THRESHOLD && !i.dgValidated;
                return (
                  <tr key={i.id} className={clsx("border-t border-line hover:bg-surface-alt", requiresDg && "bg-warning/5")}>
                    <td className="py-2 pl-3 font-mono">{i.period}</td>
                    <td className="py-2 text-right">{i.itemsCount}</td>
                    <td className="py-2 text-right">{i.gapsCount}</td>
                    <td className={clsx("py-2 text-right font-mono tabular-nums font-semibold", gapsValue > VALIDATION_THRESHOLD && "text-danger")}>
                      {formatFCFA(gapsValue)}
                    </td>
                    <td className="py-2 text-[11.5px] text-ink-3">
                      {formatDate(i.startDate, "dd/MM")} → {i.endDate ? formatDate(i.endDate) : "—"}
                    </td>
                    <td className="py-2 text-center">
                      <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[i.status])}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {requiresDg ? (
                        <button
                          type="button"
                          onClick={() => validate.mutate(i.id)}
                          disabled={validate.isPending}
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[11.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" /> Valider DG
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
