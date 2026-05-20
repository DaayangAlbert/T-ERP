"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import type { TenderItem } from "@/hooks/useDtTenders";

const STAGE_LABEL: Record<string, string> = {
  OPPORTUNITY: "Opportunité",
  DCE_ANALYSIS: "Analyse DCE",
  SITE_VISIT: "Visite",
  TECHNICAL_STUDY: "Étude tech.",
  PRICING: "Chiffrage",
  SUBCONTRACTOR_QUOTES: "Cotation ST",
  INTERNAL_VALIDATION: "Validation",
  SUBMITTED: "Remis",
  RESULTS_PENDING: "Résultats",
  WON: "Gagné",
  LOST: "Perdu",
};

const STAGE_BADGE: Record<string, string> = {
  OPPORTUNITY: "bg-slate-100 text-slate-700",
  DCE_ANALYSIS: "bg-blue-100 text-blue-700",
  TECHNICAL_STUDY: "bg-blue-100 text-blue-700",
  PRICING: "bg-violet-100 text-violet-700",
  INTERNAL_VALIDATION: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-emerald-100 text-emerald-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
}

export function TendersTable({ tenders }: { tenders: TenderItem[] }) {
  if (tenders.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
        Aucun appel d&apos;offres dans cette vue.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Réf.</th>
              <th className="px-3 py-2 text-left font-medium">Objet</th>
              <th className="px-3 py-2 text-left font-medium">MOA</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Budget</th>
              <th className="px-3 py-2 text-left font-medium">Étape</th>
              <th className="px-3 py-2 text-right font-medium">Probabilité</th>
              <th className="px-3 py-2 text-left font-medium">Remise</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => (
              <tr key={t.id} className="border-t border-line hover:bg-surface-alt/60">
                <td className="px-3 py-2 font-mono text-[11.5px]">{t.reference}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink">{t.title}</div>
                  <div className="text-[11px] text-ink-3">{t.itemsCount} articles BPU</div>
                </td>
                <td className="px-3 py-2 text-ink-2">{t.moaName}</td>
                <td className="px-3 py-2 text-ink-2">{t.workType}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtAmount(t.estimatedBudget)}</td>
                <td className="px-3 py-2">
                  <span
                    className={clsx(
                      "inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      STAGE_BADGE[t.stage] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {STAGE_LABEL[t.stage] ?? t.stage}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="tabular-nums text-[11.5px]">{t.probability} %</span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full bg-primary-500"
                        style={{ width: `${t.probability}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-ink-2">
                  {format(new Date(t.submissionDeadline), "dd/MM/yy", { locale: fr })}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/direction-technique/etudes/${t.id}`}
                    className="inline-block rounded-md border border-line-2 bg-white px-2 py-1 text-[11px] font-semibold text-ink-2 hover:border-primary-300"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {tenders.map((t) => (
          <Link
            key={t.id}
            href={`/direction-technique/etudes/${t.id}`}
            className="rounded-lg border border-line bg-white p-3 active:bg-surface-alt"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-ink-3">{t.reference}</div>
                <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">{t.moaName}</div>
              </div>
              <span
                className={clsx(
                  "inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  STAGE_BADGE[t.stage]
                )}
              >
                {STAGE_LABEL[t.stage]}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
              <div>
                <dt className="text-ink-3">Budget</dt>
                <dd className="font-medium tabular-nums">{fmtAmount(t.estimatedBudget)} FCFA</dd>
              </div>
              <div>
                <dt className="text-ink-3">Probabilité</dt>
                <dd className="font-medium tabular-nums">{t.probability} %</dd>
              </div>
              <div>
                <dt className="text-ink-3">Remise</dt>
                <dd className="font-medium">
                  {format(new Date(t.submissionDeadline), "dd/MM/yy", { locale: fr })}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">Articles BPU</dt>
                <dd className="font-medium">{t.itemsCount}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </div>
  );
}
