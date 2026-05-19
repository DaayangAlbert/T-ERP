"use client";

import { GraduationCap, AlertTriangle } from "lucide-react";
import { useTrainings, useExpiringTrainings } from "@/hooks/useHr";
import { formatDate, formatFCFA } from "@/lib/format";
import { TrainingStatus } from "@prisma/client";
import { clsx } from "clsx";

const STATUS_BADGE: Record<TrainingStatus, string> = {
  PLANNED: "bg-info/10 text-info",
  CONFIRMED: "bg-primary-100 text-primary-700",
  IN_PROGRESS: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-ink-3/10 text-ink-3",
};

export function TrainingsCalendar() {
  const { data, isLoading } = useTrainings();
  const { data: expiring } = useExpiringTrainings();

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Formations planifiées" value={String(data.summary.planned)} />
        <Stat label="En cours" value={String(data.summary.inProgress)} />
        <Stat label="Complétées" value={String(data.summary.completed)} />
        <Stat label="Budget total" value={formatFCFA(BigInt(data.summary.totalCost))} />
      </div>

      {expiring && expiring.items.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {expiring.items.length} certification{expiring.items.length > 1 ? "s" : ""} expire{expiring.items.length > 1 ? "nt" : ""} dans les 60 jours
          </h3>
          <ul className="space-y-1.5 text-[12.5px]">
            {expiring.items.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-warning/20 bg-white px-3 py-2">
                <div>
                  <div className="font-medium text-ink">{e.title}</div>
                  <div className="text-[11px] text-ink-3">{e.user.name} · {e.user.position ?? "—"}</div>
                </div>
                <span className="rounded bg-warning/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-warning">
                  J-{e.daysLeft}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Plan de formation
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Formation</th>
                <th className="py-2 text-left">Apprenant</th>
                <th className="py-2 text-left">Catégorie</th>
                <th className="py-2 text-left">Période</th>
                <th className="py-2 text-right">Coût</th>
                <th className="py-2 pr-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-3">Aucune formation enregistrée.</td>
                </tr>
              ) : (
                data.items.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-2 pl-3 font-medium text-ink">
                      <GraduationCap className="mr-1 inline h-3.5 w-3.5 text-primary-500" />
                      {t.title}
                    </td>
                    <td className="py-2 text-ink-2">{t.user.name}</td>
                    <td className="py-2">
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2 text-[11.5px] text-ink-3">
                      {formatDate(t.startDate, "dd/MM")} → {formatDate(t.endDate, "dd/MM/yyyy")}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {t.cost ? formatFCFA(BigInt(t.cost)) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[t.status])}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}
