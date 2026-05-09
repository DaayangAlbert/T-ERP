"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteStatus, SiteType } from "@prisma/client";
import type { SiteListItem } from "@/hooks/useSites";
import { ProgressInline } from "./ProgressInline";
import { formatDate, formatFCFA } from "@/lib/format";

const STATUS_LABELS: Record<SiteStatus, string> = {
  PLANNED: "Planifié",
  ACTIVE: "Sain",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "Dérive",
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

const TYPE_LABELS: Record<SiteType, string> = {
  ROAD: "BTP routier",
  BUILDING: "Bâtiment",
  CIVIL_ENG: "Génie civil",
  DEVELOPMENT: "Aménagement",
  HYDRAULIC: "Forage / AEP",
};

interface Props {
  items: SiteListItem[];
  loading?: boolean;
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function SitesTable({ items, loading, page, pages, total, onPageChange }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2.5 pl-4 text-left">Code</th>
              <th className="py-2.5 text-left">Libellé</th>
              <th className="py-2.5 text-left">Client</th>
              <th className="py-2.5 text-left">Dir. travaux</th>
              <th className="py-2.5 text-left">Avancement</th>
              <th className="py-2.5 text-right">Budget</th>
              <th className="py-2.5 text-right">Marge</th>
              <th className="py-2.5 text-left">Livraison</th>
              <th className="py-2.5 pr-4 text-left">État</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="py-3 pl-4 last:pr-4">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-surface-alt" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-sm text-ink-3">
                  Aucun chantier ne correspond aux filtres.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((s, i) => (
                <tr
                  key={s.id}
                  className={clsx("transition hover:bg-surface-alt", i < items.length - 1 && "border-b border-line")}
                >
                  <td className="py-2.5 pl-4">
                    <Link
                      href={`/chantiers/${s.id}`}
                      className="rounded bg-surface-alt px-2 py-0.5 font-mono text-[11.5px] text-ink-2 hover:text-primary-700"
                    >
                      {s.code}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <Link href={`/chantiers/${s.id}`} className="block hover:text-primary-700">
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-[11px] text-ink-3">
                        {TYPE_LABELS[s.type]}
                        {s.region && ` · ${s.region}`}
                      </div>
                    </Link>
                  </td>
                  <td className="py-2.5 text-ink-2">{s.client}</td>
                  <td className="py-2.5 text-ink-2">
                    {s.manager ? `${s.manager.firstName.charAt(0)}. ${s.manager.lastName}` : "—"}
                  </td>
                  <td className="py-2.5">
                    <ProgressInline progress={s.progress} status={s.status} />
                  </td>
                  <td className="py-2.5 text-right font-mono text-[11.5px] tabular-nums text-ink-2">
                    {formatFCFA(BigInt(s.budget))}
                  </td>
                  <td
                    className={clsx(
                      "py-2.5 text-right font-mono text-[11.5px] font-semibold tabular-nums",
                      s.margin < 10 ? "text-danger" : s.margin < 15 ? "text-warning" : "text-success"
                    )}
                  >
                    {s.margin.toFixed(1).replace(".", ",")} %
                  </td>
                  <td className="py-2.5 text-ink-2">{formatDate(s.plannedEndDate)}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        STATUS_TONE[s.status]
                      )}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between border-t border-line bg-surface-alt px-4 py-2.5 text-[12px] text-ink-3">
          <span>
            {(page - 1) * (items.length || 1) + 1}–{(page - 1) * (items.length || 1) + items.length} sur{" "}
            {total} chantier{total > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-2 hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11.5px] tabular-nums">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-2 hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Suivant"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
