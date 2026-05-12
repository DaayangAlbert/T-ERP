"use client";

import { useState } from "react";
import { ChevronRight, ChevronsDown } from "lucide-react";
import type { GedSpaceRow } from "@/hooks/useGedSpaces";

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

interface Props {
  rows: GedSpaceRow[];
  onOpen: (id: string) => void;
  initialLimit?: number;
}

export function ConstructionSitesSpacesTable({ rows, onOpen, initialLimit = 6 }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, initialLimit);

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">
          Espaces chantiers ({rows.length})
          {!showAll && rows.length > initialLimit && (
            <span className="ml-2 text-[11.5px] font-normal text-ink-3">
              · extrait top {initialLimit}
            </span>
          )}
        </h2>
        {rows.length > initialLimit && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-violet-700 hover:underline"
          >
            <ChevronsDown className="h-3.5 w-3.5" />
            {showAll ? "Réduire" : `Voir les ${rows.length} chantiers`}
          </button>
        )}
      </header>
      {visible.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">Aucun chantier à afficher.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Chantier</th>
                  <th className="px-4 py-2 text-left font-semibold">Conducteur</th>
                  <th className="px-4 py-2 text-right font-semibold">Documents</th>
                  <th className="px-4 py-2 text-right font-semibold">Volume</th>
                  <th className="px-4 py-2 text-left font-semibold">Phase</th>
                  <th className="px-4 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-alt/40">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px]">{r.icon ?? "🏗"}</span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">{r.name}</div>
                          <div className="font-mono text-[11px] text-ink-3">{r.siteCode ?? r.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-ink-3">{r.siteManager ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-ink">{r.documentsCount.toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-2 text-right font-mono text-ink-3">{formatVolume(r.volumeBytes)}</td>
                    <td className="px-4 py-2 text-ink-3">{r.siteStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onOpen(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        Ouvrir <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line sm:hidden">
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-alt/40"
                >
                  <span className="text-[20px]">{r.icon ?? "🏗"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{r.name}</div>
                    <div className="font-mono text-[11px] text-ink-3">{r.siteCode ?? r.code}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">
                      {r.documentsCount.toLocaleString("fr-FR")} docs · {formatVolume(r.volumeBytes)} · {r.siteStatus ?? "—"}
                    </div>
                    {r.siteManager && <div className="text-[11px] text-ink-3">Cond. {r.siteManager}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
