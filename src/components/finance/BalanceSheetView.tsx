"use client";

import { useBalance } from "@/hooks/useFinance";
import type { BalanceData } from "@/schemas/finance";
import { formatFCFA } from "@/lib/format";

interface Props {
  period: string;
}

export function BalanceSheetView({ period }: Props) {
  const { data, isLoading, error } = useBalance(period);
  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">
        {error instanceof Error ? error.message : "Aucune donnée"}
      </div>
    );
  }

  const b = data.balance as BalanceData;
  const totalActif = b.actif.immobilisations + b.actif.stocks + b.actif.receivables + b.actif.treasury;
  const totalPassif = b.passif.equity + b.passif.financialDebts + b.passif.suppliers + b.passif.other;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-success">ACTIF</h3>
          <table className="w-full text-[12.5px]">
            <tbody>
              <Row label="Immobilisations" value={b.actif.immobilisations} />
              <Row label="Stocks" value={b.actif.stocks} />
              <Row label="Créances clients" value={b.actif.receivables} />
              <Row label="Trésorerie" value={b.actif.treasury} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-success/40 bg-success/5 font-bold">
                <td className="py-2 pl-3">Total ACTIF</td>
                <td className="py-2 pr-3 text-right font-mono">{formatFCFA(totalActif)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-info">PASSIF</h3>
          <table className="w-full text-[12.5px]">
            <tbody>
              <Row label="Capitaux propres" value={b.passif.equity} />
              <Row label="Dettes financières" value={b.passif.financialDebts} />
              <Row label="Dettes fournisseurs" value={b.passif.suppliers} />
              <Row label="Autres dettes" value={b.passif.other} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-info/40 bg-info/5 font-bold">
                <td className="py-2 pl-3">Total PASSIF</td>
                <td className="py-2 pr-3 text-right font-mono">{formatFCFA(totalPassif)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>

      {Math.abs(totalActif - totalPassif) > 1000 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-[12px] text-warning">
          ⚠ Bilan déséquilibré (écart {formatFCFA(Math.abs(totalActif - totalPassif))}). À vérifier après clôture.
        </div>
      )}

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Ratios financiers</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Ratio label="Autonomie financière" value={b.ratios.autonomy} unit="%" tone={b.ratios.autonomy >= 30 ? "ok" : "warning"} />
          <Ratio label="Liquidité" value={b.ratios.liquidity} unit="" tone={b.ratios.liquidity >= 1 ? "ok" : "danger"} />
          <Ratio label="Endettement" value={b.ratios.leverage} unit="" tone={b.ratios.leverage <= 1 ? "ok" : "warning"} />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr className="border-t border-line">
      <td className="py-1.5 pl-3 text-ink-2">{label}</td>
      <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-ink">{formatFCFA(value)}</td>
    </tr>
  );
}

function Ratio({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: "ok" | "warning" | "danger" }) {
  const color = tone === "ok" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger";
  return (
    <div className="rounded-lg border border-line bg-surface-alt p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`mt-1 font-mono text-[20px] font-bold ${color}`}>
        {value.toFixed(unit === "%" ? 1 : 2).replace(".", ",")}
        {unit && <span className="ml-1 text-[12px]">{unit}</span>}
      </div>
    </div>
  );
}
