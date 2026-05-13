"use client";

import { clsx } from "clsx";

const JOURNALS = [
  { code: "ACH", label: "Achats", siteRestricted: false },
  { code: "VTE", label: "Ventes", siteRestricted: false },
  { code: "BQ", label: "Banque", siteRestricted: true },
  { code: "OD", label: "OD", siteRestricted: true },
  { code: "PAIE", label: "Paie", siteRestricted: true },
  { code: "CAI", label: "Caisse chantier", siteRestricted: false },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  isSiteAccountant: boolean;
}

export function JournalSelector({ value, onChange, isSiteAccountant }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {JOURNALS.map((j) => {
        const disabled = isSiteAccountant && j.siteRestricted;
        return (
          <button
            key={j.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(j.code)}
            className={clsx(
              "shrink-0 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition",
              value === j.code
                ? "border-primary-500 bg-primary-500 text-white"
                : "border-line bg-white text-ink-2 hover:border-primary-300",
              disabled && "cursor-not-allowed opacity-40"
            )}
            title={disabled ? "Réservé au Comptable Direction" : undefined}
          >
            {j.label} <span className="opacity-70">({j.code})</span>
          </button>
        );
      })}
    </div>
  );
}
