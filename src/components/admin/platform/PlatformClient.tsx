"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

export interface PlanCard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceXAF: number;
  maxUsers: number;
  maxSites: number;
  maxStorageGb: number;
  enabledModules: string[];
  hasWhatsAppBusiness: boolean;
  hasJobPortal: boolean;
  hasSgModule: boolean;
  supportSlaHours: number;
  isRecommended: boolean;
  active: boolean;
  tenantsCount: number;
}

export interface IntegrationCard {
  id: string;
  code: string;
  name: string;
  provider: string;
  status: "ACTIVE" | "DEGRADED" | "DOWN" | "MAINTENANCE" | "DEPRECATED";
  apiVersion: string | null;
  lastHealthCheckAt: string | null;
}

const INT_CFG: Record<
  IntegrationCard["status"],
  { label: string; icon: typeof CheckCircle2; bg: string; color: string }
> = {
  ACTIVE: { label: "Active", icon: CheckCircle2, bg: "rgba(34,197,94,0.18)", color: "#86EFAC" },
  DEGRADED: { label: "Dégradée", icon: AlertTriangle, bg: "rgba(245,158,11,0.18)", color: "#FCD34D" },
  DOWN: { label: "Down", icon: XCircle, bg: "rgba(239,68,68,0.22)", color: "#FCA5A5" },
  MAINTENANCE: { label: "Maintenance", icon: RefreshCw, bg: "rgba(34,211,238,0.18)", color: "#67E8F9" },
  DEPRECATED: { label: "Dépréciée", icon: XCircle, bg: "rgba(148,163,184,0.18)", color: "#CBD5E1" },
};

function fmtMoney(xaf: number): string {
  if (xaf >= 1_000_000) return `${(xaf / 1_000_000).toFixed(2)} M`;
  return `${Math.round(xaf / 1_000).toLocaleString("fr-FR")} K`;
}

export function PricingPlansCards({ plans }: { plans: PlanCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
          className={clsx(
            "relative rounded-xl border p-5",
            !p.active && "opacity-60",
          )}
          style={{
            background: "#1E293B",
            borderColor: p.isRecommended ? "#22D3EE" : "#334155",
            boxShadow: p.isRecommended ? "0 0 0 1px #22D3EE" : undefined,
          }}
        >
          {p.isRecommended ? (
            <span className="absolute -top-3 right-4 rounded-full bg-cyan-400 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0F172A]">
              Recommandé
            </span>
          ) : null}
          <h3 className="text-lg font-bold text-white">{p.name}</h3>
          <p className="text-xs text-white/60">{p.description}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-cyan-300">{fmtMoney(p.monthlyPriceXAF)}</span>
            <span className="text-xs text-white/50">XAF / mois</span>
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-white/70">
            <li>• {p.maxUsers} utilisateurs max</li>
            <li>• {p.maxSites} chantiers max</li>
            <li>• {p.maxStorageGb} Go stockage</li>
            <li>• {p.enabledModules.length} modules activés</li>
            {p.hasWhatsAppBusiness ? <li>✓ WhatsApp Business</li> : null}
            {p.hasJobPortal ? <li>✓ Portail recrutement</li> : null}
            {p.hasSgModule ? <li>✓ Module Secrétariat Général</li> : null}
            <li>• Support {p.supportSlaHours}h SLA</li>
          </ul>
          <div className="mt-4 border-t pt-3 text-[11px] text-white/55" style={{ borderColor: "#334155" }}>
            {p.tenantsCount} tenants sur ce plan
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntegrationsGrid({
  integrations,
}: {
  integrations: IntegrationCard[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function testHealth(id: string) {
    setBusy(id);
    await fetch(`/api/admin/platform/integrations/${id}/test`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {integrations.map((i) => {
        const cfg = INT_CFG[i.status];
        const Icon = cfg.icon;
        return (
          <div
            key={i.id}
            className="rounded-xl border p-4"
            style={{ background: "#1E293B", borderColor: "#334155" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{i.name}</div>
                <div className="text-[11px] text-white/55">{i.provider}</div>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <div className="mt-3 text-[10px] text-white/45">
              {i.lastHealthCheckAt
                ? `Vérifié ${new Date(i.lastHealthCheckAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Jamais vérifié"}
            </div>
            <button
              type="button"
              onClick={() => testHealth(i.id)}
              disabled={busy === i.id}
              className="mt-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/5 disabled:opacity-60"
              style={{ borderColor: "#334155" }}
            >
              <RefreshCw className={clsx("h-3 w-3", busy === i.id && "animate-spin")} />
              {busy === i.id ? "Test…" : "Health check"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
