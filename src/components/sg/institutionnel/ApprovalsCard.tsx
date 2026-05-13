"use client";

import { ShieldCheck, AlertTriangle, AlertOctagon, ExternalLink, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import type { ApprovalItem } from "@/hooks/useSgInstitutions";

const SEVERITY_BORDER: Record<string, string> = {
  emerald: "border-l-emerald-500",
  violet: "border-l-violet-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
};

const STATUS_LABEL: Record<string, string> = {
  VALID: "Valide",
  EXPIRING_SOON: "Bientôt expiré",
  EXPIRED: "Expiré",
  RENEWED: "Renouvelé",
};

const STATUS_TONE: Record<string, string> = {
  VALID: "bg-emerald-100 text-emerald-700",
  EXPIRING_SOON: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-rose-100 text-rose-700",
  RENEWED: "bg-violet-100 text-violet-700",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  items: ApprovalItem[];
  readOnly: boolean;
  onRenew: (a: ApprovalItem) => void;
}

export function ApprovalsCard({ items, readOnly, onRenew }: Props) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-line bg-white">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h2 className="text-[13.5px] font-semibold text-ink">Agréments BTP & certifications ({items.length})</h2>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-ink-3">Aucun agrément enregistré.</p>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {items.map((a) => {
            const Icon =
              a.severity === "rose" ? AlertOctagon : a.severity === "amber" ? AlertTriangle : ShieldCheck;
            return (
              <li
                key={a.id}
                className={clsx(
                  "flex flex-col gap-1.5 rounded-md border border-line border-l-4 bg-white p-2.5",
                  SEVERITY_BORDER[a.severity],
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={clsx(
                      "mt-0.5 h-4 w-4 shrink-0",
                      a.severity === "rose"
                        ? "text-rose-600"
                        : a.severity === "amber"
                          ? "text-amber-600"
                          : "text-emerald-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{a.approvalName}</div>
                    <div className="text-[11px] text-ink-3">
                      {a.deliveringAuthority} · N° {a.approvalNumber}
                    </div>
                  </div>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[a.status])}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-ink-3">
                  <span className="font-mono">
                    Émis {fmtDate(a.issuedAt)} → expire {fmtDate(a.expiresAt)}
                  </span>
                  <span
                    className={clsx(
                      "font-semibold",
                      a.daysToExpiry <= 30
                        ? "text-rose-700"
                        : a.daysToExpiry <= 90
                          ? "text-amber-700"
                          : "text-ink-3",
                    )}
                  >
                    {a.daysToExpiry > 0 ? `J-${a.daysToExpiry}` : `Expiré depuis ${-a.daysToExpiry}j`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {a.documentUrl && (
                    <a
                      href={a.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[10.5px] font-semibold text-ink hover:bg-surface-alt"
                    >
                      <ExternalLink className="h-3 w-3" /> Document
                    </a>
                  )}
                  {!readOnly && a.renewable && (
                    <button
                      type="button"
                      onClick={() => onRenew(a)}
                      className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-violet-700"
                    >
                      <RefreshCw className="h-3 w-3" /> Renouveler
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
