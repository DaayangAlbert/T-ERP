"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, CheckCircle2, XCircle, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DgPipelineTutorial } from "@/components/help/tutorials/DgPipelineTutorial";

const STAGE_LABEL: Record<string, string> = {
  OPPORTUNITY: "Opportunité",
  DCE_ANALYSIS: "Analyse DCE",
  SITE_VISIT: "Visite site",
  TECHNICAL_STUDY: "Étude technique",
  PRICING: "Chiffrage",
  SUBCONTRACTOR_QUOTES: "Devis ST",
  INTERNAL_VALIDATION: "Validation interne",
  SUBMITTED: "Soumis",
  RESULTS_PENDING: "Résultats attendus",
  WON: "Gagné",
  LOST: "Perdu",
};
const STAGE_CLS: Record<string, string> = {
  OPPORTUNITY: "bg-slate-100 text-slate-700",
  DCE_ANALYSIS: "bg-slate-100 text-slate-700",
  SITE_VISIT: "bg-sky-100 text-sky-800",
  TECHNICAL_STUDY: "bg-sky-100 text-sky-800",
  PRICING: "bg-violet-100 text-violet-800",
  SUBCONTRACTOR_QUOTES: "bg-violet-100 text-violet-800",
  INTERNAL_VALIDATION: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-amber-100 text-amber-800",
  RESULTS_PENDING: "bg-amber-200 text-amber-900",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-rose-100 text-rose-700",
};
const WORK_LABEL: Record<string, string> = {
  BUILDING: "Bâtiment",
  ROADWORK: "Voirie",
  CIVIL_ENGINEERING: "Génie civil",
  HYDRAULIC: "Hydraulique",
  LAYOUT: "Aménagement",
  INDUSTRIAL: "Industriel",
  OTHER: "Autre",
};

interface Tender {
  id: string;
  reference: string;
  title: string;
  moaName: string;
  workType: string;
  estimatedBudget: string;
  submissionDeadline: string;
  daysUntilDeadline: number;
  stage: string;
  probability: number;
  ourBidAmount: string | null;
  ourMargin: number | null;
  awarded: boolean | null;
  awardedTo: string | null;
  studyOwner: string;
}
interface Summary {
  summary: { openCount: number; totalPipeline: string; weightedPipeline: string; won: number; lost: number; conversionRate: number; totalWon: string };
  byStage: Array<{ stage: string; count: number; value: string; weightedValue: string }>;
  tenders: Tender[];
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  return Number.isFinite(v) ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA" : "—";
}

