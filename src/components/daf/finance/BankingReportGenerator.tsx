"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { clsx } from "clsx";

interface BankPreset {
  key: string;
  label: string;
  fullName: string;
  color: string;
  bgColor: string;
  format: string;
  blocks: string[];
}

const BANKS: BankPreset[] = [
  {
    key: "uba",
    label: "UBA",
    fullName: "UBA Cameroun",
    color: "#FFFFFF",
    bgColor: "#D71920",
    format: "Mensuel — Synthèse + ratios",
    blocks: ["Trésorerie consolidée", "Lignes de crédit", "Flux du mois", "Ratios prudentiels", "Forecast 6 mois"],
  },
  {
    key: "bicec",
    label: "BICEC",
    fullName: "BICEC",
    color: "#FFFFFF",
    bgColor: "#0F766E",
    format: "Trimestriel — Pilier prudentiel + prévisionnel 6 mois",
    blocks: ["Synthèse Q", "Ratios bâlois", "Engagements hors bilan", "Forecast 6 mois", "Stress tests"],
  },
  {
    key: "afriland",
    label: "Afriland",
    fullName: "Afriland First Bank",
    color: "#FFFFFF",
    bgColor: "#1D4ED8",
    format: "Mensuel — Tableau de bord financier consolidé",
    blocks: ["Tableau de bord", "P&L synthétique", "Bilan synthétique", "Trésorerie 6 mois"],
  },
  {
    key: "ecobank",
    label: "Ecobank",
    fullName: "Ecobank Cameroun",
    color: "#FFFFFF",
    bgColor: "#1F2937",
    format: "Trimestriel — Compliance + ratios",
    blocks: ["Compliance KYC", "Ratios financiers", "Bénéficiaires effectifs", "Forecast"],
  },
  {
    key: "sgbc",
    label: "SGBC",
    fullName: "Société Générale Cameroun",
    color: "#FFFFFF",
    bgColor: "#000000",
    format: "Mensuel — Format SGBC standard",
    blocks: ["Format SGBC standard", "Tableau ratios", "Plan de trésorerie", "Engagements"],
  },
];

export function BankingReportGenerator() {
  const [selected, setSelected] = useState<string>("uba");
  const [downloading, setDownloading] = useState(false);

  const bank = BANKS.find((b) => b.key === selected) ?? BANKS[0];

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/daf/finance/banking-report/${bank.key}/pdf`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporting_${bank.key}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Sélection de la banque destinataire</h3>
        <p className="text-[11.5px] text-ink-3">Chaque banque a son format préféré.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {BANKS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setSelected(b.key)}
              className={clsx(
                "rounded-md border px-2.5 py-3 text-left transition",
                selected === b.key
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                  : "border-line bg-white hover:bg-surface-alt"
              )}
            >
              <div
                className="mb-2 grid h-7 w-12 place-items-center rounded text-[10px] font-bold tracking-wider"
                style={{ backgroundColor: b.bgColor, color: b.color }}
              >
                {b.label}
              </div>
              <div className="text-[12px] font-semibold text-ink">{b.fullName}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.4fr)]">
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Configuration du document</h3>
          <div className="mt-2 space-y-2 text-[12.5px]">
            <div>
              <span className="text-ink-3">Format demandé : </span>
              <span className="font-medium text-ink">{bank.format}</span>
            </div>
            <div>
              <span className="text-ink-3">Blocs inclus : </span>
              <ul className="mt-1 space-y-1">
                {bank.blocks.map((bl) => (
                  <li key={bl} className="flex items-center gap-2 text-[12px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    {bl}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-3 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Génération..." : `Générer pour relationship manager ${bank.label}`}
          </button>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <header className="mb-3 flex items-center gap-2 border-b border-line pb-2">
            <FileText className="h-4 w-4 text-ink-3" />
            <h3 className="text-[13px] font-semibold text-ink">Aperçu du document</h3>
          </header>
          <div className="space-y-3">
            <div
              className="rounded-md border-l-4 px-3 py-2"
              style={{ borderColor: bank.bgColor, backgroundColor: `${bank.bgColor}15` }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: bank.bgColor }}>
                T-ERP · REPORTING BANCAIRE
              </div>
              <div className="text-[14px] font-bold text-ink">Synthèse financière — {bank.fullName}</div>
              <div className="text-[11px] text-ink-3">Préparé pour : Relationship Manager {bank.label}</div>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex items-center justify-between border-b border-dashed border-line py-1">
                <span className="text-ink-3">Trésorerie consolidée multi-banques</span>
                <span className="font-mono font-bold text-ink">— FCFA</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-line py-1">
                <span className="text-ink-3">Lignes de crédit disponibles</span>
                <span className="font-mono font-bold text-ink">— FCFA</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-line py-1">
                <span className="text-ink-3">Liquidité immédiate</span>
                <span className="font-mono font-bold text-ink">—</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-line py-1">
                <span className="text-ink-3">Couverture des charges</span>
                <span className="font-mono font-bold text-ink">— mois</span>
              </div>
            </div>
            <div className="rounded-md bg-amber-50 p-2 text-[10.5px] text-amber-800">
              ⚠ Document préparé par la DAF à des fins relationnelles. Les états officiels (DSF, états financiers OHADA) restent les seuls documents opposables.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
