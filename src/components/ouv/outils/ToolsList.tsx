"use client";

import { Hammer, Clock } from "lucide-react";
import type { ToolLoanItem, ToolsResponse } from "@/hooks/useOuvTools";

interface Props {
  data: ToolsResponse | undefined;
}

// Liste outils sortis (ISSUED, OVERDUE, REQUESTED). Mirror du prototype.
export function ToolsList({ data }: Props) {
  if (!data || (data.active.length === 0 && data.pending.length === 0)) return null;
  const items = [...data.pending, ...data.active];

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">🔧 Outils sortis du magasin</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {items.map((t, idx) => (
          <Row key={t.id} loan={t} isLast={idx === items.length - 1} />
        ))}
      </div>
    </section>
  );
}

function Row({ loan, isLast }: { loan: ToolLoanItem; isLast: boolean }) {
  const meta = statusMeta(loan);
  return (
    <div
      className={`flex min-h-[64px] items-center gap-3 px-4 py-3.5 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
        <Hammer className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">{loan.toolName}</p>
        <p className="truncate text-[12px] text-slate-500">
          {loanSubLabel(loan)}
        </p>
      </div>
      <span className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
        {meta.label}
      </span>
    </div>
  );
}

function loanSubLabel(loan: ToolLoanItem): string {
  if (loan.status === "REQUESTED") {
    return `Demandé ${formatDate(loan.requestedAt)} · attente magasinier`;
  }
  if (loan.isPermanent) {
    return `Sorti ${formatDate(loan.issuedAt ?? loan.requestedAt)} · permanent`;
  }
  if (loan.dueDate) {
    return `Sorti ${formatDate(loan.issuedAt ?? loan.requestedAt)} · à rendre ${formatDate(loan.dueDate)}`;
  }
  return `Sorti ${formatDate(loan.issuedAt ?? loan.requestedAt)}`;
}

function statusMeta(loan: ToolLoanItem): { label: string; tone: string } {
  if (loan.status === "REQUESTED")
    return { label: "⏳ Attente", tone: "bg-amber-50 text-amber-800" };
  if (loan.isOverdue) return { label: "⚠ Retour", tone: "bg-rose-50 text-rose-700" };
  return { label: "En cours", tone: "bg-blue-50 text-blue-700" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// Stat compact pour mettre en évidence les outils en retard
export function ToolsOverdueAlert({ overdue }: { overdue: number }) {
  if (overdue === 0) return null;
  return (
    <div className="mb-3.5 flex items-start gap-2 rounded-xl border-2 border-rose-200 bg-rose-50 p-3">
      <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-700" />
      <p className="text-[13px] font-semibold text-rose-900">
        {overdue} outil{overdue > 1 ? "s" : ""} à rendre — risque pénalité magasin
      </p>
    </div>
  );
}
