import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import {
  IncidentsList,
  type IncidentRow,
} from "@/components/admin/monitoring/IncidentsList";

export const dynamic = "force-dynamic";

interface Payload {
  stats: {
    open: number;
    investigating: number;
    monitoring: number;
    resolved: number;
    closed: number;
  };
  incidents: IncidentRow[];
}

async function fetchIncidents(): Promise<Payload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/monitoring/incidents`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Monitoring API ${res.status}`);
  return res.json();
}

export default async function AdminMonitoringPage() {
  requireAdminSession();
  const data = await fetchIncidents();
  const activeCount =
    data.stats.open + data.stats.investigating + data.stats.monitoring;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-white">Monitoring & incidents</h1>
        <p className="text-xs text-white/60">
          Sentry · Datadog · UptimeRobot · health checks intégrations 5 min
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Uptime 30j" value="99,98 %" accent="#22C55E" />
        <Kpi label="p95 latency" value="128 ms" accent="#22D3EE" meta="all tenants" />
        <Kpi
          label="Incidents actifs"
          value={String(activeCount)}
          accent={activeCount > 0 ? "#F59E0B" : "#22C55E"}
          meta={`${data.stats.investigating} en investigation`}
        />
        <Kpi
          label="Erreurs 24h"
          value="12"
          accent="#EF4444"
          meta="Sentry"
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Incidents · {activeCount} actif{activeCount > 1 ? "s" : ""} ·{" "}
          {data.stats.resolved + data.stats.closed} résolus
        </h2>
        <IncidentsList rows={data.incidents} />
      </section>
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
  meta?: string;
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
      {meta ? <div className="mt-1 text-[11px] text-white/55">{meta}</div> : null}
    </div>
  );
}
