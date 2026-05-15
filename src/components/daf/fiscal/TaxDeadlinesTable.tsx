"use client";

import { TaxType, TaxAuthority, DeclarationStatus, PaymentStatus } from "@prisma/client";
import { useTaxDeadlines, useDeclareTax, usePayTax } from "@/hooks/useDafFiscal";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<TaxType, string> = {
  VAT: "TVA mensuelle",
  IRPP: "IRPP",
  CNPS_DIPE: "DIPE CNPS",
  CFC: "CFC",
  FNE: "FNE",
  RAV: "RAV",
  TC: "Taxe communale",
  CAC: "CAC",
  IS_INSTALLMENT: "Acompte IS",
  IS_BALANCE: "Solde IS",
  DSF_FILING: "DSF Liasse fiscale",
  TAXES_ANNEXES: "Taxes annexes",
  OTHER: "Autre",
};

const AUTHORITY_LABEL: Record<TaxAuthority, string> = {
  DGI: "DGI",
  CNPS: "CNPS",
  COMMUNE: "Commune",
  CNAM_OCCUPATIONAL: "CNAM",
  OTHER: "Autre",
};

function urgencyTone(daysLeft: number): "danger" | "warning" | "default" {
  if (daysLeft < 0) return "danger";
  if (daysLeft <= 7) return "danger";
  if (daysLeft <= 30) return "warning";
  return "default";
}

export function TaxDeadlinesTable() {
  const { data, isLoading } = useTaxDeadlines(60);
  const declare = useDeclareTax();
  const pay = usePayTax();
  // Déclaration et paiement TVA/IRPP/CNPS : DAF (FULL DAF) ou ACCOUNTANT
  // (FULL CPT + READ DAF). Matrice : on lit CPT.canEdit qui couvre les deux.
  const canAct = useAccess(MODULES.CPT).canEdit;

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const onDeclare = (id: string) => declare.mutate(id);
  const onPay = (id: string) => pay.mutate(id);

  return (
    <section>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Échéancier fiscal
      </h3>

      {/* Desktop : tableau ≥ md */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card md:block">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Échéance</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Autorité</th>
              <th className="py-2 text-left">Période</th>
              <th className="py-2 text-right">Montant</th>
              <th className="py-2 text-center">Déclaration</th>
              <th className="py-2 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-ink-3">Aucune échéance dans la période.</td></tr>
            ) : (
              data.items.map((t) => {
                const dl = t.daysLeft ?? 0;
                const tone = urgencyTone(dl);
                return (
                  <tr key={t.id} className={clsx("border-t border-line hover:bg-surface-alt", tone === "danger" && "bg-danger/5")}>
                    <td className="py-2 pl-3">
                      <div
                        className={clsx(
                          "inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                          tone === "danger" ? "bg-danger/10 text-danger" :
                          tone === "warning" ? "bg-warning/10 text-warning" :
                          "bg-ink-3/10 text-ink-3"
                        )}
                      >
                        {formatDate(t.dueDate)}
                        <span className="ml-1 text-[10px]">· J{dl >= 0 ? "+" : ""}{dl}</span>
                      </div>
                    </td>
                    <td className="py-2 font-medium text-ink">{TYPE_LABEL[t.type]}</td>
                    <td className="py-2 text-ink-3">{AUTHORITY_LABEL[t.authority]}</td>
                    <td className="py-2 font-mono text-[11.5px]">{t.period}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {t.amount ? formatFCFA(BigInt(t.amount)) : "—"}
                    </td>
                    <td className="py-2 text-center">
                      <DeclarationBadge status={t.declarationStatus} />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {canAct && t.declarationStatus === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => onDeclare(t.id)}
                          disabled={declare.isPending}
                          className="inline-flex h-7 items-center rounded-md bg-primary-500 px-2.5 text-[11.5px] font-medium text-white hover:bg-primary-600"
                        >
                          Préparer dépôt
                        </button>
                      )}
                      {canAct && t.declarationStatus === "SUBMITTED" && t.paymentStatus !== "PAID" && (
                        <button
                          type="button"
                          onClick={() => onPay(t.id)}
                          disabled={pay.isPending}
                          className="inline-flex h-7 items-center rounded-md bg-success px-2.5 text-[11.5px] font-medium text-white hover:opacity-90"
                        >
                          Marquer payé
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards par échéance */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((t) => {
          const tone = urgencyTone(t.daysLeft ?? 0);
          return (
            <li
              key={t.id}
              className={clsx(
                "rounded-xl border bg-white p-3 shadow-card",
                tone === "danger" && "border-danger/40 bg-danger/5"
              )}
            >
              <div
                className={clsx(
                  "inline-block rounded px-2 py-1 font-mono text-[12px] font-semibold",
                  tone === "danger" ? "bg-danger/10 text-danger" :
                  tone === "warning" ? "bg-warning/10 text-warning" :
                  "bg-ink-3/10 text-ink-3"
                )}
              >
                {formatDate(t.dueDate)} · J{(t.daysLeft ?? 0) >= 0 ? "+" : ""}{t.daysLeft ?? 0}
              </div>
              <h4 className="mt-2 text-[14px] font-semibold text-ink">{TYPE_LABEL[t.type]}</h4>
              <div className="text-[11.5px] text-ink-3">{AUTHORITY_LABEL[t.authority]} · {t.period}</div>
              {t.amount && (
                <div className="mt-1 font-mono text-[15px] font-bold text-ink">{formatFCFA(BigInt(t.amount))}</div>
              )}
              {canAct && t.declarationStatus === "PENDING" && (
                <button
                  type="button"
                  onClick={() => onDeclare(t.id)}
                  disabled={declare.isPending}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary-500 px-3 text-[13px] font-medium text-white hover:bg-primary-600"
                >
                  Préparer dépôt
                </button>
              )}
              {canAct && t.declarationStatus === "SUBMITTED" && t.paymentStatus !== "PAID" && (
                <button
                  type="button"
                  onClick={() => onPay(t.id)}
                  disabled={pay.isPending}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-success px-3 text-[13px] font-medium text-white"
                >
                  Marquer payé
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeclarationBadge({ status }: { status: DeclarationStatus }) {
  const cfg: Record<DeclarationStatus, { label: string; cls: string }> = {
    PENDING: { label: "À préparer", cls: "bg-ink-3/10 text-ink-3" },
    PREPARED: { label: "Préparé", cls: "bg-info/10 text-info" },
    SUBMITTED: { label: "Soumis", cls: "bg-primary-100 text-primary-700" },
    ACCEPTED: { label: "Accepté", cls: "bg-success/10 text-success" },
    REJECTED: { label: "Rejeté", cls: "bg-danger/10 text-danger" },
  };
  const c = cfg[status];
  return <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", c.cls)}>{c.label}</span>;
}
