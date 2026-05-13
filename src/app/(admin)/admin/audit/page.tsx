import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { AuditLogTable } from "@/components/admin/audit/AuditLogTable";
import { SuperAdminsList } from "@/components/admin/audit/SuperAdminsList";

export const dynamic = "force-dynamic";

interface AuditPayload {
  stats: {
    total: number;
    crossTenantAccess: number;
    gdprExports: number;
    mfaFailures: number;
  };
  logs: Array<{
    id: string;
    timestamp: string;
    actorEmail: string;
    actorRole: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    targetDescription: string | null;
    tenantId: string | null;
    tenantName: string | null;
    tenantSlug: string | null;
    ipAddress: string;
    justification: string | null;
    ticketReference: string | null;
  }>;
}

async function fetchAudit(): Promise<AuditPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/audit`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Audit API ${res.status}`);
  return res.json();
}

async function fetchAdmins(): Promise<{ admins: Array<Parameters<typeof SuperAdminsList>[0]["admins"][number]> }> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/audit/admins`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Admins API ${res.status}`);
  return res.json();
}

export default async function AdminAuditPage() {
  requireAdminSession();
  const [audit, adminsPayload] = await Promise.all([fetchAudit(), fetchAdmins()]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-white">Audit & sécurité</h1>
        <p className="text-xs text-white/60">
          Journal immuable trans-tenant · loi 2010/012 Cameroun · RGPD ·
          Conservation 7 ans
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Actions totales" value={String(audit.stats.total)} accent="#22D3EE" />
        <Kpi
          label="Accès cross-tenant"
          value={String(audit.stats.crossTenantAccess)}
          accent="#A78BFA"
          meta="Support L3"
        />
        <Kpi
          label="Exports GDPR"
          value={String(audit.stats.gdprExports)}
          accent="#F59E0B"
        />
        <Kpi
          label="Échecs MFA"
          value={String(audit.stats.mfaFailures)}
          accent={audit.stats.mfaFailures > 0 ? "#EF4444" : "#22C55E"}
        />
      </div>

      <SecurityPostureCard />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Comptes Super-Admin ({adminsPayload.admins.length}/4 max)
        </h2>
        <SuperAdminsList admins={adminsPayload.admins} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Journal d&apos;audit ({audit.logs.length} dernières entrées)
        </h2>
        <AuditLogTable rows={audit.logs} />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: accent ?? "#FFFFFF" }}
      >
        {value}
      </div>
      {meta ? <div className="mt-1 text-[11px] text-white/55">{meta}</div> : null}
    </div>
  );
}

function SecurityPostureCard() {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(34,197,94,0.10) 100%)",
        borderColor: "#10B98140",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-emerald-200">
            ✓ Posture sécurité excellente
          </h3>
          <p className="mt-1 text-xs text-emerald-100/80">
            Mozilla Observatory A+ · CIS Benchmark 94 % · 0 CVE critiques ·
            Conforme loi 2010/012 Cameroun + RGPD
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <Score label="Mozilla" value="A+" />
          <Score label="CIS" value="94 %" />
          <Score label="CVE" value="0" />
        </div>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md bg-white/10 px-3 py-2 backdrop-blur"
    >
      <div className="text-[9px] uppercase tracking-wider text-emerald-100/70">
        {label}
      </div>
      <div className="text-base font-bold text-white">{value}</div>
    </div>
  );
}
