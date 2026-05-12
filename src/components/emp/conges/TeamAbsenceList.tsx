import { CalendarOff } from "lucide-react";
import type { TeamAbsence } from "@/hooks/useEmpLeaves";
import type { LeaveType } from "@prisma/client";
import { LEAVE_TYPE_LABEL } from "@/lib/emp-labels";
import { formatDateShort } from "@/lib/emp-format";

interface Props {
  absences: TeamAbsence[];
  teamSize: number;
}

function initials(full: string): string {
  return full
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Vue chef d'équipe : équipiers absents sur la semaine courante.
 * Si > 20 % de l'équipe est absente, avertissement visuel
 * (planification critique).
 */
export function TeamAbsenceList({ absences, teamSize }: Props) {
  const ratio = teamSize > 0 ? absences.length / teamSize : 0;
  const critical = ratio > 0.2;

  return (
    <section className="mt-6 mb-10">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Mon équipe absente cette semaine
        </h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            critical ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
          }`}
        >
          <CalendarOff className="h-3 w-3" />
          {absences.length} / {teamSize}
          {critical && " · seuil 20 % dépassé"}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {absences.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-3">
            Aucun équipier absent cette semaine.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {absences.map((a) => (
              <li
                key={`${a.userId}-${a.startDate}`}
                className="flex min-h-[68px] items-center gap-3 px-4 py-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                  {initials(a.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.fullName}</p>
                  <p className="text-[11px] text-ink-3">
                    {a.position ?? "—"} · {LEAVE_TYPE_LABEL[a.type as LeaveType] ?? a.type}
                  </p>
                  {a.reason && (
                    <p className="truncate text-[11px] text-ink-2">{a.reason}</p>
                  )}
                </div>
                <div className="text-right text-[11px] text-ink-3">
                  {formatDateShort(a.startDate)} → {formatDateShort(a.endDate)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
