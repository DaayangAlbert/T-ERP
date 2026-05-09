"use client";

import { ScrollText } from "lucide-react";
import { AuditType, AuditStatus } from "@prisma/client";
import { useTaxAudits } from "@/hooks/useDafFiscal";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<AuditType, string> = {
  TAX_VERIFICATION: "Vérification fiscale",
  CNPS_CONTROL: "Contrôle CNPS",
  EXTERNAL_AUDIT: "Audit externe",
  CAC: "Commissaire aux comptes",
  INTERNAL: "Audit interne",
};

const STATUS_BADGE: Record<AuditStatus, string> = {
  ANNOUNCED: "bg-info/10 text-info",
  IN_PROGRESS: "bg-warning/10 text-warning",
  CONTRADICTORY: "bg-warning/10 text-warning",
  CLOSED: "bg-success/10 text-success",
  CHALLENGED: "bg-danger/10 text-danger",
};

export function AuditsList() {
  const { data, isLoading } = useTaxAudits();
  if (isLoading || !data) return <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Audits et contrôles fiscaux
      </h3>
      {data.items.length === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucun audit en cours ou récent.</p>
      ) : (
        <ul className="space-y-1.5 text-[12.5px]">
          {data.items.map((a) => (
            <li key={a.id} className="flex items-start gap-2 rounded-md border border-line bg-surface-alt px-3 py-2">
              <ScrollText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">
                  {TYPE_LABEL[a.type]} · {a.period}
                </div>
                <div className="text-[11px] text-ink-3">
                  {a.auditor && <span>{a.auditor} · </span>}
                  Du {formatDate(a.startDate)}
                  {a.endDate && ` au ${formatDate(a.endDate)}`}
                </div>
                {a.adjustmentsAmount && (
                  <div className="mt-1 text-[11px] text-ink-2">
                    Ajustements : <span className="font-mono font-semibold">{formatFCFA(BigInt(a.adjustmentsAmount))}</span>
                  </div>
                )}
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_BADGE[a.status])}>
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
