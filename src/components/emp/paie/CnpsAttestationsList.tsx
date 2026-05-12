"use client";

import { useState } from "react";
import { FileText, Download } from "lucide-react";

interface Props {
  /** Année courante affichée par le dashboard (utilisée pour l'année N et N-1). */
  currentYear: number;
}

/**
 * Justificatifs CNPS — attestation cumul annuel. À ce stade affiche les
 * deux dernières années (N-1 complète, N partielle si moins de 12
 * bulletins). Le téléchargement déclenche un fetch JSON qui sera converti
 * en PDF par la fonction de génération d'attestation (fn 1.5).
 *
 * Le bouton télécharger ouvre le JSON brut pour l'instant — un layout
 * PDF dédié (avec mention "Pour faire valoir ce que de droit") sera
 * branché ultérieurement.
 */
export function CnpsAttestationsList({ currentYear }: Props) {
  const [loading, setLoading] = useState<number | null>(null);

  async function download(year: number) {
    setLoading(year);
    try {
      const res = await fetch(`/api/emp/cnps/attestation?year=${year}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attestation-cnps-${year}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Téléchargement attestation CNPS :", e);
    } finally {
      setLoading(null);
    }
  }

  const items: Array<{ year: number; label: string; subtitle: string }> = [
    {
      year: currentYear - 1,
      label: `Attestation CNPS ${currentYear - 1}`,
      subtitle: "Cumul complet · 12 mois",
    },
    {
      year: currentYear - 2,
      label: `Cumul CNPS ${currentYear - 2}`,
      subtitle: "Année archivée",
    },
  ];

  return (
    <section className="mt-6 mb-10">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
        Justificatifs CNPS
      </h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.year}>
              <button
                type="button"
                onClick={() => download(it.year)}
                disabled={loading === it.year}
                className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{it.label}</p>
                  <p className="text-[11px] text-ink-3">{it.subtitle}</p>
                </div>
                <Download className="h-4 w-4 text-ink-3" />
                <span className="sr-only">Télécharger</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
