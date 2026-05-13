"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Plug, Key, Webhook, ScrollText, RefreshCw, Pause, Play, KeyRound } from "lucide-react";

interface Integration {
  id: string;
  code: string;
  name: string;
  category: string;
  endpoint: string | null;
  status: "ACTIVE" | "ERROR" | "PAUSED" | "DEACTIVATED";
  lastSyncAt: string | null;
  lastError: string | null;
  retryCount: number;
  maxRetries: number;
  frequency: string | null;
  active: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  service: string;
  message: string;
  user: { firstName: string; lastName: string } | null;
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

type Tab = "integrations" | "api-keys" | "webhooks" | "logs";

export default function ItIntegrationsPage() {
  const [tab, setTab] = useState<Tab>("integrations");

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Intégrations et journaux techniques</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Partenaires CNPS, DGI, banques · API keys · webhooks · journaux 5 niveaux.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "integrations"} onClick={() => setTab("integrations")} icon={Plug}>Intégrations</TabBtn>
        <TabBtn active={tab === "api-keys"} onClick={() => setTab("api-keys")} icon={Key}>Clés API</TabBtn>
        <TabBtn active={tab === "webhooks"} onClick={() => setTab("webhooks")} icon={Webhook}>Webhooks</TabBtn>
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")} icon={ScrollText}>Journaux</TabBtn>
      </div>

      {tab === "integrations" && <IntegrationsTab />}
      {tab === "api-keys" && <ApiKeysTab />}
      {tab === "webhooks" && <WebhooksTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

function IntegrationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["it", "integrations"],
    queryFn: async () => {
      const res = await fetch("/api/it/integrations", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Integration[] }>;
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/it/integrations/${id}/actions`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it", "integrations"] }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-alt" />)}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">Aucune intégration.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((i) => (
        <article
          key={i.id}
          className={clsx(
            "rounded-xl border border-y border-r border-l-4 bg-white p-4 shadow-card",
            i.status === "ACTIVE" && "border-l-success",
            i.status === "ERROR" && "border-l-danger",
            i.status === "PAUSED" && "border-l-warning",
            i.status === "DEACTIVATED" && "border-l-ink-3"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-ink">{i.name}</div>
              <div className="text-[11.5px] text-ink-3">{CATEGORY_LABELS[i.category] ?? i.category}</div>
              {i.endpoint && <div className="mt-1 truncate font-mono text-[10.5px] text-ink-3">{i.endpoint}</div>}
            </div>
            <span className={clsx(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              i.status === "ACTIVE" && "bg-success/10 text-success",
              i.status === "ERROR" && "bg-danger/10 text-danger",
              i.status === "PAUSED" && "bg-warning/10 text-warning"
            )}>
              {i.status}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-ink-3">
            {i.lastSyncAt
              ? `Sync ${new Date(i.lastSyncAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
              : "Jamais synchronisé"}
            {i.frequency && <span className="ml-1">· {i.frequency}</span>}
            {i.retryCount > 0 && <span className="ml-1">· retry {i.retryCount}/{i.maxRetries}</span>}
          </div>
          {i.lastError && (
            <div className="mt-2 rounded-md bg-danger/5 p-2 text-[10.5px] text-danger">{i.lastError}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => action.mutate({ id: i.id, action: "test" })}
              disabled={action.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2 py-1 text-[11px] font-medium text-ink-2 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Retester
            </button>
            {i.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => action.mutate({ id: i.id, action: "pause" })}
                disabled={action.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2 py-1 text-[11px] font-medium text-ink-2 disabled:opacity-50"
              >
                <Pause className="h-3 w-3" /> Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => action.mutate({ id: i.id, action: "resume" })}
                disabled={action.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2 py-1 text-[11px] font-medium text-success disabled:opacity-50"
              >
                <Play className="h-3 w-3" /> Reprendre
              </button>
            )}
            <button
              type="button"
              onClick={() => action.mutate({ id: i.id, action: "regenerate-secret" })}
              disabled={action.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2 py-1 text-[11px] font-medium text-ink-2 disabled:opacity-50"
            >
              <KeyRound className="h-3 w-3" /> Régénérer
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ApiKeysTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["it", "api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/it/api-keys", { credentials: "same-origin" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: Array<{ id: string; name: string; keyPrefix: string; scopes: string[]; lastUsedAt: string | null; createdAt: string; revokedAt: string | null }> }>;
    },
  });

  if (isLoading) return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />)}</div>;
  if (!data || data.items.length === 0) {
    return <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">Aucune clé API créée.</p>;
  }
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
          <tr>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Préfixe</th>
            <th className="px-3 py-2">Scopes</th>
            <th className="px-3 py-2">Dernière utilisation</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((k) => (
            <tr key={k.id} className="border-b border-line">
              <td className="px-3 py-2 font-medium text-ink">{k.name}</td>
              <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{k.keyPrefix}</td>
              <td className="px-3 py-2 text-[11.5px] text-ink-2">{k.scopes.join(", ")}</td>
              <td className="px-3 py-2 text-ink-3">
                {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("fr-FR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WebhooksTab() {
  return (
    <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
      Configuration des webhooks sortants — événements `site.created`, `timesheet.validated`, etc.
      <br /><em>Stub : interface à compléter en phase 2.</em>
    </p>
  );
}

function LogsTab() {
  const [level, setLevel] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["it", "logs", level],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (level) params.set("level", level);
      const res = await fetch(`/api/it/logs?${params}`, { credentials: "same-origin" });
      if (res.status === 403) return { items: [], forbidden: true } as const;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: LogEntry[]; total: number }>;
    },
  });

  if (data && "forbidden" in data && data.forbidden) {
    return <p className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-[12.5px] text-warning">Pouvoir manquant : canViewTechnicalLogs (octroyé par le DG).</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">Tous niveaux</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
          <option value="FATAL">FATAL</option>
        </select>
        <span className="self-center text-[12px] text-ink-3">{data && !("forbidden" in data) ? `${data.total} entrées` : ""}</span>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : !data || ("forbidden" in data) || data.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune entrée.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((l) => (
              <li key={l.id} className="flex items-start gap-3 p-3 text-[12px]">
                <span className="font-mono text-[10.5px] text-ink-3 whitespace-nowrap">
                  {new Date(l.timestamp).toLocaleString("fr-FR")}
                </span>
                <span className={clsx(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  l.level === "ERROR" && "bg-danger/10 text-danger",
                  l.level === "FATAL" && "bg-danger text-white",
                  l.level === "WARN" && "bg-warning/10 text-warning",
                  l.level === "INFO" && "bg-primary-50 text-primary-700",
                  l.level === "DEBUG" && "bg-ink-3/10 text-ink-3"
                )}>
                  {l.level}
                </span>
                <span className="font-mono text-[11px] text-ink-2">{l.service}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2" title={l.message}>{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Plug;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}
