"use client";

import { Phone, Building2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import type { PersonnelRow } from "@/hooks/useRhPersonnel";

interface Props {
  items: PersonnelRow[];
  onSelect: (id: string) => void;
}

function initials(first: string, last: string): string {
  return `${first[0] ?? "?"}${last[0] ?? "?"}`.toUpperCase();
}

function seniority(hireDate: string): string {
  const d = new Date(hireDate);
  if (isNaN(d.getTime())) return "—";
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
  if (years === 0) {
    const months = Math.floor((Date.now() - d.getTime()) / (30 * 86_400_000));
    return `${months} mois`;
  }
  return `${years} an${years > 1 ? "s" : ""}`;
}

function contractBadge(c: string): string {
  if (c === "CDI") return "bg-emerald-100 text-emerald-800";
  if (c === "CDD") return "bg-amber-100 text-amber-800";
  if (c === "JOUR") return "bg-blue-100 text-blue-800";
  return "bg-surface-alt text-ink-3";
}

export function PersonnelTable({ items, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucun employé ne correspond aux filtres.
      </div>
    );
  }

  return (
    <>
      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Matricule</th>
              <th className="px-3 py-2 text-left">Identité</th>
              <th className="px-3 py-2 text-left">Poste</th>
              <th className="px-3 py-2 text-left">Catégorie</th>
              <th className="px-3 py-2 text-left">Contrat</th>
              <th className="px-3 py-2 text-left">Affectation</th>
              <th className="px-3 py-2 text-left">Anc.</th>
              <th className="px-3 py-2 text-left">N° CNPS</th>
              <th className="w-16 px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="cursor-pointer hover:bg-surface-alt/40"
              >
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{p.matricule}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                      {initials(p.firstName, p.lastName)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">{p.fullName}</div>
                      {p.phone && <div className="text-[11px] text-ink-3 truncate">{p.phone}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-[12px] text-ink">{p.position}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{p.category}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", contractBadge(p.contractType))}>
                    {p.contractType}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{p.site}</td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{seniority(p.hireDate)}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-3">{p.cnpsNumber ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(p.id);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] font-medium text-primary-700 hover:bg-surface-alt"
                  >
                    Fiche <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {items.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold text-white">
                {initials(p.firstName, p.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3 truncate">{p.matricule}</div>
                <div className="text-[14px] font-bold text-ink leading-tight">{p.fullName}</div>
                {p.phone && (
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-ink-3">
                    <Phone className="h-3 w-3" /> {p.phone}
                  </div>
                )}
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", contractBadge(p.contractType))}>
                {p.contractType}
              </span>
            </div>
            <div className="my-2 border-t border-line" />
            <dl className="grid grid-cols-2 gap-1 text-[11.5px]">
              <Cell label="Poste" value={p.position} />
              <Cell label="Catégorie" value={p.category} />
              <Cell label="Affectation" value={p.site} icon={<Building2 className="h-3 w-3" />} />
              <Cell label="Anc." value={seniority(p.hireDate)} />
              {p.cnpsNumber && <div className="col-span-2"><Cell label="N° CNPS" value={p.cnpsNumber} mono /></div>}
            </dl>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md bg-primary-500 px-2 text-[12.5px] font-semibold text-white hover:bg-primary-600"
              >
                Fiche complète
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Cell({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className={clsx("truncate text-[11.5px] text-ink", mono && "font-mono")}>
        {icon && <span className="mr-1 inline-block align-middle">{icon}</span>}
        {value}
      </dd>
    </div>
  );
}