export default function DgPipelinePage() {
  const [filter, setFilter] = useState<"open" | "won" | "lost" | "all">("open");
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "pipeline-commercial"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/pipeline-commercial`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const OPEN_STAGES = new Set(["OPPORTUNITY", "DCE_ANALYSIS", "SITE_VISIT", "TECHNICAL_STUDY", "PRICING", "SUBCONTRACTOR_QUOTES", "INTERNAL_VALIDATION", "SUBMITTED", "RESULTS_PENDING"]);
  const filtered = data.tenders.filter((t) => {
    if (filter === "open") return OPEN_STAGES.has(t.stage);
    if (filter === "won") return t.stage === "WON";
    if (filter === "lost") return t.stage === "LOST";
    return true;
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
            <Target className="h-5 w-5 text-violet-600" /> Pipeline commercial
          </h1>
          <p className="text-[12.5px] text-ink-3">Appels d&apos;offres en cours · probabilité pondérée · taux de conversion</p>
        </div>
        <PageHelp title="Aide — Pipeline commercial"><DgPipelineTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Pipeline ouvert" value={String(data.summary.openCount)} sub={fmtFCFA(data.summary.totalPipeline)} icon={<Briefcase className="h-4 w-4" />} tone="primary" />
        <Kpi label="Valeur pondérée" value={fmtFCFA(data.summary.weightedPipeline)} sub="probabilité × budget" icon={<TrendingUp className="h-4 w-4" />} tone="ok" />
        <Kpi label="Gagnés" value={String(data.summary.won)} sub={fmtFCFA(data.summary.totalWon)} icon={<CheckCircle2 className="h-4 w-4" />} tone="ok" />
        <Kpi label="Taux de conversion" value={`${data.summary.conversionRate.toFixed(1)} %`} sub={`${data.summary.won} W / ${data.summary.lost} L`} icon={<XCircle className="h-4 w-4" />} tone={data.summary.conversionRate >= 30 ? "ok" : "warn"} />
      </div>

      {/* Funnel par étape */}
      {data.byStage.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-3 shadow-card">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">Funnel commercial</h2>
          <div className="space-y-1.5">
            {data.byStage.map((s) => {
              const pct = (Number(s.value) / Math.max(Number(data.summary.totalPipeline), 1)) * 100;
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-2">{STAGE_LABEL[s.stage] ?? s.stage} <span className="text-ink-3">({s.count})</span></span>
                    <span className="font-mono tabular-nums text-ink">{fmtFCFA(s.weightedValue)} <span className="text-ink-3">pond.</span></span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex gap-1 rounded-md bg-surface-alt p-1">
          {(["open", "won", "lost", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={clsx("rounded px-3 py-1 text-[11.5px] font-semibold", filter === t ? "bg-white text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              {t === "open" ? "En cours" : t === "won" ? "Gagnés" : t === "lost" ? "Perdus" : "Tous"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-3">{filtered.length} appel{filtered.length > 1 ? "s" : ""} d'offre</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[1000px] text-[12.5px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence / Affaire</th>
              <th className="py-2 text-left">MOA / Type</th>
              <th className="py-2 text-left">Stage</th>
              <th className="py-2 text-right">Budget</th>
              <th className="py-2 text-right">Prob.</th>
              <th className="py-2 text-right">Marge</th>
              <th className="py-2 text-left">Soumission</th>
              <th className="py-2 pr-3 text-left">Étude</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-ink-3">Aucun appel d'offre.</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className={clsx("border-t border-line hover:bg-surface-alt", t.daysUntilDeadline >= 0 && t.daysUntilDeadline <= 7 && OPEN_STAGES.has(t.stage) && "bg-amber-50/30")}>
                  <td className="py-2.5 pl-3">
                    <div className="font-mono text-[10.5px] text-ink-3">{t.reference}</div>
                    <div className="font-semibold text-ink">{t.title}</div>
                  </td>
                  <td className="py-2.5 text-[11.5px]">
                    <div className="text-ink-2">{t.moaName}</div>
                    <div className="text-[10px] text-ink-3">{WORK_LABEL[t.workType] ?? t.workType}</div>
                  </td>
                  <td className="py-2.5"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STAGE_CLS[t.stage] ?? "bg-slate-100 text-slate-700")}>{STAGE_LABEL[t.stage] ?? t.stage}</span></td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{fmtFCFA(t.estimatedBudget)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    <span className={clsx("inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", t.probability >= 70 ? "bg-emerald-100 text-emerald-700" : t.probability >= 40 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")}>
                      {t.probability}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{t.ourMargin !== null ? `${t.ourMargin.toFixed(1)} %` : "—"}</td>
                  <td className="py-2.5 text-[11.5px]">
                    <div className="text-ink-2">{new Date(t.submissionDeadline).toLocaleDateString("fr-FR")}</div>
                    {OPEN_STAGES.has(t.stage) && <div className={clsx("text-[10px]", t.daysUntilDeadline <= 7 ? "font-bold text-amber-700" : "text-ink-3")}>{t.daysUntilDeadline >= 0 ? `dans ${t.daysUntilDeadline} j` : "passée"}</div>}
                  </td>
                  <td className="py-2.5 pr-3 text-[11px] text-ink-2">{t.studyOwner}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone: "primary" | "default" | "ok" | "warn" }) {
  const cls = { primary: "border-l-violet-500", default: "border-l-slate-400", ok: "border-l-emerald-500", warn: "border-l-amber-500" }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-3">{sub}</div>}
    </div>
  );
}
