"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import { useVariationN1, type VariationItem } from "@/hooks/useDafAccounting";
import { formatFCFA } from "@/lib/format";

interface Props {
  period: string;
}

function pctTone(pct: number | null, kind: "expense" | "revenue"): string {
  if (pct === null || Math.abs(pct) < 5) return "text-ink-3";
  // Charges : hausse = mauvais (rouge). Produits : hausse = bon (vert).
  const negativeSignal = kind === "expense" ? pct > 0 : pct < 0;
  if (Math.abs(pct) >= 25) return negativeSignal ? "text-danger font-semibold" : "text-success font-semibold";
  return negativeSignal ? "text-warning" : "text-success";
}

function PctChip({ pct, kind }: { pct: number | null; kind: VariationItem["kind"] }) {
  if (pct === null) {
    return <span className="text-[11.5px] text-ink-3">N-1 = 0</span>;
  }
  const Icon = Math.abs(pct) < 1 ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[12px] tabular-nums", pctTone(pct, kind))}>
      <Icon className="h-3 w-3" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)} %
    </span>
  );
}

export function VariationPanel({ period }: Props) {
  const { data, isLoading } = useVariationN1(period);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const expenses = data.items.filter((i) => i.kind === "expense");
  const revenues = data.items.filter((i) => i.kind === "revenue");

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Variation vs N-1
        </h3>
        <p className="text-[11px] text-ink-3">
          {data.period} comparé à {data.previousPeriod}.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Produits (cl. 7)" items={revenues} />
        <Block title="Charges (cl. 6)" items={expenses} />
      </div>
    </section>
  );
}

function Block({ title, items }: { title: string; items: VariationItem[] }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{title}</h4>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-2 border-b border-line py-1 text-[12px] last:border-b-0">
            <span className="min-w-0 truncate text-ink">{it.label}</span>
            <div className="flex items-center gap-3 text-right">
              <span className="font-mono text-[11.5px] text-ink-3">
                {formatFCFA(BigInt(it.current))}
              </span>
              <PctChip pct={it.pct} kind={it.kind} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
