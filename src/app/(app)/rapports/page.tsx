"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Download, Send, RefreshCcw, Calendar } from "lucide-react";
import { useReports, useScheduledReports, useRegenerateReport } from "@/hooks/useReports";
import { StrategicReportCard } from "@/components/reports/StrategicReportCard";
import { REPORT_TYPE_LABEL } from "@/lib/report-blocks";
import { formatDate } from "@/lib/format";

const SCHEDULE_LABEL: Record<string, string> = {
  WEEKLY_MONDAY_06: "Tous les lundis à 06h00",
  MONTHLY_FIRST_08: "Le 1er du mois à 08h00",
  QUARTERLY_FIRST: "Le 1er de chaque trimestre",
};

export default function RapportsPage() {
  const { data, isLoading } = useReports();
  const { data: scheduled } = useScheduledReports();
  const regenerate = useRegenerateReport();
  const [busy, setBusy] = useState<string | null>(null);

  const archived = (data?.items ?? []).filter((r) => r.status !== "SCHEDULED");

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Rapports consolidés</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Templates stratégiques, wizard sur-mesure, historique et planification.
          </p>
        </div>
        <Link
          href="/rapports/nouveau"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Créer un rapport sur mesure
        </Link>
      </header>

      {/* Templates stratégiques */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-700">
          Rapports stratégiques DG
        </h2>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <StrategicReportCard
            type="EXECUTIVE_SUMMARY"
            title="Synthèse exécutive hebdo"
            description="Vue concentrée pour démarrer la semaine."
            features={["KPIs clés", "Alertes rouges", "Plan d'action court", "Diffusion auto le lundi 6h"]}
            pages={1}
          />
          <StrategicReportCard
            type="MONTHLY_DASHBOARD"
            title="Tableau de bord mensuel"
            description="Vision 360° pour les comités de direction."
            features={["Finance · Opérations · RH · HSE", "Comparatif filiales", "Top chantiers", "Évolution 12 mois"]}
            pages={5}
          />
          <StrategicReportCard
            type="ANNUAL_GROUP"
            title="Bilan annuel groupe"
            description="Rapport intégral pour l'Assemblée Générale."
            features={["Résultats consolidés", "Performance par société", "Stratégie & perspectives", "Annexes obligatoires"]}
            pages={20}
          />
          <StrategicReportCard
            type="QUARTERLY_NOTE"
            title="Note d'activité trimestrielle"
            description="À destination des banques et investisseurs."
            features={["KPIs financiers", "Carnet de commandes", "Trésorerie projetée", "Couverture risques"]}
            pages={3}
          />
        </div>
      </section>

      {/* Rapports planifiés */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Rapports planifiés
        </h2>
        {!scheduled || scheduled.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
            Aucun rapport planifié. Créez-en un depuis le wizard sur mesure.
          </div>
        ) : (
          <ul className="space-y-2">
            {scheduled.items.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-card"
              >
                <Calendar className="h-4 w-4 text-primary-500" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink">{s.title}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {SCHEDULE_LABEL[s.rule ?? ""] ?? s.rule} · {s.recipients.length} destinataire
                    {s.recipients.length > 1 ? "s" : ""}
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

      {/* Historique */}
      <section>
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Historique
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-alt" />
            ))}
          </div>
        ) : archived.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[13px] text-ink-3">
            Aucun rapport généré pour l'instant.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
            <table className="w-full min-w-[640px] text-[12.5px]">
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
              <tbody>
                {archived.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-surface-alt">
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
        )}
      </section>
    </>
  );
}
