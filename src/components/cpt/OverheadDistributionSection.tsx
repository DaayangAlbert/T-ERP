"use client";

import { useState } from "react";
import { Scale, Calculator, Check, Trash2, History } from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA, formatPercent, formatDate } from "@/lib/format";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import {
  useOverheadRuns,
  useCreateOverheadRun,
  useApplyOverheadRun,
  useDeleteOverheadRun,
  type OverheadRun,
} from "@/hooks/useCptAnalytical";

const fmt = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function OverheadDistributionSection() {
  const canManage = useAccess(MODULES.DAF).canEdit;
  const { data, isLoading } = useOverheadRuns();
  const create = useCreateOverheadRun();
  const apply = useApplyOverheadRun();
  const del = useDeleteOverheadRun();

  const [period, setPeriod] = useState(currentPeriod());
  const [amount, setAmount] = useState("");
  const [draft, setDraft] = useState<OverheadRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runs = data?.runs ?? [];
  const pending = draft ?? runs.find((r) => r.status === "PENDING") ?? null;

  const compute = async () => {
    setError(null);
    const a = onlyDigits(amount);
    if (!a || a === "0") { setError("Saisissez la masse salariale siège à répartir"); return; }
    try {
      const run = await create.mutateAsync({ period, totalAmount: a });
      setDraft(run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const doApply = async (run: OverheadRun) => {
    if (!confirm(`Appliquer la répartition ${run.period} ? Chaque compte projet sera débité de sa quote-part et le compte salaire crédité de ${fmt(run.totalAmount)}. Action définitive.`)) return;
    setError(null);
    try {
      await apply.mutateAsync(run.id);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const doCancel = async (run: OverheadRun) => {
    if (!confirm(`Annuler la répartition en attente ${run.period} ?`)) return;
    try {
      await del.mutateAsync(run.id);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Scale className="h-4 w-4 text-primary-600" /> Répartition de la masse salariale siège
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-3">
          Au prorata du montant de contrat (budget + avenants) de chaque chantier. Prévisualisez, puis appliquez.
        </p>
      </div>

      {canManage && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface-alt p-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">Période</span>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]" />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">Masse salariale siège (FCFA)</span>
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]" />
          </label>
          <button type="button" onClick={compute} disabled={create.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            <Calculator className="h-3.5 w-3.5" /> {create.isPending ? "Calcul…" : "Calculer"}
          </button>
        </div>
      )}

      {error && <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

      {pending && pending.basis && (
        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">Prévisualisation · {pending.period} · {fmt(pending.totalAmount)}</span>
            {canManage && pending.status === "PENDING" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => doCancel(pending)} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" /> Annuler
                </button>
                <button type="button" onClick={() => doApply(pending)} disabled={apply.isPending} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> {apply.isPending ? "Application…" : "Appliquer"}
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-2 py-1">Chantier</th>
                  <th className="px-2 py-1 text-right">Montant marché</th>
                  <th className="px-2 py-1 text-right">Poids</th>
                  <th className="px-2 py-1 text-right">Quote-part</th>
                </tr>
              </thead>
              <tbody>
                {pending.basis.lines.map((l) => (
                  <tr key={l.accountId} className="border-t border-line/60">
                    <td className="px-2 py-1.5"><span className="font-mono text-[11px] text-ink-3">{l.code}</span> <span className="text-ink">{l.name}</span></td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink-2">{fmt(l.marketAmount)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink-3">{formatPercent(l.weight * 100)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium text-ink">{fmt(l.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          <History className="h-3.5 w-3.5" /> Historique
        </div>
        {isLoading ? (
          <div className="h-12 animate-pulse rounded bg-surface-alt" />
        ) : runs.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-ink-3">Aucune répartition.</p>
        ) : (
          <ul className="divide-y divide-line">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                <span className="font-medium text-ink">{r.period}</span>
                <span className="tabular-nums text-ink-2">{fmt(r.totalAmount)}</span>
                <span className={clsx(
                  "rounded px-2 py-0.5 text-[11px] font-medium",
                  r.status === "APPLIED" && "bg-success/10 text-success",
                  r.status === "PENDING" && "bg-warning/10 text-warning",
                  r.status === "CANCELLED" && "bg-ink-3/10 text-ink-3",
                )}>
                  {r.status === "APPLIED" ? `Appliquée · ${formatDate(r.executedAt)}` : r.status === "PENDING" ? "En attente" : "Annulée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
