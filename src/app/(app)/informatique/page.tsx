"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, AlertTriangle, Plug, Shield, ServerCrash, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface ItDashboard {
  tenant: { slug: string; env: string };
  overallStatus: "OPERATIONAL" | "DEGRADED";
  kpis: {
    activeUsers: number;
    totalUsers: number;
    activeSessions: number;
    mfaEnabled: number;
    inactiveUsers: number;
    integrationsOk: number;
    integrationsTotal: number;
    securityAlerts: number;
  };
  alerts: Array<{ id: string; severity: "danger" | "warning" | "info"; title: string; detail: string; action?: string }>;
  integrations: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    status: "ACTIVE" | "ERROR" | "PAUSED" | "DEACTIVATED";
    lastSyncAt: string | null;
    lastError: string | null;
  }>;
  sessionsByRole: Array<{ role: string; users: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  SOCIAL_SECURITY: "Sécurité sociale",
  TAX_AUTHORITY: "Fiscal",
  BANK: "Banque",
  EMAIL: "Email",
  SMS_MESSAGING: "Messagerie",
  STORAGE: "Stockage",
  MONITORING: "Monitoring",
  OTHER: "Autre",
};

export default function ItDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["it", "dashboard"],
    queryFn: async (): Promise<ItDashboard> => {
      const res = await fetch("/api/it/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Administration IT</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Tenant <span className="font-mono">{data?.tenant.slug ?? "—"}</span>
            {" · "}environnement <strong>{data?.tenant.env}</strong>
          </p>
        </div>
        {data && (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium",
              data.overallStatus === "OPERATIONAL"
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
            )}
          >
            {data.overallStatus === "OPERATIONAL" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ServerCrash className="h-3.5 w-3.5" />}
            {data.overallStatus === "OPERATIONAL" ? "Tous services opérationnels" : "Services dégradés"}
          </span>
        )}
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          label="Utilisateurs actifs"
          value={data ? `${data.kpis.activeUsers}` : "—"}
          hint={data ? `sur ${data.kpis.totalUsers} comptes` : undefined}
          icon={Users}
        />
        <Kpi
          label="Sessions en cours"
          value={data ? `${data.kpis.activeSessions}` : "—"}
          icon={Activity}
        />
        <Kpi
          label="Alertes sécurité"
          value={data ? `${data.kpis.securityAlerts}` : "—"}
          icon={AlertTriangle}
          tone={data && data.kpis.securityAlerts > 0 ? "danger" : "ok"}
        />
        <Kpi
          label="Intégrations OK"
          value={data ? `${data.kpis.integrationsOk}/${data.kpis.integrationsTotal}` : "—"}
          icon={Plug}
          tone={data && data.kpis.integrationsOk < data.kpis.integrationsTotal ? "warning" : "ok"}
        />
      </section>

      {data && data.alerts.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-3 shadow-card">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Alertes techniques</h2>
          <ul className="space-y-1.5">
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className={clsx(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px]",
                  a.severity === "danger" && "border-danger/30 bg-danger/5 text-danger",
                  a.severity === "warning" && "border-warning/30 bg-warning/5 text-warning",
                  a.severity === "info" && "border-primary-200 bg-primary-50 text-primary-700"
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-[11.5px] opacity-80">{a.detail}</div>
                </div>
                {a.action && (
                  <Link
                    href={a.action}
                    className="shrink-0 rounded-md border border-current px-2 py-1 text-[11px] font-medium"
                  >
                    Voir
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          État des services et intégrations
        </h2>
        {isLoading ? (
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-24 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : data?.integrations.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune intégration configurée.</p>
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {data?.integrations.map((i) => (
              <article
                key={i.id}
                className={clsx(
                  "rounded-md border-l-4 border-y border-r border-line bg-white p-3 text-[12px]",
                  i.status === "ACTIVE" && "border-l-success",
                  i.status === "ERROR" && "border-l-danger",
                  i.status === "PAUSED" && "border-l-warning",
                  i.status === "DEACTIVATED" && "border-l-ink-3"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{i.name}</div>
                    <div className="text-[10.5px] text-ink-3">{CATEGORY_LABELS[i.category] ?? i.category}</div>
                  </div>
                  <span className={clsx(
                    "rounded-full px-1.5 text-[10px] font-medium",
                    i.status === "ACTIVE" && "bg-success/10 text-success",
                    i.status === "ERROR" && "bg-danger/10 text-danger",
                    i.status === "PAUSED" && "bg-warning/10 text-warning"
                  )}>
                    {i.status}
                  </span>
                </div>
                <div className="mt-2 text-[10.5px] text-ink-3">
                  {i.lastSyncAt
                    ? `Dernier sync : ${new Date(i.lastSyncAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
                    : "Jamais synchronisé"}
                </div>
                {i.lastError && (
                  <div className="mt-1 truncate text-[10.5px] text-danger" title={i.lastError}>
                    {i.lastError}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Sessions par rôle
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2">Rôle</th>
                <th className="px-3 py-2 text-right">Utilisateurs actifs</th>
              </tr>
            </thead>
            <tbody>
              {data?.sessionsByRole.map((s) => (
                <tr key={s.role} className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">{s.role}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  tone?: "ok" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Icon className={clsx(
          "h-4 w-4",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          (!tone || tone === "ok") && "text-primary-600"
        )} />
      </div>
      <div className={clsx(
        "mt-1 text-2xl font-bold",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning",
        (!tone || tone === "ok") && "text-ink"
      )}>
        {value}
      </div>
      {hint && <div className="text-[10.5px] text-ink-3">{hint}</div>}
    </div>
  );
}
