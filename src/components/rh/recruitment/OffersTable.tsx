"use client";

import { Building2, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { useOffers } from "@/hooks/useRhRecruitment";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(s: string): string {
  if (s === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  if (s === "DRAFT") return "bg-surface-alt text-ink-3";
  if (s === "CLOSED") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

export function OffersTable() {
  const { data, isLoading } = useOffers();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Référence</th>
              <th className="px-3 py-2 text-left">Poste</th>
              <th className="px-3 py-2 text-left">Département</th>
              <th className="px-3 py-2 text-left">Contrat</th>
              <th className="px-3 py-2 text-right">Postes</th>
              <th className="px-3 py-2 text-right">Candidatures</th>
              <th className="px-3 py-2 text-left">Publié le</th>
              <th className="px-3 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((o) => (
              <tr key={o.reference} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{o.reference}</td>
                <td className="px-3 py-2 font-medium text-ink">{o.title}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{o.department}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{o.contractType}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] text-ink">{o.positions}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] text-ink">{o.applicationsCount}</td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(o.publishedAt)}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusBadge(o.status))}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((o) => (
          <li key={o.reference} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3">{o.reference}</div>
                <div className="text-[13px] font-semibold text-ink">{o.title}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">
                  <Building2 className="mr-1 inline h-3 w-3" /> {o.department}
                </div>
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", statusBadge(o.status))}>
                {o.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-[10px] uppercase text-ink-3">Postes</div>
                <div className="font-mono text-[12px] font-bold text-ink">{o.positions}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-ink-3">Candidatures</div>
                <div className="font-mono text-[12px] font-bold text-ink">{o.applicationsCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-ink-3">Région</div>
                <div className="text-[11.5px] text-ink">
                  <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                  {o.region}
                </div>
              </div>
            </div>
            <div className="mt-1 text-right text-[10.5px] text-ink-3">Publié {fmtDate(o.publishedAt)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
