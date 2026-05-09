"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Download, Eye, Send, Trash2 } from "lucide-react";
import { BoardReportType, BoardReportStatus } from "@prisma/client";
import { clsx } from "clsx";
import { useDgBoardReports, useDeleteBoardReport } from "@/hooks/useDgBoardReports";
import { BoardReportTemplateCard } from "@/components/dg/BoardReportTemplateCard";
import { formatDate } from "@/lib/format";

const TYPE_LABEL: Record<BoardReportType, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  ANNUAL: "Annuel",
  EXTRAORDINARY: "Extraordinaire",
};

const STATUS_LABEL: Record<BoardReportStatus, string> = {
  DRAFT: "Brouillon",
  GENERATED: "Généré",
  PUBLISHED: "Diffusé",
  ARCHIVED: "Archivé",
};

const STATUS_TONE: Record<BoardReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  GENERATED: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-primary-100 text-primary-700",
};

export default function ReportingCaPage() {
  const { data, isLoading } = useDgBoardReports();
  const deleteMut = useDeleteBoardReport();

  // Prochain CA fictif (le seed met le dernier au 15 mai 2026)
  const nextBoard = new Date();
  nextBoard.setMonth(nextBoard.getMonth() + 1);
  nextBoard.setDate(15);

  const handleDelete = async (id: string, period: string) => {
    if (!confirm(`Supprimer le rapport ${period} ? Cette action est irréversible.`)) return;
    try {
      await deleteMut.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression échouée");
    }
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Reporting Conseil d'Administration
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Générer et diffuser les rapports CA mensuels, trimestriels et annuels
          </p>
        </div>
        <Link
          href="/dg/reporting-ca/nouveau?type=MONTHLY"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Nouveau rapport CA
        </Link>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
          Modèles de rapport
        </h2>
        <div className="grid gap-3.5 lg:grid-cols-3">
          <BoardReportTemplateCard
            type={BoardReportType.MONTHLY}
            title="Reporting mensuel"
            description="Synthèse rapide pour le CA mensuel : KPIs essentiels, alertes, perspectives."
            features={["Synthèse exécutive 1 page", "KPIs financiers + opérationnels", "Top 5 chantiers", "Génération en 30 secondes"]}
            href="/dg/reporting-ca/nouveau?type=MONTHLY"
          />
          <BoardReportTemplateCard
            type={BoardReportType.QUARTERLY}
            title="Reporting trimestriel"
            description="Analyse approfondie sur 3 mois avec perspectives de fin d'exercice."
            features={["Analyse financière détaillée", "Comparaison vs T-1 et N-1", "Plan d'action commercial", "Risques et opportunités"]}
            href="/dg/reporting-ca/nouveau?type=QUARTERLY"
          />
          <BoardReportTemplateCard
            type={BoardReportType.ANNUAL}
            title="Reporting annuel"
            description="Rapport intégral pour l'AG : bilan complet, P&L, perspectives N+1."
            features={["Bilan + compte de résultat", "Tous chapitres détaillés", "Plan stratégique 3 ans", "Annexes et reportings réglementaires"]}
            href="/dg/reporting-ca/nouveau?type=ANNUAL"
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-500 text-white">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-primary-800">Prochain CA programmé</h3>
              <p className="text-[12.5px] text-ink-2">
                {formatDate(nextBoard, "EEEE dd MMMM yyyy")} — reporting à finaliser avant cette date
              </p>
            </div>
          </div>
          <Link
            href="/dg/reporting-ca/nouveau?type=MONTHLY"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-400 bg-white px-3 text-[12px] font-medium text-primary-700 hover:bg-primary-50"
          >
            Préparer le reporting
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
          Rapports archivés
        </h2>
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="py-2.5 pl-4 text-left">Type</th>
                  <th className="py-2.5 text-left">Période</th>
                  <th className="py-2.5 text-left">Date CA</th>
                  <th className="py-2.5 text-left">Auteur</th>
                  <th className="py-2.5 text-left">Statut</th>
                  <th className="py-2.5 text-right">Diffusé à</th>
                  <th className="py-2.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-line">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="py-3 pl-4 last:pr-4">
                          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-alt" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!isLoading && (data?.items.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-ink-3">
                      Aucun rapport généré pour l'instant.
                    </td>
                  </tr>
                )}
                {data?.items.map((r, i) => (
                  <tr
                    key={r.id}
                    className={clsx(
                      "transition hover:bg-surface-alt",
                      i < data.items.length - 1 && "border-b border-line"
                    )}
                  >
                    <td className="py-2.5 pl-4 font-semibold text-ink">
                      {TYPE_LABEL[r.type]}
                    </td>
                    <td className="py-2.5 font-mono tabular-nums text-ink-2">{r.period}</td>
                    <td className="py-2.5 text-ink-2">{formatDate(r.boardDate)}</td>
                    <td className="py-2.5 text-ink-2">{r.author}</td>
                    <td className="py-2.5">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                          STATUS_TONE[r.status]
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-ink-3">
                      {r.sentToCount}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dg/reporting-ca/${r.id}`}
                          className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                          title="Voir"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <a
                          href={`/api/dg/board-reports/${r.id}/pdf`}
                          className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                          title="Télécharger PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <Link
                          href={`/dg/reporting-ca/${r.id}?diffuser=1`}
                          className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                          title="Diffuser"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(r.id, r.period)}
                          className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-rose-50 hover:text-rose-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
