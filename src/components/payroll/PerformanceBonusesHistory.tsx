"use client";

import { useBonuses } from "@/hooks/useDgProfile";
import { BonusType, BonusStatus } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<BonusType, string> = {
  ANNUAL_RESULT: "Bonus sur résultat",
  OBJECTIVES: "Bonus sur objectifs",
  SIGNING: "Prime de signature",
  RETENTION: "Prime de fidélisation",
};

const STATUS_BADGE: Record<BonusStatus, string> = {
  TARGETED: "bg-info/10 text-info",
  PROVISIONED: "bg-warning/10 text-warning",
  VALIDATED: "bg-primary-100 text-primary-700",
  PAID: "bg-success/10 text-success",
};

export function PerformanceBonusesHistory() {
  const { data, isLoading } = useBonuses();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  // Groupé par année
  const byYear = new Map<number, typeof data.items>();
  for (const b of data.items) {
    const arr = byYear.get(b.fiscalYear) ?? [];
    arr.push(b);
    byYear.set(b.fiscalYear, arr);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      {years.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
          Aucun bonus de performance enregistré.
        </div>
      ) : (
        years.map((year) => {
          const items = byYear.get(year) ?? [];
          const totalTarget = items.reduce((s, b) => s + BigInt(b.targetAmount), 0n);
          const totalActual = items.reduce((s, b) => s + (b.actualAmount ? BigInt(b.actualAmount) : 0n), 0n);
          const achievement = totalTarget > 0n ? Number((totalActual * 1000n) / totalTarget) / 10 : 0;
          return (
            <section key={year} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Exercice {year}</h3>
                <span className={clsx("rounded px-2 py-0.5 text-[11px] font-semibold", achievement >= 90 ? "bg-success/10 text-success" : achievement >= 70 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger")}>
                  {achievement.toFixed(1).replace(".", ",")} % d'atteinte
                </span>
              </div>
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                  <tr>
                    <th className="py-2 pl-3 text-left">Type</th>
                    <th className="py-2 text-left">Formule</th>
                    <th className="py-2 text-right">Cible</th>
                    <th className="py-2 text-right">Réalisé</th>
                    <th className="py-2 text-center">Statut</th>
                    <th className="py-2 pr-3 text-left">Versé le</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="border-t border-line">
                      <td className="py-2 pl-3 font-medium text-ink">{TYPE_LABEL[b.bonusType]}</td>
                      <td className="py-2 text-[11.5px] text-ink-3">{b.formula ?? "—"}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(b.targetAmount))}</td>
                      <td className="py-2 text-right font-mono tabular-nums font-semibold">
                        {b.actualAmount ? formatFCFA(BigInt(b.actualAmount)) : "—"}
                      </td>
                      <td className="py-2 text-center">
                        <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[b.status])}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[11.5px] text-ink-3">
                        {b.paidAt ? formatDate(b.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
