"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, FileText, Clock, AlertOctagon, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import {
  useDafMonthlyReports,
  useCreateDafReport,
  useDeleteDafReport,
  type DafReportStatus,
} from "@/hooks/useDafMonthlyReports";

const STATUS_LABEL: Record<DafReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const STATUS_CLS: Record<DafReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

function fmtMonth(iso: string) {
  const d = new Date(iso);
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} Md`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} k`;
  return new Intl.NumberFormat("fr-FR").format(v);
}

function getDefaultPeriod() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function DafMonthlyReportsPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const [filter, setFilter] = useState<DafReportStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useDafMonthlyReports({ status: filter || undefined });
  const create = useCreateDafReport();
  const del = useDeleteDafReport();

  const items = data?.items ?? [];

  const handleCreate = (period: string) => {
    create.mutate(
      { period: new Date(period).toISOString() },
      {
        onSuccess: (res) => {
          router.push(`/${params.tenantSlug}/direction-financiere/rapports-mensuels/${res.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="text-[20px] font-bold text-ink">Rapports financiers mensuels</h1>
        <p className="text-[12.5px] text-ink-3">
          Consolidation P&amp;L · trésorerie · créances · fiscal · soumission DG
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as DafReportStatus | "")}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-[11.5px] text-ink-3">
          {items.length} rapport{items.length > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" /> Nouveau rapport financier
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <FileText className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun rapport financier</p>
          <p className="mt-1 text-[12px] text-ink-3">Démarrez le rapport du mois en cours.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Période</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 text-right">CA mois</th>
                <th className="py-2 text-right">Marge brute</th>
                <th className="py-2 text-right">Trésorerie</th>
                <th className="py-2 text-right">Encours échu</th>
                <th className="py-2 text-right">DSO</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2.5 pl-3">
                    <div className="font-semibold text-ink">{r.periodLabel ?? fmtMonth(r.period)}</div>
                    {r.submittedAt && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-ink-3">
                        <Clock className="h-2.5 w-2.5" /> soumis {new Date(r.submittedAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className={clsx("inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <div className="mt-0.5 flex items-start gap-1 text-[10.5px] text-rose-700">
                        <AlertOctagon className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
                        <span className="line-clamp-1">{r.rejectionReason}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{fmtFCFA(r.revenueMonthXAF)}</td>
                  <td className={clsx("py-2.5 text-right font-mono tabular-nums", r.grossMarginPercent < 5 && "font-bold text-rose-700")}>
                    {r.grossMarginPercent.toFixed(1)} %
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{fmtFCFA(r.cashBalanceXAF)}</td>
                  <td className={clsx("py-2.5 text-right font-mono tabular-nums", Number(r.overdueReceivablesXAF) > 0 && "font-bold text-amber-700")}>
                    {fmtFCFA(r.overdueReceivablesXAF)}
                  </td>
                  <td className={clsx("py-2.5 text-right font-mono tabular-nums", r.dso > 90 && "font-bold text-rose-700")}>
                    {r.dso.toFixed(0)} j
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/${params.tenantSlug}/direction-financiere/rapports-mensuels/${r.id}`)}
                        className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-white"
                        title="Ouvrir"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {r.status === "DRAFT" && (
                        <button
                          onClick={() => {
                            if (confirm("Supprimer ce brouillon ?")) del.mutate(r.id);
                          }}
                          className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          pending={create.isPending}
          error={create.error}
        />
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onSubmit,
  pending,
  error,
}: {
  onClose: () => void;
  onSubmit: (period: string) => void;
  pending: boolean;
  error: Error | null;
}) {
  const [period, setPeriod] = useState(getDefaultPeriod());
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouveau rapport financier</h2>
          <p className="mt-1 text-[12px] text-ink-3">Choisissez le mois couvert (1er du mois).</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(period);
          }}
          className="space-y-3 p-4"
        >
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-2">Mois de référence</span>
            <input
              type="date"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
            />
          </label>
          {error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{error.message}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "Création..." : "Créer le brouillon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
