"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { pickValidatorRole, labelForValidator, AUTO_APPROVE_THRESHOLD_XAF } from "@/lib/ouv/advance";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maxAllowedXAF: number;
  onSubmit: (data: {
    amountXAF: number;
    reason: string;
    payoutMethod: "BANK_TRANSFER" | "MOBILE_MONEY" | "CASH";
  }) => Promise<{ autoApproved: boolean; message: string } | null>;
}

// Wizard 3 étapes : Montant → Motif/Paiement → Récap+Confirmation.
// Affiche en live le routage de validation (auto/RH/DAF/DG) selon le montant.
export function AdvanceRequestModal({ isOpen, onClose, maxAllowedXAF, onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(Math.min(30_000, maxAllowedXAF));
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "MOBILE_MONEY" | "CASH">("BANK_TRANSFER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const validatorRole = pickValidatorRole(amount);
  const sliderMax = Math.max(maxAllowedXAF, AUTO_APPROVE_THRESHOLD_XAF);

  function reset() {
    setStep(1);
    setAmount(Math.min(30_000, maxAllowedXAF));
    setReason("");
    setMethod("BANK_TRANSFER");
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    if (amount < 5_000 || amount > maxAllowedXAF) {
      setError(`Montant entre 5 000 et ${maxAllowedXAF.toLocaleString("fr-FR")} FCFA`);
      setStep(1);
      return;
    }
    if (reason.trim().length < 5) {
      setError("Précise le motif (≥ 5 caractères)");
      setStep(2);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit({ amountXAF: amount, reason: reason.trim(), payoutMethod: method });
      if (result) setSuccess(result.message);
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
        <Header
          step={step}
          success={!!success}
          onBack={step > 1 && !success ? () => setStep((s) => (s - 1) as 1 | 2) : undefined}
          onClose={() => {
            if (success) reset();
            onClose();
          }}
        />

        {success ? (
          <SuccessView message={success} onClose={() => { reset(); onClose(); }} />
        ) : step === 1 ? (
          <StepAmount
            amount={amount}
            setAmount={setAmount}
            maxAllowedXAF={maxAllowedXAF}
            sliderMax={sliderMax}
            validatorLabel={labelForValidator(validatorRole)}
            error={error}
            onNext={() => {
              if (amount < 5_000 || amount > maxAllowedXAF) {
                setError(`Montant entre 5 000 et ${maxAllowedXAF.toLocaleString("fr-FR")} FCFA`);
                return;
              }
              setError(null);
              setStep(2);
            }}
          />
        ) : step === 2 ? (
          <StepReason
            reason={reason}
            setReason={setReason}
            method={method}
            setMethod={setMethod}
            error={error}
            onNext={() => {
              if (reason.trim().length < 5) {
                setError("Précise le motif (≥ 5 caractères)");
                return;
              }
              setError(null);
              setStep(3);
            }}
          />
        ) : (
          <StepConfirm
            amount={amount}
            reason={reason}
            method={method}
            validatorLabel={labelForValidator(validatorRole)}
            autoApprove={validatorRole === "AUTO"}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}

function Header({
  step,
  success,
  onBack,
  onClose,
}: {
  step: 1 | 2 | 3;
  success: boolean;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
        )}
        <h2 className="text-[18px] font-bold text-slate-900">
          {success ? "Demande envoyée" : `Avance · étape ${step}/3`}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
      >
        <X className="h-5 w-5 text-slate-600" />
      </button>
    </div>
  );
}

function StepAmount({
  amount,
  setAmount,
  maxAllowedXAF,
  sliderMax,
  validatorLabel,
  error,
  onNext,
}: {
  amount: number;
  setAmount: (n: number) => void;
  maxAllowedXAF: number;
  sliderMax: number;
  validatorLabel: string;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <>
      <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Montant souhaité
      </p>
      <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-5 text-center">
        <p
          className="text-[34px] font-extrabold text-purple-700"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {amount.toLocaleString("fr-FR")} <span className="text-[14px] font-semibold text-purple-500">FCFA</span>
        </p>
        <input
          type="range"
          min={5_000}
          max={Math.max(maxAllowedXAF, 5_000)}
          step={5_000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-3 w-full accent-purple-600"
        />
        <p className="mt-1 text-[12px] text-purple-700">
          Plafond 30 % salaire : {maxAllowedXAF.toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      <div className="mt-3.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-700">
        Validation : <strong className="font-bold">{validatorLabel}</strong>
        {amount < AUTO_APPROVE_THRESHOLD_XAF && (
          <p className="mt-1 text-[11.5px] text-emerald-700">
            ⚡ Sous 50 000 FCFA — virement automatique sous 48 h
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-5 flex h-14 w-full items-center justify-center rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98]"
      >
        Continuer
      </button>
    </>
  );
}

function StepReason({
  reason,
  setReason,
  method,
  setMethod,
  error,
  onNext,
}: {
  reason: string;
  setReason: (s: string) => void;
  method: "BANK_TRANSFER" | "MOBILE_MONEY" | "CASH";
  setMethod: (m: "BANK_TRANSFER" | "MOBILE_MONEY" | "CASH") => void;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <>
      <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Motif (obligatoire)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Exemple : frais médicaux famille, scolarité enfants, frais imprévus"
        maxLength={500}
        rows={4}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
      />
      <p className="mb-3 text-right text-[11px] text-slate-400">{reason.length}/500</p>

      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Mode de paiement souhaité
      </p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { value: "BANK_TRANSFER", label: "Virement", icon: "🏦" },
          { value: "MOBILE_MONEY", label: "Mobile Money", icon: "📱" },
          { value: "CASH", label: "Espèces", icon: "💵" },
        ].map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value as typeof method)}
            className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 text-[12px] font-semibold ${
              method === m.value
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <span className="text-xl">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-2 flex h-14 w-full items-center justify-center rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98]"
      >
        Continuer
      </button>
    </>
  );
}

function StepConfirm({
  amount,
  reason,
  method,
  validatorLabel,
  autoApprove,
  submitting,
  error,
  onSubmit,
}: {
  amount: number;
  reason: string;
  method: string;
  validatorLabel: string;
  autoApprove: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const methodLabel = method === "BANK_TRANSFER" ? "Virement Afriland" : method === "MOBILE_MONEY" ? "Mobile Money" : "Espèces";
  return (
    <>
      <div className="mb-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
        <Pair label="Montant" value={`${amount.toLocaleString("fr-FR")} FCFA`} bold />
        <Pair label="Motif" value={reason} />
        <Pair label="Paiement" value={methodLabel} />
        <Pair label="Validation" value={validatorLabel} />
      </div>

      {autoApprove ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
          ⚡ Auto-validée — virement {methodLabel.toLowerCase()} sous 48 h ouvrées.
        </p>
      ) : (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          ⏳ Décision sous 24 h ouvrées. Notification WhatsApp dès traitement.
        </p>
      )}
      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
        Récupération sur ton bulletin du mois suivant (ligne dédiée).
      </p>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        Confirmer la demande
      </button>
    </>
  );
}

function Pair({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <p className="text-[12px] font-semibold uppercase text-slate-500">{label}</p>
      <p
        className={`text-right text-[14px] text-slate-900 ${bold ? "font-extrabold" : "font-medium"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SuccessView({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <p className="text-[16px] font-bold text-slate-900">{message}</p>
      <p className="mt-2 text-[12.5px] text-slate-500">
        Tu peux suivre l'état de ta demande dans "Mes avances".
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-purple-600 px-8 text-[15px] font-bold text-white"
      >
        Fermer
      </button>
    </div>
  );
}
