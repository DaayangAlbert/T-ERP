"use client";

import { Clock, CheckCircle2, Download, XCircle, Ban, Hourglass } from "lucide-react";
import type { AttestationItem } from "@/hooks/useOuvAttestations";

interface Props {
  attestations: AttestationItem[];
}

const STATUS_META: Record<AttestationItem["status"], { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "En attente", tone: "bg-amber-50 text-amber-800", Icon: Clock },
  IN_PREPARATION: { label: "Préparation", tone: "bg-blue-50 text-blue-700", Icon: Hourglass },
  READY: { label: "Prête", tone: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  DELIVERED: { label: "Remise", tone: "bg-slate-100 text-slate-600", Icon: CheckCircle2 },
  REJECTED: { label: "Refusée", tone: "bg-rose-50 text-rose-700", Icon: XCircle },
  CANCELLED: { label: "Annulée", tone: "bg-slate-100 text-slate-500", Icon: Ban },
};

export function AttestationsList({ attestations }: Props) {
  if (!attestations.length) return null;
  const visible = attestations.slice(0, 4);
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Mes attestations</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {visible.map((a, idx) => (
          <Row key={a.id} a={a} isLast={idx === visible.length - 1} />
        ))}
      </div>
    </section>
  );
}

function Row({ a, isLast }: { a: AttestationItem; isLast: boolean }) {
  const meta = STATUS_META[a.status];
  return (
    <div
      className={`flex min-h-[60px] items-center gap-3 px-4 py-3.5 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">{a.typeLabel}</p>
        <p className="truncate text-[12px] text-slate-500">
          Demandée le {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
          {a.purpose ? ` · ${a.purpose}` : ""}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {a.status === "READY" && a.documentUrl && (
          <a
            href={a.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[12px] font-bold text-white"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
        )}
        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
          <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
      </div>
    </div>
  );
}
