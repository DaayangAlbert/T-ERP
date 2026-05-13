interface ActivityRow {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetDescription: string | null;
  ipAddress: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  AUTH_MFA_SUCCESS: { label: "Login MFA", color: "#22C55E" },
  AUTH_MFA_FAILURE: { label: "Login MFA échec", color: "#EF4444" },
  TENANT_PROVISIONED: { label: "Tenant provisionné", color: "#22D3EE" },
  TENANT_SUSPENDED: { label: "Tenant suspendu", color: "#F59E0B" },
  CROSS_TENANT_ACCESS: { label: "Accès cross-tenant", color: "#A78BFA" },
  CONFIG_MODIFIED: { label: "Config modifiée", color: "#CBD5E1" },
  INVOICE_ISSUED: { label: "Facture émise", color: "#22D3EE" },
  PAYMENT_RECORDED: { label: "Paiement enregistré", color: "#22C55E" },
  FEATURE_FLAG_TOGGLED: { label: "Flag toggle", color: "#A78BFA" },
  ADMIN_CREATED: { label: "Admin créé", color: "#22D3EE" },
  ADMIN_REVOKED: { label: "Admin révoqué", color: "#EF4444" },
  GDPR_EXPORT: { label: "Export GDPR", color: "#F59E0B" },
};

export function RecentActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <header className="border-b px-4 py-3" style={{ borderColor: "#334155" }}>
        <h3 className="text-sm font-semibold text-white">
          Activité récente · 24h
        </h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-white/45">
            <tr className="border-b" style={{ borderColor: "#334155" }}>
              <th className="px-4 py-2 font-semibold">Horodatage</th>
              <th className="px-4 py-2 font-semibold">Acteur</th>
              <th className="px-4 py-2 font-semibold">Action</th>
              <th className="px-4 py-2 font-semibold">Cible</th>
              <th className="px-4 py-2 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                  Aucune activité enregistrée.
                </td>
              </tr>
            ) : (
              rows.slice(0, 8).map((r) => {
                const meta = ACTION_LABELS[r.action] ?? {
                  label: r.action,
                  color: "#CBD5E1",
                };
                return (
                  <tr
                    key={r.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "#1F2937" }}
                  >
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-white/70">
                      {new Date(r.timestamp).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-white">{r.actorEmail}</td>
                    <td className="px-4 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `${meta.color}22`,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/70">
                      {r.targetDescription ?? r.targetType}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-white/55">
                      {r.ipAddress}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
