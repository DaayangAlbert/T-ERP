"use client";

import { X, CheckCircle2, XCircle, CalendarClock, Award } from "lucide-react";
import { clsx } from "clsx";
import { useIso9001Readiness } from "@/hooks/useGedAudit";

interface Props {
  onClose: () => void;
}

export function Iso9001ReadinessChecklist({ onClose }: Props) {
  const { data, isLoading } = useIso9001Readiness(true);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-600" />
            <h2 className="text-[14px] font-bold text-ink">Préparation audit ISO 9001</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-48 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : (
            <div className="space-y-3">
              <section className="rounded-lg border border-line bg-gradient-to-br from-violet-50 to-white p-3">
                <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Niveau de préparation</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <div
                    className={clsx(
                      "text-[36px] font-bold leading-none",
                      data.readiness >= data.targetIso9001 ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    {data.readiness}%
                  </div>
                  <div className="text-[11px] text-ink-3">cible ≥ {data.targetIso9001}%</div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-2">
                  <CalendarClock className="h-3.5 w-3.5 text-violet-600" />
                  Prochaine fenêtre d'audit : <strong>{data.nextAuditWindow}</strong>
                </div>
              </section>

              <section>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Checklist préparatoire</h3>
                <ul className="rounded-lg border border-line">
                  {data.checklist.map((item, idx) => (
                    <li
                      key={item.key}
                      className={clsx(
                        "flex items-start gap-2 px-3 py-2",
                        idx < data.checklist.length - 1 && "border-b border-line",
                        item.ok ? "" : "bg-amber-50/30",
                      )}
                    >
                      {item.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-ink">{item.label}</div>
                        <div className="text-[10.5px] text-ink-3">
                          Cible : {item.target} · Valeur actuelle :{" "}
                          <span className={clsx("font-mono font-bold", item.ok ? "text-emerald-700" : "text-amber-700")}>
                            {item.value}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11.5px] text-blue-900">
                ℹ Cette checklist se base sur les exigences ISO 9001 (chap. 7.5 – Informations documentées) +
                politique interne DGI/BCT camerounaise.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
