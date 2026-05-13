import { ShieldCheck, ShieldOff } from "lucide-react";

interface AdminItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  whitelistedIps: string[];
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  canCreateTenants: boolean;
  canSuspendTenants: boolean;
  canDeleteTenants: boolean;
  canManageBilling: boolean;
  canManagePlatformConfig: boolean;
  canViewAllTenantsData: boolean;
  canManageGlobalIntegrations: boolean;
  canViewGlobalAudit: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  CTO: "CTO · Permissions totales",
  SUPPORT_L3: "Support Niveau 3",
  BILLING_ADMIN: "Administrateur facturation",
  COMPLIANCE_OFFICER: "Responsable conformité",
};

export function SuperAdminsList({ admins }: { admins: AdminItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {admins.map((a) => {
        const isActive = a.status === "ACTIVE";
        return (
          <div
            key={a.id}
            className="rounded-xl border p-4"
            style={{
              background: "#1E293B",
              borderColor: isActive ? "#22D3EE40" : "#EF444440",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400 text-sm font-bold text-[#0F172A]">
                {a.firstName.charAt(0)}
                {a.lastName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {a.firstName} {a.lastName}
                  </span>
                  {isActive ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5 text-rose-400" />
                  )}
                </div>
                <div className="text-[11px] text-cyan-300">{a.email}</div>
                <div className="text-[10px] text-white/55">{ROLE_LABEL[a.role] ?? a.role}</div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: isActive ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                  color: isActive ? "#86EFAC" : "#FCA5A5",
                }}
              >
                {a.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <Field
                label="MFA"
                value={a.mfaEnabled ? "✓ Activé" : "✗ Désactivé"}
                color={a.mfaEnabled ? "#86EFAC" : "#FCA5A5"}
              />
              <Field
                label="IPs whitelist"
                value={a.whitelistedIps.length > 0 ? `${a.whitelistedIps.length} IP(s)` : "—"}
                color="#CBD5E1"
              />
              <Field
                label="Dernier login"
                value={
                  a.lastLoginAt
                    ? new Date(a.lastLoginAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Jamais"
                }
                color="#CBD5E1"
              />
              <Field
                label="IP origine"
                value={a.lastLoginIp ?? "—"}
                color="#CBD5E1"
              />
            </div>
            <div className="mt-3 border-t pt-2" style={{ borderColor: "#334155" }}>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-white/45">
                Permissions actives
              </p>
              <div className="flex flex-wrap gap-1">
                {permFlags(a).map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function permFlags(a: AdminItem): string[] {
  const out: string[] = [];
  if (a.canCreateTenants) out.push("Create tenants");
  if (a.canSuspendTenants) out.push("Suspend");
  if (a.canDeleteTenants) out.push("Delete");
  if (a.canManageBilling) out.push("Billing");
  if (a.canManagePlatformConfig) out.push("Platform config");
  if (a.canViewAllTenantsData) out.push("View all data");
  if (a.canManageGlobalIntegrations) out.push("Integrations");
  if (a.canViewGlobalAudit) out.push("Audit");
  return out;
}

function Field({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="font-medium" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
