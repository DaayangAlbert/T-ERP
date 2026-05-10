"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";
import { clsx } from "clsx";

interface Props {
  sites: DtDashboardResponse["sitesToWatch"];
}

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "En cours",
  PLANNED: "Planifié",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "Dérive",
  COMPLETED: "Livré",
  ARCHIVED: "Archivé",
};

export function SitesToWatchTable({ sites }: Props) {
  if (sites.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-3 text-[12.5px] text-emerald-700">
        Aucun chantier en alerte. Tous sont dans les seuils budget/marge/délai.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-ink">Chantiers à surveiller</h2>
        <Link
          href="/dt/portefeuille"
          className="text-[11.5px] font-semibold text-primary-700 hover:text-primary-800"
        >
          Tout le portefeuille →
        </Link>
      </header>

      {/* Desktop : table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              <th className="px-3 py-2 text-left font-medium">Chantier</th>
              <th className="px-3 py-2 text-left font-medium">Dir. travaux</th>
              <th className="px-3 py-2 text-right font-medium">Avancement</th>
              <th className="px-3 py-2 text-right font-medium">Marge</th>
              <th className="px-3 py-2 text-left font-medium">Livraison</th>
              <th className="px-3 py-2 text-left font-medium">État</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-t border-line hover:bg-surface-alt/50">
                <td className="px-3 py-2 font-mono text-[11.5px]">{s.code}</td>
                <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                <td className="px-3 py-2 text-ink-2">{s.manager}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.physicalProgress} %</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span
                    className={clsx(
                      s.margin < s.marginTarget ? "text-rose-700 font-semibold" : "text-ink"
                    )}
                  >
                    {s.margin.toFixed(1)} %
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-2">
                  {format(new Date(s.plannedEndDate), "dd/MM/yy", { locale: fr })}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-ink-2">
                    <span className={clsx("inline-block h-2 w-2 rounded-full", SEVERITY_DOT[s.severity])} />
                    {s.alertReason}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/dt/portefeuille?focus=${s.id}`}
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
        {sites.map((s) => (
          <div key={s.id} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[11px] text-ink-3">{s.code}</div>
                <div className="text-[13px] font-semibold text-ink">{s.name}</div>
              </div>
              <span
                className={clsx(
                  "inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full",
                  SEVERITY_DOT[s.severity]
                )}
              />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
              <div>
                <dt className="text-ink-3">Dir. trav.</dt>
                <dd className="font-medium">{s.manager}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Avancement</dt>
                <dd className="font-medium tabular-nums">{s.physicalProgress} %</dd>
              </div>
              <div>
                <dt className="text-ink-3">Marge</dt>
                <dd
                  className={clsx(
                    "font-medium tabular-nums",
                    s.margin < s.marginTarget && "text-rose-700"
                  )}
                >
                  {s.margin.toFixed(1)} %{s.margin < s.marginTarget && " 🔴"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">Livraison</dt>
                <dd className="font-medium">
                  {format(new Date(s.plannedEndDate), "dd/MM/yy", { locale: fr })}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-3">État</dt>
                <dd className="font-medium">
                  {s.alertReason} · {STATUS_LABEL[s.status] ?? s.status}
                </dd>
              </div>
            </dl>
            <Link
              href={`/dt/portefeuille?focus=${s.id}`}
              className="mt-3 block w-full rounded-md border border-line-2 bg-white px-3 py-2 text-center text-[12px] font-semibold text-ink-2 hover:border-primary-300"
            >
              Voir le chantier
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
