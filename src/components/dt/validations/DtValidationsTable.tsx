"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import type { DtValidationItem } from "@/hooks/useDtValidations";
import { DtValidationWorkflowVisual } from "./DtValidationWorkflowVisual";

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md FCFA`;
  return `${Math.round(n / 1_000_000).toLocaleString("fr-FR")} M FCFA`;
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "bg-rose-100 text-rose-700",
  HIGH: "bg-amber-100 text-amber-700",
  NORMAL: "bg-slate-100 text-slate-700",
  LOW: "bg-slate-100 text-slate-500",
};

const TYPE_LABEL: Record<string, string> = {
  AMENDMENT: "Avenant marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Matériel",
  SPECIAL_METHOD: "Méthode spéciale",
  TECHNICAL_HANDOVER: "Mise en service",
};

interface Props {
  items: DtValidationItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function DtValidationsTable({ items, selectedIds, onToggleSelect, onApprove, onReject }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-6 text-center text-[12.5px] text-emerald-700">
        Aucune validation N2 technique en attente.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left font-medium">Réf.</th>
              <th className="px-3 py-2 text-left font-medium">Objet</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Initiateur</th>
              <th className="px-3 py-2 text-right font-medium">Montant</th>
              <th className="px-3 py-2 text-left font-medium">Workflow</th>
              <th className="px-3 py-2 text-left font-medium">Âge</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t border-line hover:bg-surface-alt/60">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(v.id)}
                    onChange={() => onToggleSelect(v.id)}
                    className="h-4 w-4 cursor-pointer rounded border-line-2 accent-primary-500"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-[11.5px]">{v.reference}</td>
                <td className="px-3 py-2 font-medium text-ink">{v.title}</td>
                <td className="px-3 py-2 text-ink-2">{TYPE_LABEL[v.type] ?? v.type}</td>
                <td className="px-3 py-2 text-ink-2">{v.initiator ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(v.amount)}</td>
                <td className="px-3 py-2">
                  <DtValidationWorkflowVisual steps={v.workflow.steps} />
                </td>
                <td className="px-3 py-2">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 text-[11px]",
                      v.ageHours > 48 ? "text-rose-700 font-semibold" : v.ageHours > 24 ? "text-amber-700" : "text-ink-3"
                    )}
                  >
                    {v.ageHours} h
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onApprove(v.id)}
                      className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="h-3 w-3" /> Valider
                    </button>
                    <button
                      onClick={() => onReject(v.id)}
                      className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <X className="h-3 w-3" /> Rejeter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {items.map((v) => (
          <div key={v.id} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(v.id)}
                onChange={() => onToggleSelect(v.id)}
                className="mt-1 h-4 w-4 cursor-pointer rounded border-line-2 accent-primary-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <div className="font-mono text-[11px] text-ink-3">{v.reference}</div>
                  <span
                    className={clsx(
                      "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      PRIORITY_BADGE[v.priority]
                    )}
                  >
                    {v.priority === "URGENT" ? "🔴 " : ""}
                    {v.ageHours} h
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-ink">{v.title}</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
                  <div>
                    <dt className="text-ink-3">Initiateur</dt>
                    <dd className="font-medium">{v.initiator ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Montant</dt>
                    <dd className="font-medium tabular-nums">{fmt(v.amount)}</dd>
                  </div>
                </dl>
                <div className="mt-2 text-[11px] text-ink-3">Workflow :</div>
                <div className="mt-1">
                  <DtValidationWorkflowVisual steps={v.workflow.steps} variant="vertical" />
                </div>
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => onApprove(v.id)}
                    className="flex-1 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 active:bg-emerald-100"
                  >
                    ✓ Valider
                  </button>
                  <button
                    onClick={() => onReject(v.id)}
                    className="flex-1 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 active:bg-rose-100"
                  >
                    ✗ Rejeter
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
