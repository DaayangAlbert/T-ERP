"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Item {
  candidateName: string;
  position: string;
  site: string;
  stage: string;
  expectedStartDate: string;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function HiringPipelineTable({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
        Aucune embauche en cours.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h3 className="text-[13px] font-semibold text-ink">Embauches en cours</h3>
        <Link
          href="/ressources-humaines/recrutement"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary-700 hover:underline"
        >
          Pipeline <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Candidat</th>
              <th className="px-3 py-2 text-left">Poste</th>
              <th className="px-3 py-2 text-left">Affectation</th>
              <th className="px-3 py-2 text-left">Étape</th>
              <th className="px-3 py-2 text-right">Date d'entrée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((it) => (
              <tr key={it.candidateName} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-medium text-ink">{it.candidateName}</td>
                <td className="px-3 py-2 text-[12px] text-ink-2">{it.position}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{it.site}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                    {it.stage}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-[11.5px] text-ink-3">
                  {fmtDate(it.expectedStartDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="divide-y divide-line md:hidden">
        {items.map((it) => (
          <li key={it.candidateName} className="px-3 py-2.5">
            <div className="text-[13px] font-semibold text-ink">{it.candidateName}</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11.5px]">
              <Cell label="Poste" value={it.position} />
              <Cell label="Chantier" value={it.site} />
              <Cell label="Étape" value={it.stage} />
              <Cell label="Date entrée" value={fmtDate(it.expectedStartDate)} />
            </div>
            <div className="mt-2">
              <Link
                href="/ressources-humaines/recrutement"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-white text-[12.5px] font-semibold text-primary-700 hover:bg-surface-alt"
              >
                Suivi
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="truncate text-[12px] text-ink">{value}</div>
    </div>
  );
}
