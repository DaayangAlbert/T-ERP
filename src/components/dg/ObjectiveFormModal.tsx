"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ObjectiveCategory, ObjectivePeriod, ObjectiveStatus } from "@prisma/client";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { Field, inputClass } from "@/components/auth/LoginForm";
import { createObjectiveSchema, type CreateObjectiveInput } from "@/schemas/objective";
import { useUpsertObjective, type ObjectiveItem } from "@/hooks/useDgObjectives";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: ObjectiveItem | null;
  defaultYear?: number;
}

const CATEGORY_OPTIONS: { value: ObjectiveCategory; label: string }[] = [
  { value: ObjectiveCategory.FINANCIAL, label: "Financier" },
  { value: ObjectiveCategory.COMMERCIAL, label: "Commercial" },
  { value: ObjectiveCategory.HR, label: "RH" },
  { value: ObjectiveCategory.HSE, label: "HSE" },
  { value: ObjectiveCategory.STRATEGIC, label: "Stratégique" },
];

const PERIOD_OPTIONS: { value: ObjectivePeriod; label: string }[] = [
  { value: ObjectivePeriod.ANNUAL, label: "Annuel" },
  { value: ObjectivePeriod.QUARTERLY, label: "Trimestriel" },
  { value: ObjectivePeriod.MONTHLY, label: "Mensuel" },
];

const COMMON_UNITS = ["FCFA", "%", "jours", "contrats", "employés", "certifications", "unités"];

function toIsoDate(d?: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function ObjectiveFormModal({ open, onClose, initial, defaultYear }: Props) {
  const upsert = useUpsertObjective();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEdit = Boolean(initial);
  const year = initial?.year ?? defaultYear ?? new Date().getFullYear();
  const start = initial ? new Date(initial.startDate) : new Date(year, 0, 1);
  const end = initial ? new Date(initial.endDate) : new Date(year, 11, 31);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateObjectiveInput>({
    resolver: zodResolver(createObjectiveSchema),
    defaultValues: {
      category: initial?.category ?? ObjectiveCategory.FINANCIAL,
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      targetValue: initial?.targetValue ?? 0,
      actualValue: initial?.actualValue ?? 0,
      unit: initial?.unit ?? "FCFA",
      period: initial?.period ?? ObjectivePeriod.ANNUAL,
      year,
      quarter: initial?.quarter ?? null,
      weight: initial?.weight ?? 3,
      status: initial?.status ?? ObjectiveStatus.IN_PROGRESS,
      startDate: start,
      endDate: end,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        category: initial?.category ?? ObjectiveCategory.FINANCIAL,
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        targetValue: initial?.targetValue ?? 0,
        actualValue: initial?.actualValue ?? 0,
        unit: initial?.unit ?? "FCFA",
        period: initial?.period ?? ObjectivePeriod.ANNUAL,
        year,
        quarter: initial?.quarter ?? null,
        weight: initial?.weight ?? 3,
        status: initial?.status ?? ObjectiveStatus.IN_PROGRESS,
        startDate: start,
        endDate: end,
      });
      setServerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

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

  const period = watch("period");

  const onSubmit = async (data: CreateObjectiveInput) => {
    setServerError(null);
    try {
      await upsert.mutateAsync({
        id: initial?.id,
        payload: {
          ...data,
          description: data.description || null,
          quarter: period === ObjectivePeriod.ANNUAL ? null : data.quarter,
        },
      });
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
      aria-labelledby="objective-form-title"
    >
      <div className="w-full max-w-[600px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <h3 id="objective-form-title" className="text-base font-semibold">
            {isEdit ? "Modifier l'objectif" : "Définir un objectif"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 space-y-3.5">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Catégorie" required error={errors.category?.message}>
              <select {...register("category")} className={clsx(inputClass(false), "appearance-none")}>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Période" required error={errors.period?.message}>
              <select {...register("period")} className={clsx(inputClass(false), "appearance-none")}>
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Libellé" required error={errors.title?.message}>
            <input
              {...register("title")}
              placeholder="Ex: CA annuel 4 Md FCFA"
              className={inputClass(Boolean(errors.title))}
            />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Contexte, leviers, jalons clés…"
              className={clsx(inputClass(Boolean(errors.description)), "h-auto py-2")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="Valeur cible" required error={errors.targetValue?.message}>
              <input
                type="number"
                step="any"
                {...register("targetValue")}
                className={inputClass(Boolean(errors.targetValue))}
              />
            </Field>
            <Field label="Valeur actuelle" error={errors.actualValue?.message}>
              <input
                type="number"
                step="any"
                {...register("actualValue")}
                className={inputClass(Boolean(errors.actualValue))}
              />
            </Field>
            <Field label="Unité" required error={errors.unit?.message}>
              <input
                {...register("unit")}
                list="objective-units"
                className={inputClass(Boolean(errors.unit))}
              />
              <datalist id="objective-units">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="Année" required error={errors.year?.message}>
              <input
                type="number"
                {...register("year")}
                className={inputClass(Boolean(errors.year))}
              />
            </Field>
            <Field
              label="Trimestre"
              error={errors.quarter?.message}
              hint={period === ObjectivePeriod.ANNUAL ? "Ignoré pour annuel" : undefined}
            >
              <input
                type="number"
                min={1}
                max={4}
                {...register("quarter")}
                disabled={period === ObjectivePeriod.ANNUAL}
                className={inputClass(Boolean(errors.quarter))}
              />
            </Field>
            <Field
              label="Pondération (1-10)"
              error={errors.weight?.message}
              hint="Importance relative"
            >
              <input
                type="number"
                min={1}
                max={10}
                {...register("weight")}
                className={inputClass(Boolean(errors.weight))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Date de début" required error={errors.startDate?.message}>
              <input
                type="date"
                {...register("startDate")}
                className={inputClass(Boolean(errors.startDate))}
              />
            </Field>
            <Field label="Échéance" required error={errors.endDate?.message}>
              <input
                type="date"
                {...register("endDate")}
                className={inputClass(Boolean(errors.endDate))}
              />
            </Field>
          </div>

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
              {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'objectif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
