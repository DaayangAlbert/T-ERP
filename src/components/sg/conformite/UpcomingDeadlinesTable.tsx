"use client";

import { CalendarClock, BookCheck, ShieldCheck, Users, Banknote, Crown } from "lucide-react";
import { clsx } from "clsx";
import type { ComplianceDeadline } from "@/hooks/useSgCompliance";

interface Props {
  deadlines: ComplianceDeadline[];
}

const CATEGORY_ICON: Record<string, typeof BookCheck> = {
  REGISTER_REVIEW: BookCheck,
  APPROVAL_RENEWAL: ShieldCheck,
  GOVERNANCE_AG: Users,
  GOVERNANCE_BOARD: Crown,
  BANK_GUARANTEE: Banknote,
};

const CATEGORY_LABEL: Record<string, string> = {
  REGISTER_REVIEW: "Audit registre",
  APPROVAL_RENEWAL: "Renouvellement agrément",
  GOVERNANCE_AG: "Assemblée Générale",
  GOVERNANCE_BOARD: "Conseil d'Administration",
  BANK_GUARANTEE: "Garantie bancaire",
};

const TONE: Record<string, string> = {
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function UpcomingDeadlinesTable({ deadlines }: Props) {
  if (deadlines.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white px-4 py-6 text-center">
        <CalendarClock className="mx-auto h-8 w-8 text-ink-3/40" />
        <p className="mt-2 text-[12.5px] text-ink-3">Aucune échéance dans les 90 prochains jours.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">
          Échéances 90 jours ({deadlines.length})
        </h2>
      </header>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Catégorie</th>
              <th className="px-4 py-2 text-left font-semibold">Obligation</th>
              <th className="px-4 py-2 text-left font-semibold">Détail</th>
              <th className="px-4 py-2 text-left font-semibold">Échéance</th>
              <th className="px-4 py-2 text-center font-semibold">Délai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deadlines.map((d) => {
              const Icon = CATEGORY_ICON[d.category] ?? CalendarClock;
              return (
                <tr key={d.id} className="hover:bg-surface-alt/40">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <Icon className="h-3.5 w-3.5 text-violet-600" />
                      {CATEGORY_LABEL[d.category] ?? d.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-semibold text-ink">{d.label}</td>
                  <td className="px-4 py-2 text-[11.5px] text-ink-3">{d.detail}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-ink-3">{fmtDate(d.dueDate)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", TONE[d.severity])}>
                      J-{d.daysAway}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line sm:hidden">
        {deadlines.map((d) => {
          const Icon = CATEGORY_ICON[d.category] ?? CalendarClock;
          return (
            <li key={d.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
                  <Icon className="h-3.5 w-3.5 text-violet-600" />
                  {CATEGORY_LABEL[d.category] ?? d.category}
                </span>
                <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TONE[d.severity])}>
                  J-{d.daysAway}
                </span>
              </div>
              <div className="mt-1 text-[12.5px] font-semibold text-ink">{d.label}</div>
              <div className="text-[11px] text-ink-3">{d.detail}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">{fmtDate(d.dueDate)}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
