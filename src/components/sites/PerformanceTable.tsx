"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useSitesPerformance, type SitePerfRow } from "@/hooks/useSites";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

type SortKey = "name" | "progress" | "financialProgress" | "variance" | "realizedMargin" | "dso";

const HSE_LABEL: Record<string, { label: string; color: string }> = {
  GOOD: { label: "OK", color: "bg-success/10 text-success" },
  WATCH: { label: "Vigilance", color: "bg-warning/10 text-warning" },
  INCIDENT: { label: "Incident", color: "bg-danger/10 text-danger" },
};

export function PerformanceTable() {
  const { data, isLoading } = useSitesPerformance();
  const [sortKey, setSortKey] = useState<SortKey>("realizedMargin");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb));
    });
    return asc ? sorted : sorted.reverse();
  }, [data, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Chantiers actifs" value={String(data.summary.total)} />
        <Kpi label="Marge moyenne" value={`${data.summary.averageMargin.toFixed(1).replace(".", ",")} %`} />
        <Kpi label="DSO moyen" value={`${data.summary.averageDso} j`} />
        <Kpi label="En dérive / vigilance" value={`${data.summary.drifting} / ${data.summary.atRisk}`} tone={data.summary.drifting > 0 ? "danger" : "ok"} />
      </div>

      {/* Top / worst */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-success">Top 5 marges</h3>
          <ul className="space-y-1.5 text-[12.5px]">
            {data.topMargins.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <Link href={`/chantiers/${s.id}`} className="truncate text-ink hover:text-primary-700">
                  <span className="font-mono text-[10.5px] text-ink-3">{s.code}</span> {s.name}
                </Link>
                <span className="font-mono font-semibold text-success">{s.realizedMargin.toFixed(1).replace(".", ",")} %</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-danger">Top 5 dérives</h3>
          <ul className="space-y-1.5 text-[12.5px]">
            {data.worstDrifts.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <Link href={`/chantiers/${s.id}`} className="truncate text-ink hover:text-primary-700">
                  <span className="font-mono text-[10.5px] text-ink-3">{s.code}</span> {s.name}
                </Link>
                <span className="font-mono font-semibold text-danger">{s.realizedMargin.toFixed(1).replace(".", ",")} %</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <SortHeader k="name" current={sortKey} asc={asc} onClick={toggleSort} className="pl-3 text-left">Chantier</SortHeader>
              <SortHeader k="progress" current={sortKey} asc={asc} onClick={toggleSort} className="text-right">Av. physique</SortHeader>
              <SortHeader k="financialProgress" current={sortKey} asc={asc} onClick={toggleSort} className="text-right">Av. financier</SortHeader>
              <SortHeader k="variance" current={sortKey} asc={asc} onClick={toggleSort} className="text-right">Écart</SortHeader>
              <SortHeader k="realizedMargin" current={sortKey} asc={asc} onClick={toggleSort} className="text-right">Marge réa.</SortHeader>
              <SortHeader k="dso" current={sortKey} asc={asc} onClick={toggleSort} className="text-right">DSO</SortHeader>
              <th className="py-2 pr-3 text-center">HSE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-surface-alt">
                <td className="py-2 pl-3">
                  <Link href={`/chantiers/${r.id}`} className="text-ink hover:text-primary-700">
                    <span className="font-mono text-[10.5px] text-ink-3">{r.code}</span> {r.name}
                  </Link>
                  <div className="text-[10.5px] text-ink-3">{r.client} · {formatFCFA(BigInt(r.budget))}</div>
                </td>
                <td className="py-2 text-right font-mono tabular-nums">{r.progress} %</td>
                <td className="py-2 text-right font-mono tabular-nums">{r.financialProgress} %</td>
                <td className={clsx("py-2 text-right font-mono tabular-nums font-semibold", r.variance < -3 ? "text-danger" : r.variance < 0 ? "text-warning" : "text-success")}>
                  {r.variance > 0 ? "+" : ""}{r.variance} pt
                </td>
                <td className={clsx("py-2 text-right font-mono tabular-nums font-semibold", r.realizedMargin < r.margin - 2 ? "text-danger" : "text-ink")}>
                  {r.realizedMargin.toFixed(1).replace(".", ",")} % <span className="text-[10px] text-ink-3">/ {r.margin.toFixed(1).replace(".", ",")}</span>
                </td>
                <td className={clsx("py-2 text-right font-mono tabular-nums", r.dso > 60 ? "text-warning" : "text-ink-2")}>
                  {r.dso} j
                </td>
                <td className="py-2 pr-3 text-center">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", HSE_LABEL[r.hseStatus].color)}>
                    {HSE_LABEL[r.hseStatus].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3 shadow-card",
        tone === "danger" ? "border-danger/30 bg-danger/5" : "border-line bg-white"
      )}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

function SortHeader({
  k,
  current,
  asc,
  onClick,
  children,
  className,
}: {
  k: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = current === k;
  return (
    <th className={clsx("py-2", className)}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={clsx("inline-flex items-center gap-1", active && "text-primary-700")}
      >
        {children}
        {active && (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}
