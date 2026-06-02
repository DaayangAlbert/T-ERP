"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Download, Send, RefreshCcw, Calendar, FileSpreadsheet, BookCheck, ScrollText } from "lucide-react";
import type { ReportType } from "@prisma/client";
import { useReports, useScheduledReports, useRegenerateReport } from "@/hooks/useReports";
import { StrategicReportCard } from "@/components/reports/StrategicReportCard";
import { REPORT_TYPE_LABEL } from "@/lib/report-blocks";
import { formatDate } from "@/lib/format";
import { PageHelp } from "@/components/help/PageHelp";
import { DafRapportsTutorial } from "@/components/help/tutorials/DafRapportsTutorial";

const SCHEDULE_LABEL: Record<string, string> = {
  WEEKLY_MONDAY_06: "Tous les lundis à 06h00",
  MONTHLY_FIRST_08: "Le 1er du mois à 08h00",
  MONTHLY_FIFTH_06: "Le 5 du mois à 06h00",
  QUARTERLY_FIRST: "Le 1er de chaque trimestre",
  CAC_15D_BEFORE: "15 jours avant la réunion CAC",
};

const DAF_TYPES: ReportType[] = [
  "DAF_TREASURY_WEEKLY",
  "DAF_FINANCIAL_MONTHLY",
  "DAF_BANKING_QUARTERLY",
  "DAF_CAC_QUARTERLY",
  "DAF_DSF_PREP",
];

const REGULATORY = [
  { key: "DAF_DSF_PREP" as ReportType, title: "DSF préparation", description: "États financiers OHADA annuels", icon: FileSpreadsheet },
  { key: "DAF_FINANCIAL_MONTHLY" as ReportType, title: "Bilan + compte de résultat OHADA", description: "Format SYSCOHADA mensuel", icon: BookCheck },
  { key: "CUSTOM" as ReportType, title: "États sociaux (DAS2, déclaration salaires)", description: "Documents annuels obligatoires", icon: ScrollText },
];

export default function DafRapportsPage() {
  const { data, isLoading } = useReports();
  const { data: scheduled } = useScheduledReports();
  const regenerate = useRegenerateReport();
  const [busy, setBusy] = useState<string | null>(null);

  const dafItems = (data?.items ?? []).filter((r) => DAF_TYPES.includes(r.type));
  const archived = dafItems.filter((r) => r.status !== "SCHEDULED");
  const dafScheduled = (scheduled?.items ?? []).filter((s) => DAF_TYPES.includes(s.type));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Rapports financiers — vue DAF
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Templates DAF, reportings réglementaires, planification et historique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Rapports DAF"><DafRapportsTutorial /></PageHelp>
          <Link
            href="/rapports/nouveau?type=DAF_FINANCIAL_MONTHLY"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Rapport DAF sur mesure
          </Link>
        </div>
      </header>

      {/* 4 cards templates DAF */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-700">
          Rapports financiers DAF
        </h2>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <StrategicReportCard
            type="DAF_TREASURY_WEEKLY"
            title="Tréso hebdo (DG)"
            description="Lundi 6h, état des banques + projections."
            features={["Soldes multi-banques", "Encaissements / décaissements 7j", "Forecast 4 semaines", "Diffusion auto le lundi 6h"]}
            pages={1}
          />
          <StrategicReportCard
            type="DAF_FINANCIAL_MONTHLY"
            title="Synthèse financière mensuelle"
            description="P&L + BFR + Tréso, le 5 au COMEX."
            features={["P&L synthétique", "BFR & DSO", "Trésorerie 12 mois", "Variations vs N-1"]}
            pages={3}
          />
          <StrategicReportCard
            type="DAF_BANKING_QUARTERLY"
            title="Reporting bancaire trimestriel"
            description="Pour les 5 relationship managers."
            features={["Format adapté par banque", "Ratios prudentiels", "Engagements hors bilan", "Forecast 6 mois"]}
            pages={4}
          />
          <StrategicReportCard
            type="DAF_CAC_QUARTERLY"
            title="Reporting CAC"
            description="Pour les commissaires aux comptes, J-15."
            features={["P&L détaillé", "Bilan synthétique", "Engagements", "Annexe risques"]}
            pages={6}
          />
        </div>
      </section>

      {/* Reportings réglementaires */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Reportings réglementaires
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {REGULATORY.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                href={`/rapports/nouveau?type=${r.key}`}
                className="group flex items-start gap-2 rounded-xl border border-line bg-white p-3 hover:border-primary-300 hover:shadow-card"
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink group-hover:text-primary-700">{r.title}</div>
                  <div className="text-[11.5px] text-ink-3">{r.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Mes rapports planifiés DAF */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Mes rapports planifiés DAF
        </h2>
        {dafScheduled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucun rapport DAF planifié pour l&apos;instant.
          </div>
        ) : (
          <ul className="space-y-2">
            {dafScheduled.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-card">
                <Calendar className="h-4 w-4 text-primary-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{s.title}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {SCHEDULE_LABEL[s.rule ?? ""] ?? s.rule} · {s.recipients.length} destinataire{s.recipients.length > 1 ? "s" : ""}
                  </div>
                </div>
                <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                  {REPORT_TYPE_LABEL[s.type]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historique DAF */}
      <section>
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Historique DAF
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-alt" />
            ))}
          </div>
        ) : archived.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[13px] text-ink-3">
            Aucun rapport DAF généré pour l&apos;instant.
          </div>
        ) : (
          <>
            {/* Desktop : tableau */}
            <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card md:block">
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                  <tr>
                    <th className="py-2 pl-3 text-left">Type</th>
                    <th className="py-2 text-left">Titre</th>
                    <th className="py-2 text-left">Période</th>
                    <th className="py-2 text-left">Auteur</th>
                    <th className="py-2 text-left">Généré</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {archived.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-alt">
                      <td className="py-2 pl-3">
                        <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                          {REPORT_TYPE_LABEL[r.type]}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link href={`/rapports/${r.id}`} className="text-ink hover:text-primary-700">
                          {r.title}
                        </Link>
                      </td>
                      <td className="py-2 text-ink-3">{r.period}</td>
                      <td className="py-2 text-ink-2">{r.author}</td>
                      <td className="py-2 text-ink-3">
                        {r.generatedAt ? formatDate(r.generatedAt) : formatDate(r.createdAt)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`/api/reports/${r.id}/pdf`}
                            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700"
                            aria-label="PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              setBusy(r.id);
                              await regenerate.mutateAsync(r.id);
                              setBusy(null);
                            }}
                            disabled={busy === r.id}
                            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                            aria-label="Régénérer"
                          >
                            <RefreshCcw className={busy === r.id ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                          </button>
                          <Link
                            href={`/rapports/${r.id}?diffuser=1`}
                            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700"
                            aria-label="Diffuser"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile : cards */}
            <div className="space-y-2 md:hidden">
              {archived.map((r) => (
                <Link
                  key={r.id}
                  href={`/rapports/${r.id}`}
                  className="block rounded-xl border border-line bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                        {REPORT_TYPE_LABEL[r.type]}
                      </span>
                      <div className="mt-1 text-[13px] font-semibold text-ink">{r.title}</div>
                      <div className="text-[11.5px] text-ink-3">{r.period} · {r.author}</div>
                    </div>
                    <a
                      href={`/api/reports/${r.id}/pdf`}
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
                      aria-label="PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
