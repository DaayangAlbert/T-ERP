"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

export function IncomeAttestationGenerator() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-card">
      <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        <FileText className="h-3.5 w-3.5" /> Attestation de revenus annuelle
      </h3>
      <p className="mb-4 text-[12.5px] text-ink-2">
        Générer une attestation officielle pour la déclaration annuelle de revenus à la DGI.
        Le document récapitule le brut, le net, l'IRPP, le CAC et la CNPS pour l'année choisie.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="block">
          <span className="text-[11.5px] font-semibold text-ink-2">Exercice fiscal</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 h-9 rounded-md border border-line bg-white px-2.5 text-[13px]"
          >
            {Array.from({ length: 4 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <a
          href={`/api/users/me/income-attestation/pdf?year=${year}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Download className="h-3.5 w-3.5" /> Télécharger PDF {year}
        </a>
      </div>
    </section>
  );
}
