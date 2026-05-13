"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Send, Coins } from "lucide-react";

interface OverdueRow {
  id: string;
  reference: string;
  tenantName: string;
  amountTTC: number;
  dueAt: string;
  daysOverdue: number;
  reminderCount: number;
}

interface InvoiceRow {
  id: string;
  reference: string;
  tenantName: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  status: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Brouillon", bg: "rgba(148,163,184,0.15)", color: "#CBD5E1" },
  ISSUED: { label: "Émise", bg: "rgba(34,211,238,0.18)", color: "#67E8F9" },
  PAID: { label: "Payée", bg: "rgba(34,197,94,0.18)", color: "#86EFAC" },
  OVERDUE: { label: "Impayée", bg: "rgba(239,68,68,0.22)", color: "#FCA5A5" },
  CANCELLED: { label: "Annulée", bg: "rgba(148,163,184,0.18)", color: "#CBD5E1" },
  REFUNDED: { label: "Remboursée", bg: "rgba(245,158,11,0.18)", color: "#FCD34D" },
};

function fmtMoney(xaf: number): string {
  return Math.round(xaf / 1_000).toLocaleString("fr-FR") + " K";
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function OverdueInvoicesAlert({ rows }: { rows: OverdueRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remind(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/billing/invoices/${id}/remind`, {
      method: "POST",
    });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  async function recordPayment(r: OverdueRow) {
    const amount = prompt(
      `Montant reçu pour ${r.reference} (XAF, défaut ${r.amountTTC}) ?`,
      String(r.amountTTC),
    );
    if (!amount) return;
    setBusy(r.id);
    const res = await fetch(
      `/api/admin/billing/invoices/${r.id}/record-payment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(amount, 10) }),
      },
    );
    setBusy(null);
    if (res.ok) router.refresh();
  }

  if (rows.length === 0) {
    return (
      <section
        className="rounded-xl border p-4"
        style={{ background: "#1E293B", borderColor: "#334155" }}
      >
        <p className="text-sm text-emerald-300">
          ✓ Aucune facture impayée. Tous les tenants à jour de leurs règlements.
        </p>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{ background: "#1E293B", borderColor: "#EF4444" }}
    >
      <header className="border-b px-4 py-3" style={{ borderColor: "#334155" }}>
        <h3 className="text-sm font-semibold text-rose-200">
          🚨 Impayés à traiter en priorité ({rows.length})
        </h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-white/45">
            <tr className="border-b" style={{ borderColor: "#334155" }}>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2">Référence</th>
              <th className="px-4 py-2 text-right">Montant TTC</th>
              <th className="px-4 py-2 text-right">Échéance</th>
              <th className="px-4 py-2 text-right">Retard</th>
              <th className="px-4 py-2 text-right">Relances</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-b-0"
                style={{ borderColor: "#1F2937" }}
              >
                <td className="px-4 py-2.5 font-medium text-white">{r.tenantName}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-white/70">
                  {r.reference}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-rose-200">
                  {fmtMoney(r.amountTTC)} XAF
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-white/70">
                  {fmtDate(r.dueAt)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-rose-300">
                  {r.daysOverdue} j
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-white/70">
                  {r.reminderCount}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => remind(r.id)}
                      className={clsx(
                        "rounded px-2 py-1 text-[10px] font-semibold",
                        "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
                        busy === r.id && "opacity-60",
                      )}
                    >
                      <Send className="inline h-3 w-3" /> Relancer
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => recordPayment(r)}
                      className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                    >
                      <Coins className="inline h-3 w-3" /> Encaisser
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <header className="border-b px-4 py-3" style={{ borderColor: "#334155" }}>
        <h3 className="text-sm font-semibold text-white">
          Factures récentes ({rows.length})
        </h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-white/45">
            <tr className="border-b" style={{ borderColor: "#334155" }}>
              <th className="px-4 py-2">Référence</th>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2 text-right">HT</th>
              <th className="px-4 py-2 text-right">TVA 19,25 %</th>
              <th className="px-4 py-2 text-right">TTC</th>
              <th className="px-4 py-2">Émise</th>
              <th className="px-4 py-2">Échéance</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-white/50">
                  Aucune facture sur la période.
                </td>
              </tr>
            ) : (
              rows.map((i) => {
                const sc = STATUS_CFG[i.status] ?? STATUS_CFG.DRAFT;
                return (
                  <tr
                    key={i.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "#1F2937" }}
                  >
                    <td className="px-4 py-2 font-mono text-[11px] text-white/80">
                      {i.reference}
                    </td>
                    <td className="px-4 py-2 text-white">{i.tenantName}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-white/70">
                      {fmtMoney(i.amountHT)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-white/70">
                      {fmtMoney(i.vatAmount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-cyan-300">
                      {fmtMoney(i.amountTTC)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-white/70">
                      {fmtDate(i.issuedAt)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-white/70">
                      {fmtDate(i.dueAt)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RevenueByPlanCards({
  rows,
}: {
  rows: Array<{
    planId: string;
    planCode: string;
    planName: string;
    subscriptions: number;
    mrrXAF: number;
  }>;
}) {
  const total = rows.reduce((s, r) => s + r.mrrXAF, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.mrrXAF / total) * 100) : 0;
        return (
          <div
            key={r.planId}
            className="rounded-xl border p-4"
            style={{ background: "#1E293B", borderColor: "#334155" }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
              {r.planName}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-cyan-300">
              {fmtMoney(r.mrrXAF)} XAF
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[11px] text-white/55">
              <span>
                {r.subscriptions} abonnement{r.subscriptions > 1 ? "s" : ""}
              </span>
              <span>{pct} %</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
