"use client";

import { CheckCircle2, FileText } from "lucide-react";
import { TaxType } from "@prisma/client";
import { useRecentSubmissions } from "@/hooks/useDafFiscal";
import { formatDate } from "@/lib/format";

const TYPE_LABEL: Record<TaxType, string> = {
  VAT: "TVA",
  IRPP: "IRPP",
  CNPS_DIPE: "DIPE CNPS",
  CFC: "CFC",
  FNE: "FNE",
  RAV: "RAV",
  TC: "Taxe communale",
  CAC: "CAC",
  IS_INSTALLMENT: "Acompte IS",
  IS_BALANCE: "Solde IS",
  DSF_FILING: "DSF",
  TAXES_ANNEXES: "Taxes annexes",
  OTHER: "Autre",
};

export function RecentSubmissionsList() {
  const { data, isLoading } = useRecentSubmissions();
  if (isLoading || !data) return <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Dépôts récents
      </h3>
      {data.items.length === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucun dépôt récent.</p>
      ) : (
        <ul className="space-y-1.5 text-[12.5px]">
          {data.items.map((t) => (
            <li key={t.id} className="flex items-start gap-2 rounded-md border border-line bg-surface-alt px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">
                  {TYPE_LABEL[t.type]} · {t.period}
                </div>
                <div className="text-[11px] text-ink-3">
                  Déposé le {t.declaredAt ? formatDate(t.declaredAt) : "—"}
                  {t.paidAt && ` · Payé ${formatDate(t.paidAt)}`}
                </div>
              </div>
              {t.receiptUrl && (
                <a href={t.receiptUrl} className="text-primary-500 hover:text-primary-700">
                  <FileText className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
