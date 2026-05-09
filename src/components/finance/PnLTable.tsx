"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePnL } from "@/hooks/useFinance";
import type { PnLData } from "@/schemas/finance";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

interface Props {
  period: string;
}

export function PnLTable({ period }: Props) {
  const [compare, setCompare] = useState<"YOY" | "BUDGET">("YOY");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["expenses"]));
  const { data, isLoading, error } = usePnL(period, compare);

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">
        {error instanceof Error ? error.message : "Aucune donnée"}
      </div>
    );
  }

  const cur = data.current as PnLData;
  const cmp = data.comparison as PnLData | null;
  const ytd = data.ytd as PnLData;

  const totalProducts = cur.products.revenue + cur.products.otherProducts;
  const totalExpenses =
    cur.expenses.purchases + cur.expenses.personnel + cur.expenses.subcontracting + cur.expenses.depreciation + cur.expenses.other;
  const cmpProducts = cmp ? cmp.products.revenue + cmp.products.otherProducts : null;

  const toggle = (k: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3 shadow-card">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Compte de résultat — {period}
        </h3>
        <div className="inline-flex rounded-md border border-line">
          <button
            type="button"
            onClick={() => setCompare("YOY")}
            className={clsx(
              "px-3 py-1 text-[12px] font-medium",
              compare === "YOY" ? "bg-primary-500 text-white" : "text-ink-3 hover:bg-surface-alt"
            )}
          >
            vs N-1
          </button>
          <button
            type="button"
            onClick={() => setCompare("BUDGET")}
            className={clsx(
              "px-3 py-1 text-[12px] font-medium",
              compare === "BUDGET" ? "bg-primary-500 text-white" : "text-ink-3 hover:bg-surface-alt"
            )}
          >
            vs Budget
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Poste</th>
              <th className="py-2 text-right">{period}</th>
              <th className="py-2 text-right">{data.comparePeriod}</th>
              <th className="py-2 text-right">Variation</th>
              <th className="py-2 pr-3 text-right">YTD</th>
            </tr>
          </thead>
          <tbody>
            <SectionRow label="Produits" toggle={() => toggle("products")} expanded={expanded.has("products")} />
            {expanded.has("products") && (
              <>
                <Row label="Chiffre d'affaires" cur={cur.products.revenue} cmp={cmp?.products.revenue} ytd={ytd.products.revenue} indent />
                <Row label="Autres produits" cur={cur.products.otherProducts} cmp={cmp?.products.otherProducts} ytd={ytd.products.otherProducts} indent />
              </>
            )}
            <TotalRow label="Total produits" cur={totalProducts} cmp={cmpProducts} ytd={ytd.products.revenue + ytd.products.otherProducts} />

            <SectionRow label="Charges" toggle={() => toggle("expenses")} expanded={expanded.has("expenses")} />
            {expanded.has("expenses") && (
              <>
                <Row label="Achats matières et marchandises" cur={cur.expenses.purchases} cmp={cmp?.expenses.purchases} ytd={ytd.expenses.purchases} indent />
                <Row label="Personnel (salaires + charges)" cur={cur.expenses.personnel} cmp={cmp?.expenses.personnel} ytd={ytd.expenses.personnel} indent />
                <Row label="Sous-traitance" cur={cur.expenses.subcontracting} cmp={cmp?.expenses.subcontracting} ytd={ytd.expenses.subcontracting} indent />
                <Row label="Dotations aux amortissements" cur={cur.expenses.depreciation} cmp={cmp?.expenses.depreciation} ytd={ytd.expenses.depreciation} indent />
                <Row label="Autres charges" cur={cur.expenses.other} cmp={cmp?.expenses.other} ytd={ytd.expenses.other} indent />
              </>
            )}
            <TotalRow label="Total charges" cur={totalExpenses} cmp={cmp ? cmp.expenses.purchases + cmp.expenses.personnel + cmp.expenses.subcontracting + cmp.expenses.depreciation + cmp.expenses.other : null} ytd={ytd.expenses.purchases + ytd.expenses.personnel + ytd.expenses.subcontracting + ytd.expenses.depreciation + ytd.expenses.other} />

            <Row label="Résultat d'exploitation" cur={cur.operatingResult} cmp={cmp?.operatingResult} ytd={ytd.operatingResult} bold />
            <Row label="Résultat financier" cur={cur.financialResult} cmp={cmp?.financialResult} ytd={ytd.financialResult} indent />
            <Row label="Résultat exceptionnel" cur={cur.exceptionalResult} cmp={cmp?.exceptionalResult} ytd={ytd.exceptionalResult} indent />
            <TotalRow label="Résultat net" cur={cur.netResult} cmp={cmp?.netResult ?? null} ytd={ytd.netResult} highlight />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionRow({ label, toggle, expanded }: { label: string; toggle: () => void; expanded: boolean }) {
  return (
    <tr className="bg-primary-50/40">
      <td colSpan={5} className="py-1.5 pl-3">
        <button type="button" onClick={toggle} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-700">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {label}
        </button>
      </td>
    </tr>
  );
}

function Row({ label, cur, cmp, ytd, indent, bold }: { label: string; cur: number; cmp?: number | null; ytd: number; indent?: boolean; bold?: boolean }) {
  const variance = cmp != null && cmp !== 0 ? ((cur - cmp) / Math.abs(cmp)) * 100 : null;
  return (
    <tr className={clsx("border-t border-line", bold && "bg-surface-alt font-semibold")}>
      <td className={clsx("py-1.5", indent ? "pl-7" : "pl-3", bold && "text-ink")}>{label}</td>
      <td className="py-1.5 text-right font-mono tabular-nums">{formatFCFA(cur)}</td>
      <td className="py-1.5 text-right font-mono tabular-nums text-ink-3">
        {cmp != null ? formatFCFA(cmp) : "—"}
      </td>
      <td
        className={clsx(
          "py-1.5 text-right font-mono tabular-nums text-[11px]",
          variance == null ? "text-ink-3" : variance > 0 ? "text-success" : "text-danger"
        )}
      >
        {variance == null ? "—" : `${variance > 0 ? "+" : ""}${variance.toFixed(1).replace(".", ",")} %`}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{formatFCFA(ytd)}</td>
    </tr>
  );
}

function TotalRow({ label, cur, cmp, ytd, highlight }: { label: string; cur: number; cmp?: number | null; ytd: number; highlight?: boolean }) {
  const variance = cmp != null && cmp !== 0 ? ((cur - cmp) / Math.abs(cmp)) * 100 : null;
  return (
    <tr className={clsx("border-t-2 border-primary-300", highlight ? "bg-primary-100 font-bold" : "bg-surface-alt font-semibold")}>
      <td className="py-2 pl-3">{label}</td>
      <td className={clsx("py-2 text-right font-mono tabular-nums", highlight && "text-primary-800")}>
        {formatFCFA(cur)}
      </td>
      <td className="py-2 text-right font-mono tabular-nums text-ink-3">
        {cmp != null ? formatFCFA(cmp) : "—"}
      </td>
      <td
        className={clsx(
          "py-2 text-right font-mono tabular-nums text-[11px]",
          variance == null ? "text-ink-3" : variance > 0 ? "text-success" : "text-danger"
        )}
      >
        {variance == null ? "—" : `${variance > 0 ? "+" : ""}${variance.toFixed(1).replace(".", ",")} %`}
      </td>
      <td className={clsx("py-2 pr-3 text-right font-mono tabular-nums", highlight && "text-primary-800")}>
        {formatFCFA(ytd)}
      </td>
    </tr>
  );
}
