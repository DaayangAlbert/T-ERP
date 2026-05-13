import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import {
  OverdueInvoicesAlert,
  InvoicesTable,
  RevenueByPlanCards,
} from "@/components/admin/billing/BillingDashboardClient";

export const dynamic = "force-dynamic";

interface Payload {
  kpis: {
    mrrXAF: number;
    arrXAF: number;
    activeSubscriptions: number;
    overdueCount: number;
    overdueAmountXAF: number;
    arpuXAF: number;
  };
  overdue: Array<{
    id: string;
    reference: string;
    tenantName: string;
    amountTTC: number;
    dueAt: string;
    daysOverdue: number;
    reminderCount: number;
  }>;
  recentInvoices: Array<{
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
  }>;
  revenueByPlan: Array<{
    planId: string;
    planCode: string;
    planName: string;
    subscriptions: number;
    mrrXAF: number;
  }>;
}

async function fetchBilling(): Promise<Payload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/billing/dashboard`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Billing API ${res.status}`);
  return res.json();
}

function fmtMoney(xaf: number): string {
  if (xaf >= 1_000_000) return `${(xaf / 1_000_000).toFixed(2)} M`;
  if (xaf >= 1_000) return `${Math.round(xaf / 1_000)} K`;
  return String(xaf);
}

export default async function AdminBillingPage() {
  requireAdminSession();
  const data = await fetchBilling();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-white">Facturation SaaS</h1>
        <p className="text-xs text-white/60">
          Cycle de facturation mensuel · TVA 19,25 % Cameroun · Reversement
          DGI trimestriel
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="MRR XAF"
          value={`${fmtMoney(data.kpis.mrrXAF)}`}
          meta={`ARR ${fmtMoney(data.kpis.arrXAF)}`}
          accent="#22D3EE"
        />
        <Kpi
          label="Abonnements actifs"
          value={String(data.kpis.activeSubscriptions)}
          meta={`ARPU ${fmtMoney(data.kpis.arpuXAF)} XAF`}
        />
        <Kpi
          label="Impayés"
          value={String(data.kpis.overdueCount)}
          meta={`${fmtMoney(data.kpis.overdueAmountXAF)} XAF`}
          accent={data.kpis.overdueCount > 0 ? "#EF4444" : "#22C55E"}
        />
        <Kpi
          label="TVA collectée 30j"
          value={fmtMoney(
            data.recentInvoices
              .filter((i) => i.status === "PAID")
              .reduce((s, i) => s + i.vatAmount, 0),
          )}
          meta="reversement DGI"
        />
      </div>

      <OverdueInvoicesAlert rows={data.overdue} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <InvoicesTable rows={data.recentInvoices} />
        <RevenueByPlanCards rows={data.revenueByPlan} />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: accent ?? "#FFFFFF" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-white/55">{meta}</div>
    </div>
  );
}
