"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Clock } from "lucide-react";
import { PageHelp } from "@/components/help/PageHelp";
import { RapportsTutorial } from "@/components/help/tutorials/RapportsTutorial";

interface Template {
  type: string;
  label: string;
  desc: string;
}

// Rapports disponibles en PDF aujourd'hui (balances). Les autres arrivent.
const PDF_AVAILABLE = new Set([
  "CPT_BALANCE_GENERAL",
  "CPT_BALANCE_AUX_SUPPLIERS",
  "CPT_BALANCE_AUX_CUSTOMERS",
  "CPT_SITE_BALANCE",
  "CPT_MONTHLY_SYNTHESIS", // compte de résultat (P&L)
]);

export default function ComptableReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "report-templates"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/reports/templates", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ templates: Template[]; isDirection: boolean }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-rapports">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Rapports comptables</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Templates SYSCOHADA — génération PDF et export Excel pour DSF.
          </p>
        </div>
        <PageHelp title="Aide — Rapports comptables"><RapportsTutorial /></PageHelp>
      </header>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          {data?.isDirection ? "Templates Direction (10)" : "Templates Chantier (5)"}
        </h2>
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data?.templates.map((t) => {
              const available = PDF_AVAILABLE.has(t.type);
              return (
                <article key={t.type} className="rounded-xl border border-line bg-white p-3 shadow-card">
                  <div className="flex items-start justify-between">
                    <FileText className="h-4 w-4 text-primary-600" />
                    {available ? (
                      <a
                        href={`/api/comptable/reports/${t.type}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary-700 hover:underline"
                      >
                        <Download className="h-3 w-3" /> Générer PDF
                      </a>
                    ) : (
                      <span
                        title="Disponible prochainement"
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3"
                      >
                        <Clock className="h-3 w-3" /> Bientôt
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-[13.5px] font-semibold text-ink">{t.label}</h3>
                  <p className="mt-1 text-[11.5px] text-ink-3">{t.desc}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
