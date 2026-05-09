"use client";

import { clsx } from "clsx";
import { ObjectiveCategory, ObjectiveStatus } from "@prisma/client";
import { Banknote, Briefcase, Heart, ShieldCheck, Star, Pencil, Trash2 } from "lucide-react";
import { objectivePace, type ObjectiveItem } from "@/hooks/useDgObjectives";
import { formatFCFA } from "@/lib/format";

interface Props {
  objective: ObjectiveItem;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CATEGORY_ICON: Record<ObjectiveCategory, React.ReactNode> = {
  FINANCIAL: <Banknote className="h-3.5 w-3.5" />,
  COMMERCIAL: <Briefcase className="h-3.5 w-3.5" />,
  HR: <Heart className="h-3.5 w-3.5" />,
  HSE: <ShieldCheck className="h-3.5 w-3.5" />,
  STRATEGIC: <Star className="h-3.5 w-3.5" />,
};

const CATEGORY_LABEL: Record<ObjectiveCategory, string> = {
  FINANCIAL: "Financier",
  COMMERCIAL: "Commercial",
  HR: "RH",
  HSE: "HSE",
  STRATEGIC: "Stratégique",
};

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  IN_PROGRESS: "En cours",
  AT_RISK: "À risque",
  ACHIEVED: "Atteint",
  MISSED: "Manqué",
  CANCELLED: "Annulé",
};

const PROGRESS_TONE: Record<"success" | "primary" | "warning" | "danger", string> = {
  success: "bg-success",
  primary: "bg-primary-500",
  warning: "bg-warning",
  danger: "bg-danger",
};

const PILL_TONE: Record<"success" | "primary" | "warning" | "danger", string> = {
  success: "bg-green-100 text-green-700 ring-green-200",
  primary: "bg-primary-100 text-primary-700 ring-primary-200",
  warning: "bg-amber-100 text-amber-700 ring-amber-200",
  danger: "bg-rose-100 text-rose-700 ring-rose-200",
};

function formatValue(value: number, unit: string): string {
  if (unit === "FCFA") return formatFCFA(value);
  if (unit === "%") return `${value.toFixed(1).replace(".", ",")} %`;
  return `${value.toLocaleString("fr-FR")} ${unit}`;
}

export function ObjectiveCard({ objective, selected, onSelect, onEdit, onDelete }: Props) {
  const pace = objectivePace(objective);
  const progressPct = Math.round(pace.progress * 100);
  const elapsedPct = Math.round(pace.elapsed * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group relative w-full rounded-xl border bg-white p-4 text-left shadow-card transition",
        "hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-brand-lg",
        selected ? "border-primary-500 ring-2 ring-primary-200" : "border-line"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary-50 text-primary-700">
            {CATEGORY_ICON[objective.category]}
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
            {CATEGORY_LABEL[objective.category]}
          </span>
        </div>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
            PILL_TONE[pace.tone]
          )}
        >
          {pace.label}
        </span>
      </div>

      <h3 className="mt-2.5 text-[14px] font-semibold leading-snug text-ink">
        {objective.title}
      </h3>

      <div className="mt-2 flex items-end justify-between gap-2 text-[12px]">
        <span className="font-mono tabular-nums text-ink-2">
          <span className="text-ink font-semibold">{formatValue(objective.actualValue, objective.unit)}</span>
          <span className="text-ink-3"> / {formatValue(objective.targetValue, objective.unit)}</span>
        </span>
        <span
          className={clsx(
            "font-mono text-[13px] font-bold tabular-nums",
            pace.tone === "success"
              ? "text-success"
              : pace.tone === "primary"
                ? "text-primary-700"
                : pace.tone === "warning"
                  ? "text-warning"
                  : "text-danger"
          )}
        >
          {progressPct} %
        </span>
      </div>

      {/* Progress bar with elapsed marker */}
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
        <div
          className={clsx("h-full rounded-full transition-all", PROGRESS_TONE[pace.tone])}
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink-3/50"
          style={{ left: `${Math.min(100, elapsedPct)}%` }}
          title={`Temps écoulé : ${elapsedPct} %`}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-3">
        <span>Temps écoulé : {elapsedPct} %</span>
        <span>{STATUS_LABEL[objective.status]}</span>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-3 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
          {onEdit && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-alt hover:text-primary-700"
              aria-label="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </span>
          )}
          {onDelete && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </button>
  );
}
