import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  CheckCircle2,
  XCircle,
  KeyRound,
  Globe,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface UserDetailPayload {
  user: {
    id: string;
    employeeId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    status: string;
    position: string | null;
    category: string | null;
    contractType: string | null;
    hireDate: string | null;
    twoFactorEnabled: boolean;
    assignedSiteIds: string[];
    lastLoginAt: string | null;
    createdAt: string;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManageTenantSettings: boolean;
    canManageIntegrations: boolean;
    canViewTechnicalLogs: boolean;
  };
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    location: string | null;
    lastActivityAt: string;
    expiresAt: string;
    suspicious: boolean;
  }>;
  auditLog: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    ipAddress: string | null;
  }>;
}

async function fetchUser(id: string): Promise<UserDetailPayload | null> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/it/users/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`IT users API ${res.status}`);
  return res.json();
}

const ROLE_LABELS: Record<string, string> = {
  DG: "Directeur Général",
  DAF: "DAF",
  SECRETARY_GENERAL: "Secrétaire Général(e)",
  HR: "Responsable RH",
  TECH_DIRECTOR: "Directeur Technique",
  WORKS_DIRECTOR: "Directeur de Travaux",
  WORKS_MANAGER: "Conducteur de Travaux",
  SITE_MANAGER: "Chef de Chantier",
  WORKER: "Ouvrier",
  ACCOUNTANT: "Comptable",
  LOGISTICS: "Logisticien",
  WAREHOUSE: "Magasinier",
  ARCHIVIST: "Référent Documentaire",
  EMPLOYEE: "Employé",
  CANDIDATE: "Candidat",
  TENANT_ADMIN: "Administrateur IT",
  SUPER_ADMIN: "Super-Admin Anthropic",
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Actif", cls: "bg-emerald-100 text-emerald-700" },
  SUSPENDED: { label: "Suspendu", cls: "bg-rose-100 text-rose-700" },
  ARCHIVED: { label: "Archivé", cls: "bg-ink-3/15 text-ink-3" },
};

export default async function UserDetailPage({
  params,
}: {
  params: { tenantSlug: string; id: string };
}) {
  const data = await fetchUser(params.id);
  if (!data) notFound();
  const { user, sessions, auditLog } = data;
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const status = STATUS_CFG[user.status] ?? STATUS_CFG.ACTIVE;

  const isItAdmin = user.role === "TENANT_ADMIN";

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${params.tenantSlug}/informatique/users`}
          className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </Link>
      </div>

      {/* En-tête */}
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-brand">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">{fullName}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}
              >
                {status.label}
              </span>
              {user.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                  <Shield className="h-3 w-3" /> MFA actif
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-sm text-ink-2">
              {ROLE_LABELS[user.role] ?? user.role}
              {user.position ? ` · ${user.position}` : ""}
              {user.employeeId ? ` · ${user.employeeId}` : ""}
            </div>
            <div className="mt-3 grid gap-3 text-xs text-ink-2 sm:grid-cols-2 lg:grid-cols-4">
              <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={user.email} />
              <Field
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Téléphone"
                value={user.phone ?? "—"}
              />
              <Field
                icon={<Briefcase className="h-3.5 w-3.5" />}
                label="Contrat"
                value={user.contractType ?? "—"}
              />
              <Field
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Embauche"
                value={
                  user.hireDate
                    ? new Date(user.hireDate).toLocaleDateString("fr-FR")
                    : "—"
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pouvoirs spéciaux — visible uniquement si user TENANT_ADMIN */}
      {isItAdmin ? (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-ink">
            Pouvoirs spéciaux IT_ADMIN
          </h2>
          <p className="mt-1 text-xs text-ink-3">
            Octroyés par le DG. Le flag <code>canManageRoles</code> est réservé au
            workflow de promotion (cf /admin/promotions).
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Flag value={user.canManageUsers} label="Gérer utilisateurs" />
            <Flag value={user.canManageRoles} label="Gérer rôles (DG)" />
            <Flag value={user.canManageTenantSettings} label="Paramètres tenant" />
            <Flag value={user.canManageIntegrations} label="Intégrations" />
            <Flag value={user.canViewTechnicalLogs} label="Logs techniques" />
            <Flag
              // canReadAllDocuments est dans le model User mais non sélectionné
              // par l'API — on l'affiche par déduction si TENANT_ADMIN (fusion
              // archiviste mai 2026, voir access-matrix.ts).
              value={true}
              label="Documents transverses (archiviste)"
            />
          </div>
        </section>
      ) : null}

      {/* Sessions actives */}
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">
          Sessions actives ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-xs text-ink-3">Aucune session active.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-xs">
                <Globe className="h-3.5 w-3.5 text-ink-3" />
                <span className="font-mono text-ink-2">{s.ipAddress ?? "—"}</span>
                <span className="text-ink-3">{s.location ?? ""}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-ink-3">
                  <Clock className="h-3 w-3" />
                  {new Date(s.lastActivityAt).toLocaleString("fr-FR")}
                </span>
                {s.suspicious ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    suspect
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink-3">
          Dernière connexion :{" "}
          <span className="font-medium text-ink-2">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString("fr-FR")
              : "Jamais"}
          </span>
        </p>
      </section>

      {/* Journal audit */}
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">
          Activité récente ({auditLog.length})
        </h2>
        {auditLog.length === 0 ? (
          <p className="mt-2 text-xs text-ink-3">Aucune activité enregistrée.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-ink-3">
                <tr className="border-b border-line">
                  <th className="py-2">Date</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Cible</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-b-0">
                    <td className="py-2 text-ink-2">
                      {new Date(a.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2">
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-2 text-ink-2">
                      {a.targetType ?? "—"}
                      {a.targetId ? ` · ${a.targetId.slice(0, 8)}` : ""}
                    </td>
                    <td className="py-2 font-mono text-[11px] text-ink-3">
                      {a.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function Flag({ value, label }: { value: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
        value
          ? "border-emerald-200 bg-emerald-50"
          : "border-line bg-surface-alt opacity-70"
      }`}
    >
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <XCircle className="h-4 w-4 text-ink-3" />
      )}
      <span
        className={`text-xs font-medium ${
          value ? "text-emerald-800" : "text-ink-3"
        }`}
      >
        {label}
      </span>
      <KeyRound className="ml-auto h-3 w-3 text-ink-3/50" />
    </div>
  );
}
