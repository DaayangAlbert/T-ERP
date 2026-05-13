"use client";

import { Crown, Users, ShieldCheck, Briefcase, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import type { BoardMember } from "@/hooks/useSgGovernance";
import type { BoardMemberFunction } from "@prisma/client";

const FUNCTION_LABEL: Record<BoardMemberFunction, string> = {
  PRESIDENT_CEO: "Président-DG",
  PRESIDENT_BOARD: "Président CA",
  DIRECTOR_GENERAL: "Directeur Général",
  ADMINISTRATOR: "Administrateur",
  INDEPENDENT_DIRECTOR: "Administrateur indépendant",
  BOARD_SECRETARY: "Secrétaire CA",
};

const FUNCTION_ICON: Record<BoardMemberFunction, typeof Crown> = {
  PRESIDENT_CEO: Crown,
  PRESIDENT_BOARD: Crown,
  DIRECTOR_GENERAL: Briefcase,
  ADMINISTRATOR: Users,
  INDEPENDENT_DIRECTOR: ShieldCheck,
  BOARD_SECRETARY: BookOpen,
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  members: BoardMember[];
}

export function BoardCompositionTable({ members }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Composition du Conseil d'Administration ({members.length})</h2>
      </header>
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Nom</th>
              <th className="px-4 py-2 text-left font-semibold">Fonction</th>
              <th className="px-4 py-2 text-left font-semibold">Représentation</th>
              <th className="px-4 py-2 text-left font-semibold">Début mandat</th>
              <th className="px-4 py-2 text-left font-semibold">Échéance</th>
              <th className="px-4 py-2 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => {
              const Icon = FUNCTION_ICON[m.function];
              return (
                <tr key={m.id} className="hover:bg-surface-alt/40">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-ink">{m.fullName}</div>
                    {m.isIndependent && (
                      <span className="text-[10.5px] text-violet-700">Indépendant</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-[12px] text-ink">
                      <Icon className="h-3.5 w-3.5 text-violet-600" /> {FUNCTION_LABEL[m.function]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[11.5px] text-ink-3">{m.representingEntity ?? "Lui-même"}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-ink-3">{fmtDate(m.mandateStartDate)}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-ink-3">{fmtDate(m.mandateEndDate)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        m.mandateStatus === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : m.mandateStatus === "EXPIRING_SOON"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {m.mandateStatus === "ACTIVE"
                        ? `${Math.round(m.daysToEndOfMandate / 30)} mois restants`
                        : m.mandateStatus === "EXPIRING_SOON"
                          ? `Échéance J-${m.daysToEndOfMandate}`
                          : "Échu"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile : cards */}
      <ul className="divide-y divide-line sm:hidden">
        {members.map((m) => {
          const Icon = FUNCTION_ICON[m.function];
          return (
            <li key={m.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-ink">{m.fullName}</div>
                <span
                  className={clsx(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    m.mandateStatus === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : m.mandateStatus === "EXPIRING_SOON"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700",
                  )}
                >
                  {m.mandateStatus === "ACTIVE" ? "Actif" : m.mandateStatus === "EXPIRING_SOON" ? "Bientôt expiré" : "Échu"}
                </span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-3">
                <Icon className="h-3 w-3 text-violet-600" /> {FUNCTION_LABEL[m.function]}
                {m.isIndependent && <span className="ml-1 text-violet-700">· Indépendant</span>}
              </div>
              {m.representingEntity && (
                <div className="text-[10.5px] text-ink-3">Représente : {m.representingEntity}</div>
              )}
              <div className="mt-0.5 font-mono text-[10px] text-ink-3">
                {fmtDate(m.mandateStartDate)} → {fmtDate(m.mandateEndDate)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
