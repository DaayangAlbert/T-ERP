import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import {
  PricingPlansCards,
  IntegrationsGrid,
  type PlanCard,
  type IntegrationCard,
} from "@/components/admin/platform/PlatformClient";

export const dynamic = "force-dynamic";

interface Payload {
  plans: PlanCard[];
  integrations: IntegrationCard[];
  featureFlags: Array<{
    id: string;
    flagKey: string;
    enabled: boolean;
    enabledBy: string;
    enabledAt: string;
    expiresAt: string | null;
    tenant: { slug: string; name: string };
  }>;
}

async function fetchPlatform(): Promise<Payload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/platform`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Platform API ${res.status}`);
  return res.json();
}

export default async function AdminPlatformPage() {
  requireAdminSession();
  const data = await fetchPlatform();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-white">Configuration plateforme</h1>
        <p className="text-xs text-white/60">
          Plans tarifaires · intégrations globales · feature flags
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Plans tarifaires ({data.plans.length})
        </h2>
        <PricingPlansCards plans={data.plans} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Intégrations globales ({data.integrations.length})
        </h2>
        <IntegrationsGrid integrations={data.integrations} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Feature flags par tenant ({data.featureFlags.length})
        </h2>
        <div
          className="overflow-hidden rounded-xl border"
          style={{ background: "#1E293B", borderColor: "#334155" }}
        >
          {data.featureFlags.length === 0 ? (
            <p className="p-6 text-center text-xs text-white/55">
              Aucun feature flag activé pour le moment.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-white/45">
                <tr className="border-b" style={{ borderColor: "#334155" }}>
                  <th className="px-4 py-2">Tenant</th>
                  <th className="px-4 py-2">Flag</th>
                  <th className="px-4 py-2">État</th>
                  <th className="px-4 py-2">Activé par</th>
                  <th className="px-4 py-2">Depuis</th>
                </tr>
              </thead>
              <tbody>
                {data.featureFlags.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "#1F2937" }}
                  >
                    <td className="px-4 py-2 font-medium text-white">
                      {f.tenant.name}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-cyan-300">
                      {f.flagKey}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: f.enabled
                            ? "rgba(34,197,94,0.18)"
                            : "rgba(148,163,184,0.18)",
                          color: f.enabled ? "#86EFAC" : "#CBD5E1",
                        }}
                      >
                        {f.enabled ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/70">{f.enabledBy}</td>
                    <td className="px-4 py-2 text-white/55">
                      {new Date(f.enabledAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
