"use client";

import { Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import type { LeaveItem } from "@/hooks/useOuvLeaves";

interface Props {
  pending: LeaveItem[];
  history: LeaveItem[];
  onCancel?: (id: string) => void;
}

// Liste "Mes demandes" : pending en haut + history (max 5). Chip statut coloré.
// Bouton Annuler visible uniquement sur les demandes PENDING.
export function LeavesList({ pending, history, onCancel }: Props) {
  const items = [...pending, ...history.slice(0, 5)];
  if (items.length === 0) return null;
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Mes demandes</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {items.map((leave, idx) => (
          <LeaveRow
            key={leave.id}
            leave={leave}
            isLast={idx === items.length - 1}
            onCancel={onCancel}
          />
        ))}
      </div>
    </section>
  );
}

function LeaveRow({
  leave,
  isLast,
  onCancel,
}: {
  leave: LeaveItem;
  isLast: boolean;
  onCancel?: (id: string) => void;
}) {
  const range = formatRange(leave.startDate, leave.endDate);
  const meta = statusMeta(leave.status);
  return (
    <div
      className={`min-h-[74px] px-4 py-3.5 ${!isLast ? "border-b border-slate-100" : ""}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-900">{leave.typeLabel}</p>
        <span
          className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}
        >
          <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
      </div>
      <p className="text-[13px] text-slate-700">
        {range} · {leave.daysCount} jour{leave.daysCount > 1 ? "s" : ""}
      </p>
      <p className="mt-1 text-[12px] text-slate-500">
        {leave.status === "PENDING"
          ? `Demandée le ${formatShort(leave.createdAt)}${leave.validatorName ? ` · validation ${leave.validatorName}` : ""}`
          : leave.status === "REJECTED"
            ? `Refusée${leave.rejectionReason ? ` — ${leave.rejectionReason}` : ""}`
            : leave.status === "CANCELLED"
              ? "Annulée"
              : leave.type === "SICK"
                ? `Justificatif médical${leave.hasJustificationDoc ? " fourni" : " manquant"} · CNPS notifiée`
                : leave.status === "RH_APPROVED"
                  ? "Validée · décomptée du solde"
                  : "Validée"}
      </p>
      {leave.status === "PENDING" && onCancel && (
        <button
          type="button"
          onClick={() => onCancel(leave.id)}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
        >
          Annuler la demande
        </button>
      )}
    </div>
  );
}

function statusMeta(status: LeaveItem["status"]) {
  switch (status) {
    case "PENDING":
      return { label: "En attente", tone: "bg-amber-50 text-amber-800", Icon: Clock };
    case "N1_APPROVED":
      return { label: "CC validé", tone: "bg-blue-50 text-blue-700", Icon: CheckCircle2 };
    case "RH_APPROVED":
      return { label: "Validé", tone: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 };
    case "REJECTED":
      return { label: "Refusé", tone: "bg-rose-50 text-rose-700", Icon: XCircle };
    case "CANCELLED":
      return { label: "Annulé", tone: "bg-slate-100 text-slate-500", Icon: Ban };
  }
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  const sd = s.getUTCDate();
  const ed = e.getUTCDate();
  if (sameMonth) {
    return `${sd} → ${ed} ${months[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
  }
  return `${sd} ${months[s.getUTCMonth()]} → ${ed} ${months[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
