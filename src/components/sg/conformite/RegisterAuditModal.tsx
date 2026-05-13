"use client";

import { useState } from "react";
import { X, ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";
import { useAuditRegister } from "@/hooks/useSgCompliance";

type NewStatus = "UP_TO_DATE" | "TO_UPDATE" | "OVERDUE";

interface Props {
  registerId: string;
  registerName: string;
  onClose: () => void;
}

const STATUSES: { id: NewStatus; label: string; icon: typeof ShieldCheck; tone: string }[] = [
  { id: "UP_TO_DATE", label: "À jour", icon: ShieldCheck, tone: "border-emerald-500 bg-emerald-50 text-emerald-700" },
  { id: "TO_UPDATE", label: "À mettre à jour", icon: AlertTriangle, tone: "border-amber-500 bg-amber-50 text-amber-700" },
  { id: "OVERDUE", label: "En retard", icon: AlertOctagon, tone: "border-rose-500 bg-rose-50 text-rose-700" },
];

export function RegisterAuditModal({ registerId, registerName, onClose }: Props) {
  const audit = useAuditRegister(registerId);
  const [newStatus, setNewStatus] = useState<NewStatus>("UP_TO_DATE");
  const [notes, setNotes] = useState("");
  const [nextReviewInDays, setNextReviewInDays] = useState<number>(90);

  async function submit() {
    try {
      await audit.mutateAsync({ newStatus, notes: notes.trim() || undefined, nextReviewInDays });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Audit interne · {registerName}</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">Trace dans l'historique AuditLog</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Nouveau statut *</label>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {STATUSES.map((s) => {
                const Icon = s.icon;
                const active = newStatus === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewStatus(s.id)}
                    className={clsx(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[11.5px] transition",
                      active ? s.tone + " font-semibold" : "border-line bg-white text-ink hover:bg-surface-alt",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Prochaine revue (jours)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={nextReviewInDays}
              onChange={(e) => setNextReviewInDays(Number(e.target.value))}
              className="mt-1 h-8 w-32 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
            <p className="mt-0.5 text-[10.5px] text-ink-3">Standard : 90 jours (revue trimestrielle)</p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Notes d'audit</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Constats, non-conformités, actions correctives…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          {audit.isError && (
            <p className="text-[11.5px] text-rose-600">{(audit.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={audit.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Enregistrer l'audit
          </button>
        </footer>
      </div>
    </div>
  );
}
