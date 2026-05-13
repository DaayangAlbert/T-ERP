"use client";

import { ChevronRight, Building2 } from "lucide-react";
import { clsx } from "clsx";
import type { ContractListRow } from "@/hooks/useSgContracts";
import { getPhaseShort } from "./ContractsLifecycleVisual";
import { MOA_LABEL } from "./ContractsFiltersCard";

const STATUS_CHIP: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const PHASE_CHIP: Record<string, string> = {
  CALL_FOR_TENDERS_WATCH: "bg-slate-100 text-slate-700",
  STUDY_AND_SUBMISSION: "bg-amber-100 text-amber-700",
  AWAITING_ATTRIBUTION: "bg-blue-100 text-blue-700",
  CONTRACT_SIGNATURE: "bg-violet-100 text-violet-700",
  ORDER_SERVICE: "bg-violet-100 text-violet-700",
  EXECUTION: "bg-emerald-100 text-emerald-700",
  RECEPTION: "bg-emerald-100 text-emerald-700",
  GUARANTEE_PERIOD: "bg-blue-100 text-blue-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

function fmtAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
  return v.toLocaleString("fr-FR");
}

interface Props {
  rows: ContractListRow[];
  onOpen: (id: string) => void;
}

export function ContractsTable({ rows, onOpen }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Marchés ({rows.length})</h2>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">Aucun marché correspondant aux filtres.</div>
      ) : (
        <>
          {/* Desktop : table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Référence</th>
                  <th className="px-4 py-2 text-left font-semibold">Intitulé</th>
                  <th className="px-4 py-2 text-left font-semibold">MOA</th>
                  <th className="px-4 py-2 text-right font-semibold">Montant HT</th>
                  <th className="px-4 py-2 text-left font-semibold">Phase</th>
                  <th className="px-4 py-2 text-left font-semibold">Garanties</th>
                  <th className="px-4 py-2 text-left font-semibold">Statut</th>
                  <th className="px-4 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onOpen(r.id)}
                    className="cursor-pointer hover:bg-surface-alt/40"
                  >
                    <td className="px-4 py-2 font-mono text-[11.5px] font-bold text-violet-700">{r.reference}</td>
                    <td className="px-4 py-2">
                      <div className="line-clamp-1 max-w-[280px] font-semibold text-ink">{r.title}</div>
                      {r.siteName && (
                        <div className="text-[10.5px] text-ink-3 inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {r.siteName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[11.5px] text-ink-3">
                      <div className="line-clamp-1 max-w-[180px]">{r.contractingAuthority}</div>
                      <div className="text-[10.5px]">{MOA_LABEL[r.authorityType] ?? r.authorityType}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-ink">
                      {fmtAmount(r.amountHT)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", PHASE_CHIP[r.phase])}>
                        {getPhaseShort(r.phase)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[11.5px] text-ink-3">
                      {r.guaranteesActive > 0 ? (
                        <>
                          <div className="font-mono font-semibold text-ink">{fmtAmount(r.guaranteesTotal)}</div>
                          <div className="text-[10.5px]">{r.guaranteesBanks.join(", ")}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_CHIP[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-ink-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile : cards */}
          <ul className="divide-y divide-line sm:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-alt/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-[11px] font-bold text-violet-700">{r.reference}</span>
                      <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", PHASE_CHIP[r.phase])}>
                        {getPhaseShort(r.phase)}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink">{r.title}</div>
                    <div className="mt-1 text-[11px] text-ink-3">
                      {r.contractingAuthority} · <span className="font-mono font-semibold text-ink">{fmtAmount(r.amountHT)} FCFA</span>
                    </div>
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
