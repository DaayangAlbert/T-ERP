"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Users, Building2, AlertTriangle } from "lucide-react";
import { PageHelp } from "@/components/help/PageHelp";
import { EcheancierTutorial } from "@/components/help/tutorials/EcheancierTutorial";

interface TierRow {
  tier: string;
  total: string;
  b0_30: string;
  b31_60: string;
  b61_90: string;
  b90p: string;
  oldestDays: number;
  lineCount: number;
}
interface AgingResp {
  kind: "supplier" | "client";
  items: TierRow[];
  totals: { total: string; b0_30: string; b31_60: string; b61_90: string; b90p: string };
  tierCount: number;
}

const fmt = (s: string) => new Intl.NumberFormat("fr-FR").format(BigInt(s));

export default function EcheancierPage() {
  const [kind, setKind] = useState<"supplier" | "client">("supplier");
  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "aging", kind],
    queryFn: async () => {
      const res = await fetch(`/api/comptable/aging?kind=${kind}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AgingResp>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-echeancier">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Échéancier tiers</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Balance âgée par fournisseur (compte 40x) et par client (compte 41x) — lignes non lettrées.
          </p>
        </div>
        <PageHelp title="Aide — Échéancier tiers"><EcheancierTutorial /></PageHelp>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={kind === "supplier"} onClick={() => setKind("supplier")} label="Fournisseurs" icon={<Building2 className="h-3.5 w-3.5" />} />
        <TabBtn active={kind === "client"} onClick={() => setKind("client")} label="Clients" icon={<Users className="h-3.5 w-3.5" />} />
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Kpi label={kind === "supplier" ? "Dette totale" : "Créance totale"} value={data ? fmt(data.totals.total) : "—"} accent={kind === "supplier" ? "danger" : "success"} highlight />
        <Kpi label="0 – 30 j" value={data ? fmt(data.totals.b0_30) : "—"} />
        <Kpi label="31 – 60 j" value={data ? fmt(data.totals.b31_60) : "—"} accent="warning" />
        <Kpi label="61 – 90 j" value={data ? fmt(data.totals.b61_90) : "—"} accent="warning" />
        <Kpi label="&gt; 90 j" value={data ? fmt(data.totals.b90p) : "—"} accent="danger" />
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucun encours {kind === "supplier" ? "fournisseur" : "client"} — toutes les lignes sont lettrées ou aucune écriture 40x/41x n&apos;a été saisie avec un tiers.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">{kind === "supplier" ? "Fournisseur" : "Client"}</th>
                  <th className="px-3 py-2 text-right">Lignes</th>
                  <th className="px-3 py-2 text-right">0 – 30 j</th>
                  <th className="px-3 py-2 text-right">31 – 60 j</th>
                  <th className="px-3 py-2 text-right">61 – 90 j</th>
                  <th className="px-3 py-2 text-right">&gt; 90 j</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Antériorité</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => {
                  const overdue = r.oldestDays > 60;
                  return (
                    <tr key={r.tier} className={clsx("border-b border-line", overdue && "bg-warning/5")}>
                      <td className="px-3 py-2 font-medium text-ink">{r.tier}</td>
                      <td className="px-3 py-2 text-right text-ink-3 tabular-nums">{r.lineCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{fmt(r.b0_30)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-warning">{fmt(r.b31_60)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-warning">{fmt(r.b61_90)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-danger">{fmt(r.b90p)}</td>
                      <td className={clsx("px-3 py-2 text-right tabular-nums font-medium", kind === "supplier" ? "text-danger" : "text-success")}>{fmt(r.total)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={clsx("inline-flex items-center gap-1 text-[11px]", overdue ? "text-warning" : "text-ink-3")}>
                          {overdue && <AlertTriangle className="h-3 w-3" />} {r.oldestDays} j
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-line bg-surface-alt text-[12px] font-semibold">
                <tr>
                  <td className="px-3 py-2 uppercase tracking-wider text-ink-3">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-3">{data.tierCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(data.totals.b0_30)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(data.totals.b31_60)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(data.totals.b61_90)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(data.totals.b90p)}</td>
                  <td className={clsx("px-3 py-2 text-right tabular-nums", kind === "supplier" ? "text-danger" : "text-success")}>{fmt(data.totals.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink",
      )}
    >
      {icon} {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}

function Kpi({ label, value, accent, highlight }: { label: string; value: string; accent?: "warning" | "danger" | "success"; highlight?: boolean }) {
  return (
    <div className={clsx(
      "rounded-xl border p-3 shadow-card",
      highlight ? "border-primary-200 bg-primary-50/40" : "border-line bg-white",
    )}>
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx(
        "mt-1 text-2xl font-bold tabular-nums",
        accent === "danger" && "text-danger",
        accent === "warning" && "text-warning",
        accent === "success" && "text-success",
        !accent && "text-ink",
      )}>{value}</div>
    </div>
  );
}
