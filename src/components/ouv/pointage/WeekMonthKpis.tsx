"use client";

interface Props {
  weekTotalHours: number;
  monthOvertimeHours: number;
}

// 2 mini-KPIs centrés sous la liste hebdo : heures de la semaine + sup du mois.
// Mirror du bloc 2x1 du prototype "48h cette semaine / +4h sup mai".
export function WeekMonthKpis({ weekTotalHours, monthOvertimeHours }: Props) {
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });
  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2.5">
      <div className="rounded-xl border border-slate-100 bg-white p-3.5 text-center">
        <p className="text-[24px] font-extrabold text-slate-900">
          {weekTotalHours.toFixed(1)}
        </p>
        <p className="text-[11px] font-semibold text-slate-500">heures cette semaine</p>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white p-3.5 text-center">
        <p className="text-[24px] font-extrabold text-emerald-600">
          +{monthOvertimeHours.toFixed(1)} h
        </p>
        <p className="text-[11px] font-semibold text-slate-500">heures sup {monthLabel}</p>
      </div>
    </div>
  );
}
