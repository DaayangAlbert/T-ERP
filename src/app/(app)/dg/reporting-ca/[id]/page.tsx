"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Send } from "lucide-react";
import { useBoardReportDetail } from "@/hooks/useDgBoardReports";
import { SendToBoardModal } from "@/components/dg/SendToBoardModal";
import { REPORT_CHAPTER_LABELS, type ReportChapterKey } from "@/lib/board-report-chapters";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

interface Props {
  params: { id: string };
}

const TYPE_LABEL: Record<string, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  ANNUAL: "Annuel",
  EXTRAORDINARY: "Extraordinaire",
};

export default function ReportDetailPage({ params }: Props) {
  const searchParams = useSearchParams();
  const { data, isLoading, isError, error } = useBoardReportDetail(params.id);
  const [sendOpen, setSendOpen] = useState(false);

  // Auto-open du modal si ?diffuser=1 dans l'URL
  useEffect(() => {
    if (searchParams.get("diffuser") === "1") setSendOpen(true);
  }, [searchParams]);

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

  const chapters = data.chapters;
  const comments = data.comments;
  const kpis = data.data.kpis;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <Link
            href="/dg/reporting-ca"
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux rapports
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Reporting {TYPE_LABEL[data.type]} — {data.period}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            CA du {formatDate(data.boardDate)} · Auteur {data.author.firstName} {data.author.lastName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/dg/board-reports/${data.id}/pdf`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger PDF
          </a>
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Send className="h-3.5 w-3.5" /> Diffuser au CA
          </button>
        </div>
      </header>

      {/* KPIs financiers principaux */}
      <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-5">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
          KPIs consolidés à la date de génération
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Chiffre d'affaires" value={formatFCFA(kpis.revenue)} />
          <Kpi label="Marge consolidée" value={`${kpis.margin.toFixed(1).replace(".", ",")} %`} />
          <Kpi label="Trésorerie" value={formatFCFA(kpis.treasury)} />
          <Kpi label="Carnet de commandes" value={formatFCFA(kpis.backlog)} />
        </div>
      </section>

      {/* Sections par chapitre */}
      <section className="mt-4 space-y-4">
        {(Object.keys(REPORT_CHAPTER_LABELS) as ReportChapterKey[]).map((key) => {
          if (chapters[key] === false) return null;
          return (
            <article key={key} className="rounded-xl border border-line bg-white p-5 shadow-card">
              <h3 className="mb-2 text-sm font-semibold text-ink">{REPORT_CHAPTER_LABELS[key]}</h3>
              {comments[key] && (
                <p className="mb-3 rounded-md border-l-2 border-primary-500 bg-primary-50 px-3 py-2 text-[13px] text-ink-2">
                  {comments[key]}
                </p>
              )}
              {key === "operational" && data.data.topSites.length > 0 && (
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
                      {data.data.topSites.map((s, i) => (
                        <tr key={s.code} className={clsx(i < data.data.topSites.length - 1 && "border-b border-line")}>
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
              )}
              {key === "hr" && (
                <dl className="grid gap-2 sm:grid-cols-3 text-[12.5px]">
                  <Row label="Effectif total">{data.data.hr.headcount}</Row>
                  <Row label="Permanents / temporaires">
                    {data.data.hr.permanentCount} / {data.data.hr.temporaryCount}
                  </Row>
                  <Row label="Masse salariale moy. mens.">{formatFCFA(data.data.hr.salaryMassMonthly)}</Row>
                </dl>
              )}
              {key === "strategic" && data.data.strategic.objectives.length > 0 && (
                <ul className="space-y-1.5 text-[12.5px]">
                  {data.data.strategic.objectives.map((o) => (
                    <li
                      key={o.title}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-alt px-3 py-1.5"
                    >
                      <span className="truncate text-ink-2">
                        <span className="text-[10px] uppercase tracking-wider text-ink-3">{o.category}</span>{" "}
                        {o.title}
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-ink">{o.progress} %</span>
                    </li>
                  ))}
                </ul>
              )}
              {key === "risks" && data.data.risks.length > 0 && (
                <ul className="space-y-1 text-[12.5px] text-ink-2">
                  {data.data.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-danger">!</span> {r}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      {data.sentTo.length > 0 && (
        <section className="mt-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Diffusé à {data.sentTo.length} destinataire{data.sentTo.length > 1 ? "s" : ""}
          </h3>
          <ul className="space-y-1 text-[12.5px]">
            {data.sentTo.map((r, i) => (
              <li key={i} className="flex items-center justify-between border-b border-line py-1 last:border-0">
                <span className="text-ink-2">
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="font-mono text-[11px] text-ink-3">{r.email}</span>
                </span>
                <span className="text-[11px] text-ink-3">{formatDate(r.sentAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SendToBoardModal
        open={sendOpen}
        reportId={data.id}
        defaultRecipients={data.sentTo}
        onClose={() => setSendOpen(false)}
      />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="text-[10.5px] font-medium uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  );
}
