"use client";

interface LogRow {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetDescription: string | null;
  tenantName: string | null;
  ipAddress: string;
  justification: string | null;
}

const ACTION_CFG: Record<string, { label: string; color: string }> = {
  AUTH_MFA_SUCCESS: { label: "Login MFA", color: "#22C55E" },
  AUTH_MFA_FAILURE: { label: "Login échec", color: "#EF4444" },
  TENANT_PROVISIONED: { label: "Provisionnement", color: "#22D3EE" },
  TENANT_SUSPENDED: { label: "Suspension", color: "#F59E0B" },
  TENANT_REACTIVATED: { label: "Réactivation", color: "#22C55E" },
  TENANT_DELETED: { label: "Suppression", color: "#EF4444" },
  CROSS_TENANT_ACCESS: { label: "Cross-tenant", color: "#A78BFA" },
  CONFIG_MODIFIED: { label: "Config", color: "#CBD5E1" },
  FEATURE_FLAG_TOGGLED: { label: "Feature flag", color: "#A78BFA" },
  INVOICE_ISSUED: { label: "Facture émise", color: "#22D3EE" },
  PAYMENT_RECORDED: { label: "Paiement", color: "#22C55E" },
  ADMIN_CREATED: { label: "Admin créé", color: "#22D3EE" },
  ADMIN_REVOKED: { label: "Admin révoqué", color: "#EF4444" },
  GDPR_EXPORT: { label: "Export GDPR", color: "#F59E0B" },
  DATA_EXPORTED: { label: "Données exportées", color: "#F59E0B" },
  INTEGRATION_CONFIGURED: { label: "Intégration", color: "#22D3EE" },
};

export function AuditLogTable({ rows }: { rows: LogRow[] }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-white/45">
            <tr className="border-b" style={{ borderColor: "#334155" }}>
              <th className="px-4 py-2">Horodatage</th>
              <th className="px-4 py-2">Acteur</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Cible</th>
              <th className="px-4 py-2">Tenant</th>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Justification</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/50">
                  Aucune entrée dans le journal d&apos;audit.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const meta = ACTION_CFG[r.action] ?? { label: r.action, color: "#CBD5E1" };
                return (
                  <tr
                    key={r.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "#1F2937" }}
                  >
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-white/65">
                      {new Date(r.timestamp).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-white">{r.actorEmail}</div>
                      <div className="text-[10px] text-white/45">{r.actorRole ?? "—"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: `${meta.color}22`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/70">
                      <div>{r.targetDescription ?? r.targetType}</div>
                      <div className="text-[10px] text-white/45">{r.targetType}</div>
                    </td>
                    <td className="px-4 py-2 text-white/70">{r.tenantName ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-white/55">
                      {r.ipAddress}
                    </td>
                    <td className="px-4 py-2 text-white/55 max-w-[200px] truncate">
                      {r.justification ?? "—"}
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
