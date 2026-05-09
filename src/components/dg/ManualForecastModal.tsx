"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CashFlowType } from "@prisma/client";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { Field, inputClass } from "@/components/auth/LoginForm";
import { manualForecastSchema, type ManualForecastInput } from "@/schemas/cashflow";
import { useAddManualForecast } from "@/hooks/useDgCashflow";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "CLIENT_PAYMENT", label: "Encaissement client" },
  { value: "SUPPLIER", label: "Règlement fournisseur" },
  { value: "SALARY", label: "Salaire / charges" },
  { value: "TAX_VAT", label: "TVA" },
  { value: "TAX_CNPS", label: "CNPS" },
  { value: "TAX_IRPP", label: "IRPP" },
  { value: "OTHER", label: "Autre" },
];

export function ManualForecastModal({ open, onClose }: Props) {
  const add = useAddManualForecast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualForecastInput>({
    resolver: zodResolver(manualForecastSchema),
    defaultValues: {
      type: CashFlowType.INCOME,
      category: "CLIENT_PAYMENT",
      label: "",
      amount: 0,
      expectedDate: new Date(),
      probability: 100,
      recurrence: "UNIQUE",
      recurrenceCount: 3,
    },
  });

  const recurrence = watch("recurrence");
  const probability = watch("probability") ?? 100;
  const type = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        type: CashFlowType.INCOME,
        category: "CLIENT_PAYMENT",
        label: "",
        amount: 0,
        expectedDate: new Date(),
        probability: 100,
        recurrence: "UNIQUE",
        recurrenceCount: 3,
      });
      setServerError(null);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const onSubmit = async (data: ManualForecastInput) => {
    setServerError(null);
    try {
      await add.mutateAsync(data);
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-forecast-title"
    >
      <div className="w-full max-w-[560px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <h3 id="manual-forecast-title" className="text-base font-semibold">
            Ajouter une prévision manuelle
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 px-5 py-5">
          <Field label="Type" required error={errors.type?.message}>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={clsx(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border p-2.5 text-[13px] font-medium transition",
                  type === CashFlowType.INCOME
                    ? "border-success bg-green-50 text-success"
                    : "border-line bg-white text-ink-3 hover:border-primary-300"
                )}
              >
                <input type="radio" value={CashFlowType.INCOME} {...register("type")} className="sr-only" />
                Encaissement
              </label>
              <label
                className={clsx(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border p-2.5 text-[13px] font-medium transition",
                  type === CashFlowType.EXPENSE
                    ? "border-danger bg-rose-50 text-danger"
                    : "border-line bg-white text-ink-3 hover:border-primary-300"
                )}
              >
                <input type="radio" value={CashFlowType.EXPENSE} {...register("type")} className="sr-only" />
                Décaissement
              </label>
            </div>
          </Field>

          <Field label="Catégorie" required error={errors.category?.message}>
            <select {...register("category")} className={clsx(inputClass(false), "appearance-none")}>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Libellé" required error={errors.label?.message}>
            <input
              {...register("label")}
              placeholder="Ex: Acompte MOA Pont Mfoundi"
              className={inputClass(Boolean(errors.label))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Montant (FCFA)" required error={errors.amount?.message}>
              <input
                type="number"
                step="1000"
                min="1"
                {...register("amount")}
                className={inputClass(Boolean(errors.amount))}
              />
            </Field>
            <Field label="Date prévue" required error={errors.expectedDate?.message}>
              <input
                type="date"
                {...register("expectedDate")}
                className={inputClass(Boolean(errors.expectedDate))}
              />
            </Field>
          </div>

          <Field label={`Probabilité : ${probability} %`} error={errors.probability?.message}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              {...register("probability")}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-primary-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink-3">
              <span>0 %</span>
              <span>50 %</span>
              <span>100 %</span>
            </div>
          </Field>

          <Field label="Récurrence" error={errors.recurrence?.message}>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={clsx(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border p-2 text-[12.5px] font-medium transition",
                  recurrence === "UNIQUE"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-line bg-white text-ink-3 hover:border-primary-300"
                )}
              >
                <input type="radio" value="UNIQUE" {...register("recurrence")} className="sr-only" />
                Unique
              </label>
              <label
                className={clsx(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border p-2 text-[12.5px] font-medium transition",
                  recurrence === "MONTHLY"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-line bg-white text-ink-3 hover:border-primary-300"
                )}
              >
                <input type="radio" value="MONTHLY" {...register("recurrence")} className="sr-only" />
                Mensuelle
              </label>
            </div>
          </Field>

          {recurrence === "MONTHLY" && (
            <Field label="Nombre d'occurrences" error={errors.recurrenceCount?.message}>
              <input
                type="number"
                min={1}
                max={12}
                {...register("recurrenceCount")}
                className={inputClass(Boolean(errors.recurrenceCount))}
              />
            </Field>
          )}

          {serverError && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 hover:border-primary-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 rounded-md bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {isSubmitting ? "Enregistrement…" : "Ajouter la prévision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
