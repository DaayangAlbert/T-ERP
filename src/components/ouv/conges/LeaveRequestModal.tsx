"use client";

import { useMemo, useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { AnnualLeavePayload } from "@/hooks/useOuvLeaves";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paidLeaveRemaining: number;
  onSubmit: (
    payload: AnnualLeavePayload
  ) => Promise<{ daysCount: number; message: string } | null>;
}

const LEAVE_TYPES: Array<{ value: AnnualLeavePayload["type"]; label: string; emoji: string }> = [
  { value: "annual", label: "Congé annuel payé", emoji: "🌴" },
  { value: "family_event", label: "Événement familial", emoji: "👪" },
  { value: "unpaid", label: "Congé sans solde", emoji: "📝" },
  { value: "exceptional", label: "Exceptionnel", emoji: "⚠️" },
];

// Modal bottom-sheet : type + dates (date pickers) + motif. Calcul jours
// estimé côté UI (calendaire grossier, le serveur fait le vrai calcul).
export function LeaveRequestModal({ isOpen, onClose, paidLeaveRemaining, onSubmit }: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<AnnualLeavePayload["type"]>("annual");
  const [startDate, setStartDate] = useState<string>(todayIso);
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ days: number; message: string } | null>(null);

  const estimatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
    // Estimation grossière : jours calendaires moins les week-ends
    let count = 0;
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    return count;
  }, [startDate, endDate]);

  if (!isOpen) return null;

  function reset() {
    setType("annual");
    setStartDate(todayIso);
    setEndDate(todayIso);
    setReason("");
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    setError(null);
    if (estimatedDays <= 0) {
      setError("Période invalide (week-ends uniquement ?)");
      return;
    }
    if (type === "annual" && estimatedDays > paidLeaveRemaining) {
      setError(`Solde insuffisant : ${paidLeaveRemaining} j disponibles`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit({ type, startDate, endDate, reason: reason || undefined });
      if (res) setSuccess({ days: res.daysCount, message: res.message });
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {success ? "Demande envoyée" : "Demander un congé"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (success) reset();
              onClose();
            }}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="text-[16px] font-bold text-slate-900">{success.message}</p>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Type de congé
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex h-[64px] items-center gap-2 rounded-xl border-2 px-3 text-left text-[13.5px] font-semibold ${
                    type === t.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                  Du
                </span>
                <input
                  type="date"
                  value={startDate}
                  min={todayIso}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                  Au
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || todayIso}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            </div>

            <div className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-700">
              Estimation : <strong>{estimatedDays} jour{estimatedDays > 1 ? "s" : ""} ouvré{estimatedDays > 1 ? "s" : ""}</strong>
              {type === "annual" && (
                <span className="ml-1">
                  ·{" "}
                  {paidLeaveRemaining - estimatedDays >= 0
                    ? `${paidLeaveRemaining - estimatedDays} restera après`
                    : `solde insuffisant (${paidLeaveRemaining} dispo)`}
                </span>
              )}
            </div>

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Motif (optionnel)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Exemple : mariage du frère, repos familial"
              maxLength={500}
              rows={3}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer au chef chantier
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Décision sous 5 jours ouvrés
            </p>
          </>
        )}
      </div>
    </div>
  );
}
