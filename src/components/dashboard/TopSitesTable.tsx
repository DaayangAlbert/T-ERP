"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { SiteStatus } from "@prisma/client";
import type { TopSiteRow } from "@/hooks/useDashboardDg";
import { formatFCFA } from "@/lib/format";

const STATUS_LABELS: Record<SiteStatus, string> = {
  PLANNED: "Planifié",
  ACTIVE: "Actif",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "En dérive",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

const STATUS_TONE: Record<SiteStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  DRIFTING: "bg-rose-100 text-rose-700",
  COMPLETED: "bg-primary-100 text-primary-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

function progressTone(status: SiteStatus, progress: number) {
  if (status === SiteStatus.DRIFTING) return "bg-rose-500";
  if (status === SiteStatus.AT_RISK) return "bg-amber-500";
  if (progress >= 80) return "bg-primary-500";
  return "bg-success";
}

interface Props {
  sites: TopSiteRow[];
}

export function TopSitesTable({ sites }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">
          Top chantiers — avancement &amp; marge
        </h3>
        <Link href="/chantiers" className="text-[12px] text-primary-700 hover:underline">
          Voir tous →
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2.5 pl-4 text-left">Code</th>
              <th className="py-2.5 text-left">Chantier</th>
              <th className="py-2.5 text-left">Statut</th>
              <th className="py-2.5 text-left">Avancement</th>
              <th className="py-2.5 text-right">Marge</th>
              <th className="py-2.5 pr-4 text-right">Budget</th>
            </tr>
          </thead>
          <tbody>
            {sites.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-ink-3">
                  Aucun chantier actif pour ce tenant.
                </td>
              </tr>
            )}
            {sites.map((s, i) => (
              <tr
                key={s.id}
                className={clsx(
                  "transition hover:bg-surface-alt",
                  i < sites.length - 1 && "border-b border-line"
                )}
              >
                <td className="py-2.5 pl-4">
                  <Link
                    href={`/chantiers/${s.id}`}
                    className="font-mono text-[11.5px] text-ink-2 hover:text-primary-700"
                  >
                    {s.code}
                  </Link>
                </td>
                <td className="py-2.5">
                  <div className="font-semibold text-ink">{s.name}</div>
                  <div className="text-[11px] text-ink-3">{s.client}</div>
                </td>
                <td className="py-2.5">
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      STATUS_TONE[s.status]
                    )}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 max-w-full overflow-hidden rounded-full bg-line">
                      <div
                        className={clsx("h-full rounded-full", progressTone(s.status, s.progress))}
                        style={{ width: `${Math.min(100, s.progress)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11.5px] tabular-nums text-ink-2">
                      {s.progress}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={clsx(
                      "font-mono text-[11.5px] font-semibold tabular-nums",
                      s.margin < 10 ? "text-danger" : s.margin < 15 ? "text-warning" : "text-success"
                    )}
                  >
                    {s.margin.toFixed(1).replace(".", ",")} %
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-[11.5px] tabular-nums text-ink-2">
                  {formatFCFA(s.budget)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
