"use client";

import { Coins, Users, Crown } from "lucide-react";
import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

interface Props {
  capital: SgDashboardResponse["capitalStructure"];
  board: SgDashboardResponse["boardComposition"];
  tenantName: string;
}

function formatBigAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md`;
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} M`;
  return amount.toLocaleString("fr-FR");
}

const ENTITY_LABEL: Record<string, string> = {
  INDIVIDUAL: "Personne physique",
  CORPORATION: "Société",
  INVESTMENT_FUND: "Fonds d'investissement",
  EMPLOYEE_PLAN: "Plan salarié",
};

export function CapitalStructureCard({ capital, board, tenantName }: Props) {
  // Top 4 actionnaires
  const topShareholders = capital.shareholders.slice(0, 4);

  // Function labels for board composition summary
  const presidents = board.members.filter((m) => m.function === "PRESIDENT_CEO" || m.function === "PRESIDENT_BOARD");
  const independents = board.members.filter((m) => m.isIndependent).length;

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-ink">Vie sociale {tenantName}</h2>
      </header>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {/* Card 1 — Capital social */}
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-violet-700">
            <Coins className="h-3.5 w-3.5" /> Capital social
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold leading-none text-ink">
            {formatBigAmount(capital.capitalSocial)} FCFA
          </div>
          <div className="mt-2 space-y-0.5 text-[11.5px] text-ink-3">
            <div>{capital.totalShares.toLocaleString("fr-FR")} actions × {capital.sharesNominal.toLocaleString("fr-FR")} FCFA</div>
            <div>
              Libéré <span className="font-semibold text-emerald-700">{capital.paidUpPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Card 2 — Actionnariat */}
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-violet-700">
            <Users className="h-3.5 w-3.5" /> Actionnariat
          </div>
          <ul className="mt-2 space-y-1.5">
            {topShareholders.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate text-ink">{s.name}</span>
                <span className="shrink-0 font-mono font-semibold text-violet-700">{s.percentage.toFixed(0)} %</span>
              </li>
            ))}
            {capital.shareholders.length > 4 && (
              <li className="text-[10.5px] text-ink-3">+ {capital.shareholders.length - 4} autres ({capital.shareholders.slice(4).reduce((s, x) => s + x.percentage, 0).toFixed(0)} %)</li>
            )}
          </ul>
        </div>

        {/* Card 3 — Conseil d'Administration */}
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-violet-700">
            <Crown className="h-3.5 w-3.5" /> Conseil d'Administration
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold leading-none text-ink">
            {board.totalCount}
          </div>
          <div className="mt-2 space-y-0.5 text-[11.5px] text-ink-3">
            <div>administrateurs · mandats {board.mandateYears} ans</div>
            {independents > 0 && <div>{independents} administrateur{independents > 1 ? "s" : ""} indépendant{independents > 1 ? "s" : ""}</div>}
            {board.cacName && <div>CAC <span className="font-semibold text-ink">{board.cacName}</span> ({board.cacMandateRange})</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
