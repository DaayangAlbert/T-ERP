"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Send, RefreshCcw } from "lucide-react";
import { useReportDetail, useRegenerateReport } from "@/hooks/useReports";
import { SendReportModal } from "@/components/reports/SendReportModal";
import { REPORT_TYPE_LABEL, REPORT_BLOCKS } from "@/lib/report-blocks";
import { formatDate, formatFCFA } from "@/lib/format";

interface Props {
  params: { id: string };
}

export default function ReportDetailPage({ params }: Props) {
  const sp = useSearchParams();
  const { data, isLoading, isError, error } = useReportDetail(params.id);
  const regenerate = useRegenerateReport();
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (sp.get("diffuser") === "1") setSendOpen(true);
  }, [sp]);

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-1/2 animate-pulse rounded bg-surface-alt" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const blocks = new Set(data.blocks);
  const dataKpis = (data.data as { kpis?: { revenue: number; margin: number; treasury: number; backlog: number; headcount: number; activeSites: number } })?.kpis;
  const subsidiaries = (data.data as { subsidiaries?: Array<{ name: string; revenue: number; margin: number; sites: number }> })?.subsidiaries ?? [];
  const topSites = (data.data as { topSites?: Array<{ code: string; name: string; progress: number; margin: number; budget: string }> })?.topSites ?? [];

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <Link
            href="/rapports"
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux rapports
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
              {REPORT_TYPE_LABEL[data.type]}
            </span>
            <span className="text-[12px] text-ink-3">Période {data.period}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">{data.title}</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Auteur {data.author.name} · Généré le{" "}
            {data.generatedAt ? formatDate(data.generatedAt) : formatDate(data.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => regenerate.mutate(data.id)}
            disabled={regenerate.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <RefreshCcw className={regenerate.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Régénérer
          </button>
          <a
            href={`/api/reports/${data.id}/pdf`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger PDF
          </a>
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Send className="h-3.5 w-3.5" /> Diffuser
          </button>
        </div>
      </header>

      {/* KPIs */}
      {dataKpis && (
        <section className="mb-4 rounded-xl border border-primary-200 bg-primary-50/40 p-5">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
            Indicateurs clés
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.has("kpi.revenue") && <Kpi label="Chiffre d'affaires" value={formatFCFA(dataKpis.revenue)} />}
            {blocks.has("kpi.margin") && <Kpi label="Marge consolidée" value={`${dataKpis.margin.toFixed(1).replace(".", ",")} %`} />}
            {blocks.has("kpi.treasury") && <Kpi label="Trésorerie" value={formatFCFA(dataKpis.treasury)} />}
            {blocks.has("kpi.backlog") && <Kpi label="Carnet de commandes" value={formatFCFA(dataKpis.backlog)} />}
            {blocks.has("kpi.headcount") && <Kpi label="Effectif" value={String(dataKpis.headcount)} />}
            {blocks.has("kpi.activeSites") && <Kpi label="Chantiers actifs" value={String(dataKpis.activeSites)} />}
          </div>
        </section>
      )}

      {blocks.has("table.top_sites") && topSites.length > 0 && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-semibold text-ink">Top 5 chantiers</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="py-2 pl-3 text-left">Code</th>
                  <th className="py-2 text-left">Libellé</th>
                  <th className="py-2 text-right">Avancement</th>
                  <th className="py-2 text-right">Marge</th>
                  <th className="py-2 pr-3 text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {topSites.map((s) => (
                  <tr key={s.code} className="border-t border-line">
                    <td className="py-2 pl-3 font-mono">{s.code}</td>
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{s.progress} %</td>
                    <td className="py-2 text-right font-mono tabular-nums">{s.margin} %</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {formatFCFA(BigInt(s.budget))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {blocks.has("table.subsidiaries") && subsidiaries.length > 0 && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-semibold text-ink">Comparatif filiales</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="py-2 pl-3 text-left">Filiale</th>
                  <th className="py-2 text-right">CA</th>
                  <th className="py-2 text-right">Marge</th>
                  <th className="py-2 pr-3 text-right">Chantiers</th>
                </tr>
              </thead>
              <tbody>
                {subsidiaries.map((s) => (
                  <tr key={s.name} className="border-t border-line">
                    <td className="py-2 pl-3">{s.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(s.revenue)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{s.margin} %</td>
                    <td className="py-2 pr-3 text-right">{s.sites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Blocs inclus */}
      <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Blocs inclus dans le rapport
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_BLOCKS.filter((b) => blocks.has(b.key)).map((b) => (
            <li key={b.key} className="flex items-center gap-2 rounded border border-line bg-surface-alt px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-ink-3">{b.category}</span>
              <span className="text-ink-2">{b.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {data.recipients.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Diffusé à {data.recipients.length} destinataire{data.recipients.length > 1 ? "s" : ""}
          </h3>
          <ul className="space-y-1 text-[12.5px]">
            {data.recipients.map((r, i) => (
              <li key={i} className="flex items-center justify-between border-b border-line py-1 last:border-0">
                <span className="text-ink-2">
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="font-mono text-[11px] text-ink-3">{r.email}</span>
                </span>
                {r.sentAt && <span className="text-[11px] text-ink-3">{formatDate(r.sentAt)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        reportId={data.id}
        defaultRecipients={data.recipients}
      />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}
