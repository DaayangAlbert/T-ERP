"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Pause, Play, ExternalLink } from "lucide-react";

export interface TenantRow {
  id: string;
  slug: string;
  subdomain: string | null;
  name: string;
  country: string;
  status: string;
  planCode: string | null;
  planName: string | null;
  monthlyPriceXAF: number | null;
  isDemoTenant: boolean;
  demoExpiresAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  usersCount: number;
  sitesCount: number;
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: "Actif", bg: "rgba(34,197,94,0.18)", color: "#86EFAC" },
  DEMO: { label: "Démo", bg: "rgba(34,211,238,0.18)", color: "#67E8F9" },
  TRIAL: { label: "Essai", bg: "rgba(34,211,238,0.18)", color: "#67E8F9" },
  SUSPENDED: { label: "Suspendu", bg: "rgba(239,68,68,0.22)", color: "#FCA5A5" },
  PROVISIONING: { label: "En cours", bg: "rgba(245,158,11,0.18)", color: "#FCD34D" },
  TERMINATED: { label: "Terminé", bg: "rgba(148,163,184,0.18)", color: "#CBD5E1" },
  PURGED: { label: "Purgé", bg: "rgba(148,163,184,0.10)", color: "#94A3B8" },
  ARCHIVED: { label: "Archivé", bg: "rgba(148,163,184,0.18)", color: "#CBD5E1" },
};

export function TenantsTable({ rows }: { rows: TenantRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suspend(t: TenantRow) {
    const reason = prompt(`Raison de la suspension de ${t.name} ?`)?.trim();
    if (!reason || reason.length < 5) {
      setError("Raison requise (5 caractères min)");
      return;
    }
    setBusy(t.id);
    setError(null);
    const res = await fetch(`/api/admin/tenants/${t.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur");
      return;
    }
    router.refresh();
  }

  async function reactivate(t: TenantRow) {
    if (!confirm(`Réactiver l'accès de ${t.name} ?`)) return;
    setBusy(t.id);
    setError(null);
    const res = await fetch(`/api/admin/tenants/${t.id}/reactivate`, {
      method: "POST",
    });
    setBusy(null);
    if (!res.ok) {
      setError("Erreur réactivation");
      return;
    }
    router.refresh();
  }

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      {error ? (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-white/45">
            <tr className="border-b" style={{ borderColor: "#334155" }}>
              <th className="px-4 py-2 font-semibold">Tenant</th>
              <th className="px-4 py-2 font-semibold">Plan</th>
              <th className="px-4 py-2 font-semibold">Statut</th>
              <th className="px-4 py-2 font-semibold">Users</th>
              <th className="px-4 py-2 font-semibold">Chantiers</th>
              <th className="px-4 py-2 font-semibold text-right">MRR</th>
              <th className="px-4 py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/50">
                  Aucun tenant ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const sc = STATUS_CFG[t.status] ?? STATUS_CFG.ACTIVE;
                const isSuspended = t.status === "SUSPENDED";
                const isDemo = t.status === "DEMO";
                const rowBg = isSuspended
                  ? "rgba(239,68,68,0.06)"
                  : isDemo
                    ? "rgba(34,211,238,0.04)"
                    : undefined;
                return (
                  <tr
                    key={t.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "#1F2937", background: rowBg }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded bg-cyan-400/15 text-[10px] font-bold uppercase text-cyan-300">
                          {t.name.charAt(0)}
                          {t.name.charAt(1)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white">{t.name}</div>
                          <div className="text-[10px] text-white/50">
                            {t.subdomain ?? `${t.slug}.terpgroup.com`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {t.planName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                      {isSuspended && t.suspensionReason ? (
                        <div className="mt-0.5 line-clamp-1 text-[10px] text-rose-300/80">
                          {t.suspensionReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/80">
                      {t.usersCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/80">
                      {t.sitesCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-cyan-300">
                      {t.monthlyPriceXAF
                        ? `${Math.round(t.monthlyPriceXAF / 1_000).toLocaleString("fr-FR")} K`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`https://${t.subdomain ?? `${t.slug}.terpgroup.com`}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
                          aria-label="Ouvrir"
                          title="Ouvrir le tenant"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {isSuspended ? (
                          <button
                            type="button"
                            disabled={busy === t.id}
                            onClick={() => reactivate(t)}
                            className={clsx(
                              "rounded px-2 py-1 text-[11px] font-semibold",
                              "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
                              busy === t.id && "opacity-60",
                            )}
                          >
                            <Play className="inline h-3 w-3" /> Réactiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === t.id}
                            onClick={() => suspend(t)}
                            className={clsx(
                              "rounded px-2 py-1 text-[11px] font-semibold",
                              "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
                              busy === t.id && "opacity-60",
                            )}
                          >
                            <Pause className="inline h-3 w-3" /> Suspendre
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
