"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useFixedAssets } from "@/hooks/useStocks";
import { AssetCategory } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  EQUIPMENT: "Engins",
  VEHICLE: "Véhicules",
  BUILDING: "Bâtiments",
  TOOLING: "Outillage",
  IT: "Informatique",
  FURNITURE: "Mobilier",
  OTHER: "Autres",
};

const COLORS = ["#A855F7", "#15803D", "#0369A1", "#B45309", "#B91C1C", "#7E22CE", "#3B82F6"];

const CONDITION_BADGE: Record<string, string> = {
  EXCELLENT: "bg-success/10 text-success",
  GOOD: "bg-info/10 text-info",
  FAIR: "bg-warning/10 text-warning",
  POOR: "bg-danger/10 text-danger",
};

export function FixedAssetsTable() {
  const { data, isLoading } = useFixedAssets();
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Immobilisations" value={String(data.summary.total)} />
        <Stat label="Valeur brute totale" value={formatFCFA(BigInt(data.summary.totalGross))} />
        <Stat label="VNC totale" value={formatFCFA(BigInt(data.summary.totalNetValue))} highlight />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-line bg-white shadow-card overflow-x-auto">
          <table className="w-full min-w-[860px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Code</th>
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-left">Catégorie</th>
                <th className="py-2 text-left">Acquisition</th>
                <th className="py-2 text-right">Valeur brute</th>
                <th className="py-2 text-right">VNC</th>
                <th className="py-2 pr-3 text-center">État</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-3">Aucune immobilisation enregistrée.</td>
                </tr>
              ) : (
                data.items.map((a) => (
                  <tr key={a.id} className="border-t border-line hover:bg-surface-alt">
                    <td className="py-2 pl-3 font-mono text-[11px]">{a.code}</td>
                    <td className="py-2 text-ink">{a.description}</td>
                    <td className="py-2 text-ink-3">{CATEGORY_LABEL[a.category]}</td>
                    <td className="py-2 text-[11.5px] text-ink-3">{formatDate(a.acquisitionDate)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(a.grossValue))}</td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold">{formatFCFA(BigInt(a.netValue))}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", CONDITION_BADGE[a.condition] ?? "bg-ink-3/10 text-ink-3")}>
                        {a.condition}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Répartition par type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.byCategory.map((c) => ({ name: CATEGORY_LABEL[c.category as AssetCategory] ?? c.category, value: Number(BigInt(c.netValue) / 1_000_000n) }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} M FCFA`} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
