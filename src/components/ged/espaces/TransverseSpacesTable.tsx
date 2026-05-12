"use client";

import { ChevronRight } from "lucide-react";
import { Confidentiality } from "@prisma/client";
import type { GedSpaceRow } from "@/hooks/useGedSpaces";

const CONF_STYLE: Record<Confidentiality, { label: string; chip: string }> = {
  PUBLIC: { label: "Public", chip: "bg-emerald-100 text-emerald-700" },
  INTERNAL: { label: "Interne", chip: "bg-blue-100 text-blue-700" },
  RESTRICTED: { label: "Restreint", chip: "bg-amber-100 text-amber-700" },
  CONFIDENTIAL: { label: "Confidentiel", chip: "bg-rose-100 text-rose-700" },
};

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

function indexationTone(rate: number): string {
  if (rate >= 95) return "text-emerald-700";
  if (rate >= 85) return "text-violet-700";
  return "text-amber-700";
}

interface Props {
  rows: GedSpaceRow[];
  onOpen: (id: string) => void;
}

export function TransverseSpacesTable({ rows, onOpen }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Espaces transverses ({rows.length})</h2>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">Aucun espace transverse à afficher.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Espace</th>
                  <th className="px-4 py-2 text-left font-semibold">Responsable</th>
                  <th className="px-4 py-2 text-right font-semibold">Documents</th>
                  <th className="px-4 py-2 text-right font-semibold">Volume</th>
                  <th className="px-4 py-2 text-right font-semibold">Indexation</th>
                  <th className="px-4 py-2 text-left font-semibold">Confidentialité</th>
                  <th className="px-4 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const conf = CONF_STYLE[r.confidentiality];
                  return (
                    <tr key={r.id} className="hover:bg-surface-alt/40">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px]">{r.icon ?? "📁"}</span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">{r.name}</div>
                            <div className="font-mono text-[11px] text-ink-3">{r.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-ink-3">{r.responsibleName ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-ink">{r.documentsCount.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2 text-right font-mono text-ink-3">{formatVolume(r.volumeBytes)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${indexationTone(r.indexationRate)}`}>{r.indexationRate}%</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${conf.chip}`}>
                          {conf.label}
                        </span>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line sm:hidden">
            {rows.map((r) => {
              const conf = CONF_STYLE[r.confidentiality];
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-alt/40"
                  >
                    <span className="text-[20px]">{r.icon ?? "📁"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">{r.name}</span>
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${conf.chip}`}>
                          {conf.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-ink-3">
                        {r.documentsCount.toLocaleString("fr-FR")} docs · {formatVolume(r.volumeBytes)} ·{" "}
                        <span className={indexationTone(r.indexationRate)}>{r.indexationRate}% indexés</span>
                      </div>
                      {r.responsibleName && <div className="text-[11px] text-ink-3">Resp. {r.responsibleName}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
