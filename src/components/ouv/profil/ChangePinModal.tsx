"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, Delete } from "lucide-react";
import { useChangePin } from "@/hooks/useOuvProfile";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "current" | "new" | "confirm";

// Wizard 3 étapes : PIN actuel → nouveau PIN → confirmation. Pad numérique
// XXL (60px+) cohérent avec la page de login ouvrier.
export function ChangePinModal({ isOpen, onClose }: Props) {
  const mut = useChangePin();
  const [step, setStep] = useState<Step>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("current");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "current" && currentPin.length === 6) {
      setError(null);
      setStep("new");
    }
  }, [step, currentPin]);

  useEffect(() => {
    if (step === "new" && newPin.length === 6) {
      if (newPin === currentPin) {
        setError("Le nouveau PIN doit être différent");
        setNewPin("");
        return;
      }
      setError(null);
      setStep("confirm");
    }
  }, [step, newPin, currentPin]);

  useEffect(() => {
    if (step === "confirm" && confirmPin.length === 6) {
      if (confirmPin !== newPin) {
        setError("Les deux PIN ne correspondent pas");
        setConfirmPin("");
        return;
      }
      setError(null);
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, confirmPin]);

  async function submit() {
    try {
      const res = await mut.mutateAsync({ currentPin, newPin });
      setSuccess(res.message);
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
      setConfirmPin("");
      setStep("current");
      setCurrentPin("");
      setNewPin("");
    }
  }

  if (!isOpen) return null;

  const currentValue = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const onDigit = (d: string) => {
    if (success || mut.isPending) return;
    setError(null);
    const setter =
      step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin;
    setter((prev) => (prev.length >= 6 ? prev : prev + d));
  };
  const onBackspace = () => {
    if (success || mut.isPending) return;
    const setter =
      step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin;
    setter((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {success ? "PIN modifié" : stepTitle(step)}
          </h2>
          <button
            type="button"
            onClick={onClose}
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
            <p className="text-[16px] font-bold text-slate-900">{success}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-purple-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-slate-500">{stepHint(step)}</p>
            <div className="mb-4 flex justify-center gap-2.5" aria-label="PIN à 6 chiffres">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 w-10 rounded-lg border-2 ${
                    i < currentValue.length
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-slate-50"
                  } flex items-center justify-center text-2xl font-bold text-slate-700`}
                >
                  {i < currentValue.length ? "•" : ""}
                </div>
              ))}
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            {mut.isPending && (
              <p className="mb-3 flex items-center justify-center gap-2 text-[13px] text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Mise à jour…
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <PadButton key={d} onClick={() => onDigit(d)}>
                  {d}
                </PadButton>
              ))}
              <div />
              <PadButton onClick={() => onDigit("0")}>0</PadButton>
              <PadButton onClick={onBackspace} aria-label="Effacer">
                <Delete className="h-6 w-6" />
              </PadButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stepTitle(step: Step): string {
  if (step === "current") return "PIN actuel";
  if (step === "new") return "Nouveau PIN";
  return "Confirmer le nouveau PIN";
}

function stepHint(step: Step): string {
  if (step === "current") return "Tape ton PIN actuel à 6 chiffres";
  if (step === "new") return "Choisis un nouveau PIN à 6 chiffres";
  return "Retape le nouveau PIN pour confirmer";
}

function PadButton({
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 items-center justify-center rounded-xl bg-slate-100 text-2xl font-semibold text-slate-800 active:bg-purple-100 active:text-purple-700"
      {...rest}
    >
      {children}
    </button>
  );
}
