"use client";

import { Clock, AlertCircle } from "lucide-react";
import type { LeaveRequestItem } from "@/hooks/useEmpLeaves";
import type { LeaveType } from "@prisma/client";
import { LEAVE_TYPE_LABEL } from "@/lib/emp-labels";
import { formatDateLong } from "@/lib/emp-format";

interface Props {
  request: LeaveRequestItem;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  return `il y a ${diff} jours`;
}

/**
 * Card "Demande en cours" — border-left ambré, statut "En attente", dates,
 * validateur attribué, bouton "Annuler la demande".
 */
export function PendingLeaveRequestCard({ request, onCancel, isCancelling }: Props) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-3">
        <Clock className="h-3.5 w-3.5 text-amber-600" /> Demande en cours
      </h2>
      <article className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4 shadow-card">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {LEAVE_TYPE_LABEL[request.type as LeaveType] ?? request.type} · {request.daysCount} j
            </p>
            <p className="mt-1 text-sm text-amber-900">
              du {formatDateLong(request.startDate)} au {formatDateLong(request.endDate)}
            </p>
            <p className="mt-1 text-[11px] text-amber-800">
              demandé {daysAgo(request.createdAt)}
              {request.validatorName ? ` · validation ${request.validatorName}` : ""}
              {" · délai max 5 j ouvrés"}
            </p>
            {request.reason && (
              <p className="mt-1 text-[11px] text-amber-800">Motif : {request.reason}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            <AlertCircle className="h-3.5 w-3.5" /> En attente
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCancel(request.id)}
          disabled={isCancelling}
          className="mt-3 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-amber-400 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
        >
          {isCancelling ? "Annulation…" : "Annuler la demande"}
        </button>
      </article>
    </section>
  );
}
