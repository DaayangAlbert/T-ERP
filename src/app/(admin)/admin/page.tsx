import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { AdminHeaderBanner } from "@/components/admin/dashboard/AdminHeaderBanner";
import { AdminKpiRow } from "@/components/admin/dashboard/AdminKpiRow";
import {
  AdminAlertsList,
  type AdminIncidentSummary,
} from "@/components/admin/dashboard/AdminAlertsList";
import { TopTenantsCard } from "@/components/admin/dashboard/TopTenantsCard";
import { RecentActivityTable } from "@/components/admin/dashboard/RecentActivityTable";

export const dynamic = "force-dynamic";

interface DashboardPayload {
  kpis: {
    activeTenants: number;
    demoTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    activeSubscriptions: number;
    mrrXAF: number;
    arrXAF: number;
    overdueInvoices: number;
    overdueAmountXAF: number;
    uptime: number;
    latestDau: number;
    latestMau: number;
  };
  incidents: AdminIncidentSummary[];
  topTenants: Array<{
    tenantId: string;
    slug: string;
    name: string;
    status: string;
    planCode: string;
    planName: string;
    mrrXAF: number;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    actorEmail: string;
    action: string;
    targetType: string;
    targetDescription: string | null;
    ipAddress: string;
  }>;
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Admin dashboard API ${res.status}`);
  return res.json();
}

export default async function AdminDashboardPage() {
  requireAdminSession();
  const data = await fetchDashboard();
  return (
    <div className="space-y-5">
      <AdminHeaderBanner
        activeTenants={data.kpis.activeTenants}
        uptime={data.kpis.uptime}
      />
      <AdminKpiRow
        activeTenants={data.kpis.activeTenants}
        demoTenants={data.kpis.demoTenants}
        suspendedTenants={data.kpis.suspendedTenants}
        totalUsers={data.kpis.totalUsers}
        mrrXAF={data.kpis.mrrXAF}
        arrXAF={data.kpis.arrXAF}
        overdueInvoices={data.kpis.overdueInvoices}
        uptime={data.kpis.uptime}
      />
      <AdminAlertsList incidents={data.incidents} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TopTenantsCard items={data.topTenants} />
        <SystemMetricsCard
          dau={data.kpis.latestDau}
          mau={data.kpis.latestMau}
          activeSubscriptions={data.kpis.activeSubscriptions}
          overdueAmountXAF={data.kpis.overdueAmountXAF}
        />
      </div>
      <RecentActivityTable rows={data.recentActivity} />
    </div>
  );
}

function SystemMetricsCard({
  dau,
  mau,
  activeSubscriptions,
  overdueAmountXAF,
}: {
  dau: number;
  mau: number;
  activeSubscriptions: number;
  overdueAmountXAF: number;
}) {
  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;
  return (
    <section
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <h3 className="text-sm font-semibold text-white">
        Métriques système · 24h
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Metric label="DAU" value={String(dau)} accent="#22D3EE" />
        <Metric label="MAU" value={String(mau)} accent="#22D3EE" />
        <Metric
          label="Stickiness DAU/MAU"
          value={`${stickiness} %`}
          accent="#22C55E"
        />
        <Metric
          label="Subscriptions actives"
          value={String(activeSubscriptions)}
          accent="#A78BFA"
        />
        <Metric
          label="Impayés cumulés"
          value={`${Math.round(overdueAmountXAF / 1_000).toLocaleString("fr-FR")} K XAF`}
          accent={overdueAmountXAF > 0 ? "#F59E0B" : "#22C55E"}
        />
        <Metric label="p95 latency" value="128 ms" accent="#22D3EE" />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{ background: "#0F172A" }}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="mt-1 text-base font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
