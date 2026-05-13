"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertOctagon, Clock } from "lucide-react";

export interface IncidentRow {
  id: string;
  reference: string;
  title: string;
  description: string;
  severity: "P1_CRITICAL" | "P2_MAJOR" | "P3_MINOR" | "P4_INFO";
  status: "OPEN" | "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED" | "CLOSED";
  affectedTenants: string[];
  module: string | null;
  usersImpacted: number | null;
  detectedAt: string;
  resolvedAt: string | null;
}

const SEV_CFG: Record<
  IncidentRow["severity"],
  { label: string; border: string; chipBg: string; chipColor: string }
> = {
  P1_CRITICAL: { label: "P1 · Critical", border: "#EF4444", chipBg: "rgba(239,68,68,0.18)", chipColor: "#FCA5A5" },
  P2_MAJOR: { label: "P2 · Major", border: "#F59E0B", chipBg: "rgba(245,158,11,0.18)", chipColor: "#FCD34D" },
  P3_MINOR: { label: "P3 · Minor", border: "#22D3EE", chipBg: "rgba(34,211,238,0.18)", chipColor: "#67E8F9" },
  P4_INFO: { label: "P4 · Info", border: "#94A3B8", chipBg: "rgba(148,163,184,0.18)", chipColor: "#CBD5E1" },
};

const STATUS_OPTIONS: Array<{ value: IncidentRow["status"]; label: string }> = [
  { value: "OPEN", label: "Ouvert" },
  { value: "INVESTIGATING", label: "Investigation" },
  { value: "IDENTIFIED", label: "Cause identifiée" },
  { value: "MONITORING", label: "Surveillance" },
  { value: "RESOLVED", label: "Résolu" },
  { value: "CLOSED", label: "Clôturé" },
];

export function IncidentsList({ rows }: { rows: IncidentRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function changeStatus(inc: IncidentRow, status: IncidentRow["status"]) {
    setBusy(inc.id);
    const resolution =
      status === "RESOLVED" || status === "CLOSED"
        ? prompt(`Résolution pour ${inc.reference} ?`) ?? undefined
        : undefined;
    await fetch(`/api/admin/monitoring/incidents/${inc.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolution }),
    });
    setBusy(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <section
        className="rounded-xl border p-6 text-center"
        style={{ background: "#1E293B", borderColor: "#334155" }}
      >
        <p className="text-sm text-emerald-300">
          ✓ Aucun incident à afficher. Tout est nominal.
        </p>
      </section>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((inc) => {
        const cfg = SEV_CFG[inc.severity];
        const ago = relativeTime(new Date(inc.detectedAt));
        return (
          <li
            key={inc.id}
            className="rounded-xl border p-4"
            style={{
              background: "#1E293B",
              borderColor: "#334155",
              borderLeft: `4px solid ${cfg.border}`,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: cfg.chipBg, color: cfg.chipColor }}
                  >
                    {cfg.label}
                  </span>
                  <span className="font-mono text-[10px] text-white/55">
                    {inc.reference}
                  </span>
                  <span className="text-[10px] text-white/45">
                    <Clock className="inline h-3 w-3" /> détecté {ago}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">{inc.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-white/65">
                  {inc.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
                  {inc.module ? <span>Module : <strong className="text-white/80">{inc.module}</strong></span> : null}
                  {inc.usersImpacted ? <span>{inc.usersImpacted} utilisateurs impactés</span> : null}
                  {inc.affectedTenants.length > 0 ? (
                    <span>{inc.affectedTenants.length} tenant{inc.affectedTenants.length > 1 ? "s" : ""}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <select
                  value={inc.status}
                  disabled={busy === inc.id}
                  onChange={(e) => changeStatus(inc, e.target.value as IncidentRow["status"])}
                  className={clsx(
                    "rounded-md border bg-transparent px-2 py-1 text-[11px] text-white",
                    busy === inc.id && "opacity-60",
                  )}
                  style={{ background: "#0F172A", borderColor: "#334155" }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {inc.resolvedAt ? (
                  <span className="text-[10px] text-emerald-300">
                    Résolu {relativeTime(new Date(inc.resolvedAt))}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

void AlertOctagon;
