"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import type { DtSite } from "@/hooks/useDtPortfolio";

const TYPE_LABEL: Record<string, string> = {
  ROAD: "Routier",
  BUILDING: "Bâtiment",
  CIVIL_ENG: "Génie civil",
  DEVELOPMENT: "Aménagement",
  HYDRAULIC: "Hydraulique",
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  DRIFTING: "bg-rose-100 text-rose-700",
  ON_HOLD: "bg-slate-200 text-slate-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planifié",
  ACTIVE: "En cours",
  AT_RISK: "Vigilance",
  DRIFTING: "Dérive",
  ON_HOLD: "Suspendu",
  COMPLETED: "Livré",
  ARCHIVED: "Archivé",
};

function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
}

interface Props {
  sites: DtSite[];
  onSelect: (id: string) => void;
}

export function SitesTable({ sites, onSelect }: Props) {
  if (sites.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
        Aucun chantier ne correspond aux filtres.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              <th className="px-3 py-2 text-left font-medium">Chantier</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">MOA</th>
              <th className="px-3 py-2 text-left font-medium">Dir. trav.</th>
              <th className="px-3 py-2 text-right font-medium">Budget</th>
              <th className="px-3 py-2 text-right font-medium">Av. phys.</th>
              <th className="px-3 py-2 text-right font-medium">Marge</th>
              <th className="px-3 py-2 text-left font-medium">Livraison</th>
              <th className="px-3 py-2 text-left font-medium">État</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="cursor-pointer border-t border-line hover:bg-surface-alt/60"
              >
                <td className="px-3 py-2 font-mono text-[11.5px]">{s.code}</td>
                <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                <td className="px-3 py-2 text-ink-2">{TYPE_LABEL[s.type] ?? s.type}</td>
                <td className="px-3 py-2 text-ink-2">
                  <div className="truncate">{s.moaName ?? s.client}</div>
                </td>
                <td className="px-3 py-2 text-ink-2">{s.managerName ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtAmount(s.budget)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Math.round(s.progress)} %</td>
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
                  <span
                    className={clsx(
                      "inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      STATUS_BADGE[s.status]
                    )}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards par chantier (tap to open drawer) */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {sites.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="rounded-lg border border-line bg-white p-3 text-left active:bg-surface-alt"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-ink-3">{s.code}</div>
                <div className="text-[13px] font-semibold text-ink">{s.name}</div>
              </div>
              <span
                className={clsx(
                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  STATUS_BADGE[s.status]
                )}
              >
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
              <div>
                <dt className="text-ink-3">MOA</dt>
                <dd className="truncate font-medium">{s.moaName ?? s.client}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Dir. trav.</dt>
                <dd className="font-medium">{s.managerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Budget</dt>
                <dd className="font-medium tabular-nums">{fmtAmount(s.budget)} FCFA</dd>
              </div>
              <div>
                <dt className="text-ink-3">Avancement</dt>
                <dd className="font-medium tabular-nums">{Math.round(s.progress)} %</dd>
              </div>
              <div>
                <dt className="text-ink-3">Marge</dt>
                <dd
                  className={clsx(
                    "font-medium tabular-nums",
                    s.margin < s.marginTarget && "text-rose-700"
                  )}
                >
                  {s.margin.toFixed(1)} %
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">Livraison</dt>
                <dd className="font-medium">
                  {format(new Date(s.plannedEndDate), "dd/MM/yy", { locale: fr })}
                </dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </div>
  );
}
