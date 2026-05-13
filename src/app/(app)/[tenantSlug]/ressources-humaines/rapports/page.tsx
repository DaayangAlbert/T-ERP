"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Download, RefreshCcw, Calendar } from "lucide-react";
import type { ReportType } from "@prisma/client";
import { useReports, useScheduledReports, useRegenerateReport } from "@/hooks/useReports";
import { StrategicReportCard } from "@/components/reports/StrategicReportCard";
import { REPORT_TYPE_LABEL } from "@/lib/report-blocks";
import { formatDate } from "@/lib/format";

const SCHEDULE_LABEL: Record<string, string> = {
  WEEKLY_MONDAY_06: "Tous les lundis à 06h00",
  WEEKLY_MONDAY_08: "Tous les lundis à 08h00",
  MONTHLY_FIRST_08: "Le 1er du mois à 08h00",
  MONTHLY_FIFTH_06: "Le 5 du mois à 06h00",
  QUARTERLY_FIRST: "Le 1er de chaque trimestre",
  CAC_15D_BEFORE: "15 jours avant la réunion CAC",
  YEARLY_FEB: "Fin février chaque année",
};

const RH_TYPES: ReportType[] = [
  "RH_MONTHLY",
  "RH_SOCIAL_ANNUAL",
  "RH_GENDER_EQUALITY",
  "RH_WEEKLY_DASHBOARD",
  "RH_RECRUITMENT_QUARTERLY",
  "RH_SOCIAL_INDICATORS",
];

export default function RhRapportsPage() {
  const { data, isLoading } = useReports();
  const { data: scheduled } = useScheduledReports();
  const regenerate = useRegenerateReport();
  const [busy, setBusy] = useState<string | null>(null);

  const rhItems = (data?.items ?? []).filter((r) => RH_TYPES.includes(r.type));
  const archived = rhItems.filter((r) => r.status !== "SCHEDULED");
  const rhScheduled = (scheduled?.items ?? []).filter((s) => RH_TYPES.includes(s.type));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Rapports RH</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">Templates RH, reportings réglementaires (bilan social, égalité H/F), planification.</p>
        </div>
        <Link
          href="/rapports/nouveau?type=RH_MONTHLY"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Rapport RH sur mesure
        </Link>
      </header>

      {/* 6 cards templates RH */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-700">Rapports RH</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StrategicReportCard
            type="RH_MONTHLY"
            title="Rapport mensuel RH"
            description="Synthèse mensuelle pour le DG (effectif, paie, alertes)."
            features={["Effectif et turnover", "Recrutements du mois", "Absentéisme", "Alertes RH"]}
            pages={3}
          />
          <StrategicReportCard
            type="RH_SOCIAL_ANNUAL"
            title="Bilan social annuel"
            description="Obligation légale art. L432-1 (entreprises > 300 salariés)."
            features={["Emploi", "Rémunérations", "Hygiène & sécurité", "Formation", "Relations professionnelles"]}
            pages={20}
          />
          <StrategicReportCard
            type="RH_GENDER_EQUALITY"
            title="Rapport égalité H/F"
            description="Obligation légale annuelle, ratio mixité par catégorie."
            features={["Effectifs par sexe", "Salaires comparés", "Promotions", "Plan d'action"]}
            pages={8}
          />
          <StrategicReportCard
            type="RH_WEEKLY_DASHBOARD"
            title="TDB RH hebdomadaire"
            description="Tableau de bord interne lundi matin pour la RH."
            features={["KPIs effectif", "Demandes en attente", "Échéances semaine", "Recyclages à programmer"]}
            pages={1}
          />
          <StrategicReportCard
            type="RH_RECRUITMENT_QUARTERLY"
            title="Stats recrutement trimestriel"
            description="Analyse pipeline et performance recrutement."
            features={["Entonnoir candidatures", "Délai moyen recrutement", "Coût acquisition", "Top sources"]}
            pages={4}
          />
          <StrategicReportCard
            type="RH_SOCIAL_INDICATORS"
            title="Indicateurs sociaux"
            description="Turnover, absentéisme, climat, conflits — vue 12 mois."
            features={["Turnover par catégorie", "Absentéisme par motif", "Climat (enquête interne)", "Conflits ouverts"]}
            pages={5}
          />
        </div>
      </section>

      {/* Rapports planifiés RH */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Rapports RH planifiés</h2>
        {rhScheduled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucun rapport RH planifié pour l&apos;instant.
          </div>
        ) : (
          <ul className="space-y-2">
            {rhScheduled.map((s) => (
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

      {/* Historique RH */}
      <section>
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Historique RH</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-alt" />
            ))}
          </div>
        ) : archived.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[13px] text-ink-3">
            Aucun rapport RH généré pour l&apos;instant.
          </div>
        ) : (
          <>
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
                        <Link href={`/rapports/${r.id}`} className="text-ink hover:text-primary-700">{r.title}</Link>
                      </td>
                      <td className="py-2 text-ink-3">{r.period}</td>
                      <td className="py-2 text-ink-2">{r.author}</td>
                      <td className="py-2 text-ink-3">{r.generatedAt ? formatDate(r.generatedAt) : formatDate(r.createdAt)}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <a href={`/api/reports/${r.id}/pdf`} className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700" aria-label="PDF">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={async () => { setBusy(r.id); await regenerate.mutateAsync(r.id); setBusy(null); }}
                            disabled={busy === r.id}
                            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                            aria-label="Régénérer"
                          >
                            <RefreshCcw className={busy === r.id ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {archived.map((r) => (
                <Link key={r.id} href={`/rapports/${r.id}`} className="block rounded-xl border border-line bg-white p-3">
                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                    {REPORT_TYPE_LABEL[r.type]}
                  </span>
                  <div className="mt-1 text-[13px] font-semibold text-ink">{r.title}</div>
                  <div className="text-[11.5px] text-ink-3">{r.period} · {r.author}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
