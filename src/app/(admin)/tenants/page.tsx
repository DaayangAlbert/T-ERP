"use client";

import { useEffect, useState } from "react";
import { Plan, TenantStatus } from "@prisma/client";
import { clsx } from "clsx";
import { Pause, Play, Archive, Search } from "lucide-react";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  taxId: string | null;
  cnpsId: string | null;
  plan: Plan;
  status: TenantStatus;
  primaryColor: string | null;
  usersCount: number;
  sitesCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  ACTIVE: "Actif",
  TRIAL: "Essai",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

const STATUS_TONE: Record<TenantStatus, string> = {
  ACTIVE: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40",
  TRIAL: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/40",
  SUSPENDED: "bg-amber-400/15 text-amber-300 ring-amber-400/40",
  ARCHIVED: "bg-white/10 text-white/50 ring-white/20",
};

const PLAN_LABEL: Record<Plan, string> = {
  STARTER: "Starter",
  STANDARD: "Standard",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export default function TenantsPage() {
  const [items, setItems] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenants");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, status: TenantStatus) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      await fetchTenants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPendingId(null);
    }
  }

  const filtered = items.filter(
    (t) =>
      !filter ||
      t.name.toLowerCase().includes(filter.toLowerCase()) ||
      t.slug.toLowerCase().includes(filter.toLowerCase())
  );

  const totals = items.reduce(
    (acc, t) => {
      acc.users += t.usersCount;
      acc.sites += t.sitesCount;
      acc.byStatus[t.status] = (acc.byStatus[t.status] ?? 0) + 1;
      return acc;
    },
    { users: 0, sites: 0, byStatus: {} as Record<string, number> }
  );

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            Console plateforme
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Tenants T-ERP</h1>
          <p className="mt-0.5 text-[12.5px] text-white/55">
            {items.length} tenant{items.length > 1 ? "s" : ""} · {totals.users} utilisateurs ·{" "}
            {totals.sites} chantiers gérés
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3">
          <Search className="h-4 w-4 text-white/55" />
          <input
            type="search"
            placeholder="Rechercher tenant…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-60 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Actifs" value={totals.byStatus.ACTIVE ?? 0} tone="emerald" />
        <Stat label="Essais" value={totals.byStatus.TRIAL ?? 0} tone="cyan" />
        <Stat label="Suspendus" value={totals.byStatus.SUSPENDED ?? 0} tone="amber" />
        <Stat label="Archivés" value={totals.byStatus.ARCHIVED ?? 0} tone="slate" />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[12.5px]">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-white/55">
              <tr>
                <th className="py-3 pl-4 text-left">Tenant</th>
                <th className="py-3 text-left">Slug</th>
                <th className="py-3 text-left">Plan</th>
                <th className="py-3 text-right">Utilisateurs</th>
                <th className="py-3 text-right">Chantiers</th>
                <th className="py-3 text-left">Créé</th>
                <th className="py-3 text-left">État</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-3 pl-4 last:pr-4">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-white/55">
                    Aucun tenant ne correspond.
                  </td>
                </tr>
              )}
              {filtered.map((t, i) => (
                <tr
                  key={t.id}
                  className={clsx(
                    "transition hover:bg-white/[.04]",
                    i < filtered.length - 1 && "border-b border-white/5"
                  )}
                >
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md text-[11px] font-bold text-white"
                        style={{ background: t.primaryColor || "#A855F7" }}
                      >
                        {t.name.charAt(0)}
                      </span>
                      <div>
                        <div className="font-semibold text-white">{t.name}</div>
                        <div className="font-mono text-[11px] text-white/40">
                          {t.taxId ?? "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                      {t.slug}.terp.cm
                    </span>
                  </td>
                  <td className="py-2.5 text-white/70">{PLAN_LABEL[t.plan]}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{t.usersCount}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{t.sitesCount}</td>
                  <td className="py-2.5 text-white/55">
                    {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                        STATUS_TONE[t.status]
                      )}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <TenantActions
                      tenant={t}
                      pending={pendingId === t.id}
                      onSuspend={() => patch(t.id, TenantStatus.SUSPENDED)}
                      onActivate={() => patch(t.id, TenantStatus.ACTIVE)}
                      onArchive={() => patch(t.id, TenantStatus.ARCHIVED)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "cyan" | "amber" | "slate";
}) {
  const colors = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    slate: "text-white/60",
  } as const;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={clsx("mt-1 font-mono text-[28px] font-bold tabular-nums", colors[tone])}>
        {value}
      </div>
    </div>
  );
}

function TenantActions({
  tenant,
  pending,
  onSuspend,
  onActivate,
  onArchive,
}: {
  tenant: TenantRow;
  pending: boolean;
  onSuspend: () => void;
  onActivate: () => void;
  onArchive: () => void;
}) {
  const isActive = tenant.status === TenantStatus.ACTIVE || tenant.status === TenantStatus.TRIAL;
  return (
    <div className="flex justify-end gap-1.5">
      {isActive ? (
        <ActionBtn label="Suspendre" disabled={pending} onClick={onSuspend} icon={<Pause className="h-3.5 w-3.5" />} />
      ) : tenant.status === TenantStatus.SUSPENDED ? (
        <ActionBtn label="Réactiver" disabled={pending} onClick={onActivate} icon={<Play className="h-3.5 w-3.5" />} primary />
      ) : null}
      {tenant.status !== TenantStatus.ARCHIVED && (
        <ActionBtn label="Archiver" disabled={pending} onClick={onArchive} icon={<Archive className="h-3.5 w-3.5" />} />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  disabled,
  onClick,
  icon,
  primary,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition disabled:opacity-50",
        primary
          ? "bg-cyan-400 text-[#0F172A] hover:bg-cyan-300"
          : "border border-white/15 text-white/80 hover:border-cyan-300 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
