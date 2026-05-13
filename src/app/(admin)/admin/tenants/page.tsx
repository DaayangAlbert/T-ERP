import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { TenantsTable, type TenantRow } from "@/components/admin/tenants/TenantsTable";
import { ProvisionTenantWizard } from "@/components/admin/tenants/ProvisionTenantWizard";

export const dynamic = "force-dynamic";

interface TenantsPayload {
  stats: {
    total: number;
    active: number;
    demo: number;
    suspended: number;
    trial: number;
  };
  tenants: TenantRow[];
}

async function fetchTenants(): Promise<TenantsPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/tenants`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Tenants API ${res.status}`);
  return res.json();
}

export default async function AdminTenantsPage() {
  requireAdminSession();
  const [data, plansRaw] = await Promise.all([
    fetchTenants(),
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { orderIndex: "asc" },
      select: { code: true, name: true, monthlyPriceXAF: true },
    }),
  ]);
  const plans = plansRaw.map((p) => ({
    ...p,
    monthlyPriceXAF: Number(p.monthlyPriceXAF),
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Tenants</h1>
          <p className="text-xs text-white/60">
            {data.stats.total} entreprises clientes · {data.stats.active} actives ·{" "}
            {data.stats.demo} démo · {data.stats.suspended} suspendues
          </p>
        </div>
        <ProvisionTenantWizard plans={plans} />
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={data.stats.total} />
        <KpiCard label="Actifs" value={data.stats.active} accent="#22C55E" />
        <KpiCard label="Démo" value={data.stats.demo} accent="#22D3EE" />
        <KpiCard label="Suspendus" value={data.stats.suspended} accent="#EF4444" />
      </div>
      <TenantsTable rows={data.tenants} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
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
        className="mt-2 text-3xl font-bold tabular-nums"
        style={{ color: accent ?? "#FFFFFF" }}
      >
        {value}
      </div>
    </div>
  );
}
