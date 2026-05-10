"use client";

import { useState } from "react";
import { Check, X, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useApproveLeave, usePendingLeaves, useRejectLeave, type PendingLeave } from "@/hooks/useRhLeaves";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function statusBadge(s: string): string {
  if (s === "PENDING") return "bg-amber-100 text-amber-800";
  if (s === "N1_APPROVED") return "bg-blue-100 text-blue-800";
  return "bg-surface-alt text-ink-3";
}

function statusLabel(s: string): string {
  if (s === "PENDING") return "En attente RH";
  if (s === "N1_APPROVED") return "OK chef équipe";
  return s;
}

function RejectDialog({ item, onClose }: { item: PendingLeave; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const reject = useRejectLeave();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink">Refuser la demande</h3>
        <p className="text-[12px] text-ink-3">{item.employeeName} · {item.daysCount} jour{item.daysCount > 1 ? "s" : ""}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Motif de refus (obligatoire)"
          className="mt-2 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            type="button"
            disabled={!reason.trim() || reject.isPending}
            onClick={() => reject.mutate({ id: item.id, reason: reason.trim() }, { onSuccess: onClose })}
            className="h-8 rounded-md bg-rose-600 px-3 text-[12.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {reject.isPending ? "..." : "Refuser"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PendingLeavesTable() {
  const { data, isLoading } = usePendingLeaves();
  const approve = useApproveLeave();
  const [rejectTarget, setRejectTarget] = useState<PendingLeave | null>(null);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucune demande de congés en attente.
      </div>
    );
  }

  return (
    <>
      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Employé</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Période</th>
              <th className="px-3 py-2 text-right">Jours</th>
              <th className="px-3 py-2 text-left">Motif</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((it) => (
              <tr key={it.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-medium text-ink">{it.employeeName}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{it.typeLabel}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {fmtDate(it.startDate)} → {fmtDate(it.endDate)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[12.5px] font-semibold text-ink">{it.daysCount}</td>
                <td className="px-3 py-2 max-w-[220px] truncate text-[11.5px] italic text-ink-3" title={it.reason ?? ""}>
                  {it.reason ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusBadge(it.status))}>
                    {statusLabel(it.status)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(it.id)}
                      className="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                      title="Valider"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectTarget(it)}
                      className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                      title="Refuser"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards avec workflow vertical */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((it) => (
          <li key={it.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink">{it.employeeName}</div>
                <div className="text-[11.5px] text-ink-3">{it.typeLabel}</div>
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", statusBadge(it.status))}>
                {statusLabel(it.status)}
              </span>
            </div>
            <div className="my-2 border-t border-line" />
            <div className="space-y-1 text-[11.5px]">
              <div className="flex items-center gap-1 text-ink">
                <Calendar className="h-3 w-3 text-ink-3" />
                {fmtDate(it.startDate)} → {fmtDate(it.endDate)} ({it.daysCount} j)
              </div>
              {it.reason && <div className="italic text-ink-3">« {it.reason} »</div>}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button
                type="button"
                disabled={approve.isPending}
                onClick={() => approve.mutate(it.id)}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Valider
              </button>
              <button
                type="button"
                onClick={() => setRejectTarget(it)}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-rose-600 px-2 text-[12.5px] font-semibold text-white"
              >
                <X className="h-3.5 w-3.5" /> Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rejectTarget && <RejectDialog item={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </>
  );
}
