"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLeaveCalendar } from "@/hooks/useRhLeaves";
import { clsx } from "clsx";

const TYPE_LABEL: Record<string, string> = {
  PAID_LEAVE: "Congé payé",
  RTT: "RTT",
  UNPAID: "Sans solde",
  SICK: "Maladie",
  MATERNITY: "Maternité",
  PATERNITY: "Paternité",
  FAMILY: "Familial",
  OTHER: "Autre",
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function TeamCalendar() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedEmpKey, setSelectedEmpKey] = useState<string | null>(null);
  const { data, isLoading } = useLeaveCalendar(month);

  if (isLoading || !data) {
    return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const selectedRow = selectedEmpKey ? data.rows.find((r) => r.employeeKey === selectedEmpKey) : data.rows[0];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[13px] font-semibold text-ink">{month}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, +1))}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10.5px]">
          {data.legend.map((l) => (
            <span key={l.type} className="inline-flex items-center gap-1 text-ink-3">
              <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: l.color }} />
              {TYPE_LABEL[l.type] ?? l.type}
            </span>
          ))}
        </div>
      </header>

      {/* Desktop / tablette : tableau scroll horizontal avec sticky col */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[10.5px]">
          <thead className="bg-surface-alt">
            <tr>
              <th className="sticky left-0 z-10 bg-surface-alt px-2 py-1.5 text-left font-semibold uppercase tracking-wide text-ink-3">
                Employé
              </th>
              {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map((d) => (
                <th key={d} className="w-6 px-0 py-1.5 text-center font-mono font-semibold text-ink-3 lg:w-7">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.employeeKey} className="border-t border-line">
                <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-[11px] font-medium text-ink truncate max-w-[140px]">
                  {row.employeeName}
                </td>
                {row.cells.map((c) => (
                  <td key={c.day} className="px-0 py-1">
                    <div
                      className="mx-auto h-4 w-4 rounded-sm lg:h-5 lg:w-5"
                      style={{ backgroundColor: c.color ?? "#F8F4FB" }}
                      title={c.type ? TYPE_LABEL[c.type] : ""}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : un employé à la fois + calendrier mensuel */}
      <div className="space-y-2 md:hidden">
        <select
          value={selectedRow?.employeeKey ?? ""}
          onChange={(e) => setSelectedEmpKey(e.target.value)}
          className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
        >
          {data.rows.map((r) => (
            <option key={r.employeeKey} value={r.employeeKey}>
              {r.employeeName}
            </option>
          ))}
        </select>
        {selectedRow && (
          <div className="rounded-xl border border-line bg-white p-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="py-1 font-semibold text-ink-3">{d}</div>
              ))}
              {(() => {
                const [y, m] = month.split("-").map(Number);
                const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // L=0
                const cells: React.ReactNode[] = [];
                for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} />);
                selectedRow.cells.forEach((c) => {
                  cells.push(
                    <div
                      key={c.day}
                      className={clsx(
                        "grid h-9 place-items-center rounded text-[11.5px] font-mono",
                        c.color ? "text-white font-bold" : "text-ink"
                      )}
                      style={{ backgroundColor: c.color ?? "transparent" }}
                      title={c.type ? TYPE_LABEL[c.type] : ""}
                    >
                      {c.day}
                    </div>
                  );
                });
                return cells;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
