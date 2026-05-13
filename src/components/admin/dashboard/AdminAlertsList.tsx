import Link from "next/link";
import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";

export interface AdminIncidentSummary {
  id: string;
  reference: string;
  title: string;
  severity: "P1_CRITICAL" | "P2_MAJOR" | "P3_MINOR" | "P4_INFO";
  status: string;
  detectedAt: string;
  usersImpacted: number | null;
  affectedTenants: string[];
}

const SEV_CFG: Record<
  AdminIncidentSummary["severity"],
  { label: string; borderColor: string; chipBg: string; chipText: string }
> = {
  P1_CRITICAL: {
    label: "P1 · Critical",
    borderColor: "#EF4444",
    chipBg: "rgba(239,68,68,0.18)",
    chipText: "#FCA5A5",
  },
  P2_MAJOR: {
    label: "P2 · Major",
    borderColor: "#F59E0B",
    chipBg: "rgba(245,158,11,0.18)",
    chipText: "#FCD34D",
  },
  P3_MINOR: {
    label: "P3 · Minor",
    borderColor: "#22D3EE",
    chipBg: "rgba(34,211,238,0.18)",
    chipText: "#67E8F9",
  },
  P4_INFO: {
    label: "P4 · Info",
    borderColor: "#94A3B8",
    chipBg: "rgba(148,163,184,0.18)",
    chipText: "#CBD5E1",
  },
};

export function AdminAlertsList({
  incidents,
}: {
  incidents: AdminIncidentSummary[];
}) {
  return (
    <section
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          🚨 Alertes plateforme
        </h3>
        <Link href="/admin/monitoring" className="text-xs text-cyan-300 hover:text-cyan-200">
          Tout voir →
        </Link>
      </header>
      {incidents.length === 0 ? (
        <p className="text-xs text-white/60">
          ✓ Aucun incident actif. Tous les services nominaux.
        </p>
      ) : (
        <ul className="space-y-2">
          {incidents.map((inc) => {
            const cfg = SEV_CFG[inc.severity];
            const ago = relativeTime(new Date(inc.detectedAt));
            return (
              <li
                key={inc.id}
                className="rounded-md p-3"
                style={{
                  background: "#0F172A",
                  borderLeft: `3px solid ${cfg.borderColor}`,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{inc.title}</div>
                    <div className="mt-0.5 text-[11px] text-white/55">
                      {inc.reference} · détecté {ago}
                      {inc.usersImpacted ? ` · ${inc.usersImpacted} utilisateurs` : ""}
                      {inc.affectedTenants.length > 0
                        ? ` · ${inc.affectedTenants.length} tenant${inc.affectedTenants.length > 1 ? "s" : ""}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    )}
                    style={{ background: cfg.chipBg, color: cfg.chipText }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

void AlertCircle;
