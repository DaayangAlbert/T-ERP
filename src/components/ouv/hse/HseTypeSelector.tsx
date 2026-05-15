"use client";

import { ChevronRight } from "lucide-react";
import { hseTypeLabel, hseTypeEmoji, hseTypeSubLabel, type OuvHseType } from "@/schemas/ouv-hse";

interface Props {
  onSelect: (type: OuvHseType) => void;
}

const TYPES: Array<{
  value: OuvHseType;
  iconBg: string;
  border: string;
}> = [
  { value: "CORPORAL_ACCIDENT", iconBg: "bg-rose-50", border: "border-rose-500" },
  { value: "NEAR_MISS", iconBg: "bg-amber-50", border: "border-slate-200" },
  { value: "EQUIPMENT_DEFECT", iconBg: "bg-blue-50", border: "border-slate-200" },
  { value: "SITE_DANGER", iconBg: "bg-purple-50", border: "border-slate-200" },
  { value: "THEFT_INTRUSION", iconBg: "bg-rose-50", border: "border-slate-200" },
];

// Liste verticale 5 cards XXL (min 76px) avec emoji 28px. Mirror du
// bloc "Quel type d'incident ?" du prototype. La 1ère (corporel) est
// en border rouge — c'est l'incident le plus critique.
export function HseTypeSelector({ onSelect }: Props) {
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Quel type d'incident ?</h3>
      <div className="flex flex-col gap-2.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onSelect(t.value)}
            className={`flex min-h-[76px] items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[0.99] ${t.border}`}
          >
            <span className={`grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-2xl text-[28px] ${t.iconBg}`}>
              {hseTypeEmoji(t.value)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-slate-900">
                {hseTypeLabel(t.value)}
              </p>
              <p className="truncate text-[12.5px] text-slate-500">
                {hseTypeSubLabel(t.value)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={2.5} />
          </button>
        ))}
      </div>
    </section>
  );
}
