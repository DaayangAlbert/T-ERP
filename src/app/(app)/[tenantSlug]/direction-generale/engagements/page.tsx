"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, AlertOctagon, CheckCircle2, Landmark } from "lucide-react";
import { clsx } from "clsx";

const TYPE_LABEL: Record<string, string> = {
  BANK_GUARANTEE: "Caution bancaire",
  FIRST_DEMAND_GUARANTEE: "Garantie 1er ordre",
  LETTER_CREDIT: "Lettre de crédit",
  PURCHASE_COMMITMENT: "Engagement d'achat",
  SUBMISSION: "Soumission",
  PERFORMANCE: "Bonne exécution",
  RETENTION: "Retenue de garantie",
  ADVANCE_PAYMENT: "Avance de démarrage",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expirée",
  RELEASED: "Libérée",
  REVOKED: "Révoquée",
  HONORED: "Honorée",
};
const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-rose-100 text-rose-800",
  RELEASED: "bg-slate-100 text-slate-700",
  REVOKED: "bg-stone-100 text-stone-600",
  HONORED: "bg-slate-100 text-slate-700",
};

interface Item {
  id: string;
  kind: string;
  type: string;
  reference: string | null;
  bank: string | null;
  amount: string;
  beneficiary: string | null;
  issueDate: string;
  maturityDate: string;
  status: string;
  daysUntilMaturity: number;
  site: { code: string; name: string } | null;
  contractRef: string | null;
  releaseDate: string | null;
}
interface Summary {
  summary: {
    activeCount: number;
    totalActive: string;
    expiringSoonCount: number;
    totalExpiringSoon: string;
    expiringNext90Count: number;
    expiredCount: number;
  };
  items: Item[];
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  return Number.isFinite(v) ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA" : "—";
}

export default function DgEngagementsPage() {
  const [filter, setFilter] = useState<"active" | "expiring" | "all" | "expired">("active");
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "commitments-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/commitments-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const filtered = data.items.filter((i) => {
    if (filter === "active") return i.status === "ACTIVE";
    if (filter === "expiring") return i.status === "ACTIVE" && i.daysUntilMaturity <= 30;
    if (filter === "expired") return i.status === "EXPIRED";
    return true;
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
          <Wallet className="h-5 w-5 text-violet-600" /> Engagements financiers
        </h1>
        <p className="text-[12.5px] text-ink-3">Cautions bancaires · garanties · lettres de crédit · engagements d'achat</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Actifs" value={String(data.summary.activeCount)} sub={fmtFCFA(data.summary.totalActive)} icon={<CheckCircle2 className="h-4 w-4" />} tone="ok" />
        <Kpi label="Expirent <30 j" value={String(data.summary.expiringSoonCount)} sub={fmtFCFA(data.summary.totalExpiringSoon)} icon={<AlertOctagon className="h-4 w-4" />} tone={data.summary.expiringSoonCount > 0 ? "danger" : "default"} />
        <Kpi label="Expirent 30-90 j" value={String(data.summary.expiringNext90Count)} icon={<Landmark className="h-4 w-4" />} tone={data.summary.expiringNext90Count > 0 ? "warn" : "default"} />
        <Kpi label="Expirés" value={String(data.summary.expiredCount)} icon={<AlertOctagon className="h-4 w-4" />} tone="default" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex gap-1 rounded-md bg-surface-alt p-1">
          {(["active", "expiring", "expired", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={clsx(
                "rounded px-3 py-1 text-[11.5px] font-semibold",
                filter === t ? "bg-white text-ink shadow-card" : "text-ink-3 hover:text-ink",
              )}
            >
              {t === "active" ? "Actifs" : t === "expiring" ? "Expirent <30j" : t === "expired" ? "Expirés" : "Tous"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-3">{filtered.length} engagement{filtered.length > 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[960px] text-[12.5px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Type</th>
              <th className="py-2 text-left">Bénéficiaire / Référence</th>
              <th className="py-2 text-left">Banque</th>
              <th className="py-2 text-right">Montant</th>
              <th className="py-2 text-left">Émission</th>
              <th className="py-2 text-left">Échéance</th>
              <th className="py-2 text-right">Reste</th>
              <th className="py-2 pr-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-ink-3">Aucun engagement dans cette catégorie.</td></tr>
            ) : (
              filtered.map((i) => {
                const isUrgent = i.status === "ACTIVE" && i.daysUntilMaturity <= 30;
                return (
                  <tr key={`${i.kind}-${i.id}`} className={clsx("border-t border-line hover:bg-surface-alt", isUrgent && "bg-rose-50/30")}>
                    <td className="py-2.5 pl-3">
                      <div className="text-[11px] text-ink-3">{TYPE_LABEL[i.kind] ?? i.kind}</div>
                      <div className="text-[10.5px] text-ink-3">{TYPE_LABEL[i.type] ?? i.type}</div>
                    </td>
                    <td className="py-2.5 text-[11.5px]">
                      <div className="font-semibold text-ink">{i.beneficiary ?? "—"}</div>
                      {i.contractRef && <div className="text-[10px] text-ink-3">{i.contractRef}</div>}
                      {i.reference && <div className="text-[10px] text-ink-3">{i.reference}</div>}
                      {i.site && <div className="text-[10px] text-ink-3">{i.site.code}</div>}
                    </td>
                    <td className="py-2.5 text-[11.5px] text-ink-2">{i.bank ?? "—"}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{fmtFCFA(i.amount)}</td>
                    <td className="py-2.5 text-[11px] text-ink-3">{new Date(i.issueDate).toLocaleDateString("fr-FR")}</td>
                    <td className="py-2.5 text-[11px] text-ink-2">{new Date(i.maturityDate).toLocaleDateString("fr-FR")}</td>
                    <td className={clsx("py-2.5 text-right font-mono tabular-nums text-[11px]", isUrgent && "font-bold text-rose-700", i.daysUntilMaturity < 0 && "text-stone-500 line-through")}>
                      {i.daysUntilMaturity >= 0 ? `${i.daysUntilMaturity} j` : "expiré"}
                    </td>
                    <td className="py-2.5 pr-3"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[i.status] ?? "bg-slate-100 text-slate-700")}>{STATUS_LABEL[i.status] ?? i.status}</span></td>
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
      <div className="mt-1 text-[16px] font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-3">{sub}</div>}
    </div>
  );
}
