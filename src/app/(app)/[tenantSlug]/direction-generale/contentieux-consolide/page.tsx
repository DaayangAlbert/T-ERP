"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gavel, AlertOctagon, CheckCircle2, XCircle, Briefcase } from "lucide-react";
import { clsx } from "clsx";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Ouvert",
  MEDIATION: "Médiation",
  COURT_PENDING: "Tribunal",
  APPEAL: "Appel",
  SUPREME_COURT: "Cour suprême",
  SETTLED: "Réglé",
  WON: "Gagné",
  LOST: "Perdu",
  ABANDONED: "Abandonné",
};
const STATUS_CLS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  MEDIATION: "bg-sky-100 text-sky-800",
  COURT_PENDING: "bg-rose-100 text-rose-800",
  APPEAL: "bg-rose-100 text-rose-800",
  SUPREME_COURT: "bg-rose-200 text-rose-900",
  SETTLED: "bg-slate-100 text-slate-700",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-stone-200 text-stone-700",
  ABANDONED: "bg-stone-100 text-stone-500",
};
const POSITION_LABEL: Record<string, string> = {
  DEMANDEUR: "Demandeur",
  DEFENDEUR: "Défendeur",
  MEDIATION: "Médiation",
  ARBITRATION: "Arbitrage",
};

interface CaseItem {
  id: string;
  reference: string;
  title: string;
  ourPosition: string;
  jurisdiction: string;
  opposingParty: string;
  amountAtStake: string;
  provisionAmount: string;
  lawyerName: string;
  lawFirm: string;
  status: string;
  nextHearingDate: string | null;
  daysUntilHearing: number | null;
  openedAt: string;
  relatedContract: { reference: string; title: string } | null;
}
interface Summary {
  summary: {
    activeCount: number;
    totalAtRisk: string;
    totalProvisioned: string;
    coverageRatio: number;
    upcomingHearingsCount: number;
    won: number;
    lost: number;
  };
  cases: CaseItem[];
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  return Number.isFinite(v) ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA" : "—";
}

export default function DgContentieuxPage() {
  const [filter, setFilter] = useState<"all" | "active" | "closed">("active");
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "litigation-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/litigation-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const ACTIVE = new Set(["OPEN", "MEDIATION", "COURT_PENDING", "APPEAL", "SUPREME_COURT"]);
  const filteredCases = data.cases.filter((c) => {
    if (filter === "active") return ACTIVE.has(c.status);
    if (filter === "closed") return !ACTIVE.has(c.status);
    return true;
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
          <Gavel className="h-5 w-5 text-violet-600" /> Suivi contentieux consolidé
        </h1>
        <p className="text-[12.5px] text-ink-3">Litiges actifs · montants à risque · audiences à venir · taux de couverture provisions</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Litiges actifs" value={String(data.summary.activeCount)} icon={<AlertOctagon className="h-4 w-4" />} tone="warn" />
        <Kpi label="Montant à risque" value={fmtFCFA(data.summary.totalAtRisk)} icon={<Briefcase className="h-4 w-4" />} tone="danger" />
        <Kpi label="Provisions" value={fmtFCFA(data.summary.totalProvisioned)} sub={`Couverture ${data.summary.coverageRatio.toFixed(1)} %`} icon={<CheckCircle2 className="h-4 w-4" />} tone={data.summary.coverageRatio >= 80 ? "ok" : "warn"} />
        <Kpi label="Audiences <30 j" value={String(data.summary.upcomingHearingsCount)} icon={<Gavel className="h-4 w-4" />} tone={data.summary.upcomingHearingsCount > 0 ? "warn" : "default"} />
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex gap-1 rounded-md bg-surface-alt p-1">
          {(["active", "all", "closed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={clsx(
                "rounded px-3 py-1 text-[11.5px] font-semibold",
                filter === t ? "bg-white text-ink shadow-card" : "text-ink-3 hover:text-ink",
              )}
            >
              {t === "active" ? "Actifs" : t === "closed" ? "Clos" : "Tous"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-3">
          {filteredCases.length} dossier{filteredCases.length > 1 ? "s" : ""} · {data.summary.won} gagnés · {data.summary.lost} perdus
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[1000px] text-[12.5px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence / Affaire</th>
              <th className="py-2 text-left">Partie adverse</th>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-left">Statut</th>
              <th className="py-2 text-right">À risque</th>
              <th className="py-2 text-right">Provision</th>
              <th className="py-2 text-left">Prochaine audience</th>
              <th className="py-2 pr-3 text-left">Avocat</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-ink-3">Aucun dossier.</td></tr>
            ) : (
              filteredCases.map((c) => {
                const cov = Number(c.provisionAmount) / Math.max(Number(c.amountAtStake), 1);
                return (
                  <tr key={c.id} className={clsx("border-t border-line hover:bg-surface-alt", c.daysUntilHearing !== null && c.daysUntilHearing <= 14 && "bg-amber-50/30")}>
                    <td className="py-2.5 pl-3">
                      <div className="font-mono text-[10.5px] text-ink-3">{c.reference}</div>
                      <div className="font-semibold text-ink">{c.title}</div>
                      {c.relatedContract && <div className="text-[10px] text-ink-3">Contrat {c.relatedContract.reference}</div>}
                    </td>
                    <td className="py-2.5 text-[11.5px] text-ink-2">{c.opposingParty}</td>
                    <td className="py-2.5 text-[11px]">{POSITION_LABEL[c.ourPosition] ?? c.ourPosition}</td>
                    <td className="py-2.5"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[c.status] ?? "bg-slate-100 text-slate-700")}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{fmtFCFA(c.amountAtStake)}</td>
                    <td className={clsx("py-2.5 text-right font-mono tabular-nums", cov < 0.5 && "font-bold text-rose-700")}>
                      {fmtFCFA(c.provisionAmount)}
                      <div className="text-[9px] text-ink-3">{(cov * 100).toFixed(0)} %</div>
                    </td>
                    <td className="py-2.5 text-[11.5px]">
                      {c.nextHearingDate ? (
                        <>
                          <div className="text-ink-2">{new Date(c.nextHearingDate).toLocaleDateString("fr-FR")}</div>
                          <div className={clsx("text-[10px]", c.daysUntilHearing !== null && c.daysUntilHearing <= 14 ? "font-bold text-amber-700" : "text-ink-3")}>
                            {c.daysUntilHearing !== null && c.daysUntilHearing >= 0 ? `dans ${c.daysUntilHearing} j` : "passée"}
                          </div>
                        </>
                      ) : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-[11.5px]">
                      <div className="text-ink-2">{c.lawyerName}</div>
                      <div className="text-[10px] text-ink-3">{c.lawFirm}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone: "primary" | "default" | "ok" | "warn" | "danger" }) {
  const cls = { primary: "border-l-violet-500", default: "border-l-slate-400", ok: "border-l-emerald-500", warn: "border-l-amber-500", danger: "border-l-rose-500" }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-3">{sub}</div>}
    </div>
  );
}
