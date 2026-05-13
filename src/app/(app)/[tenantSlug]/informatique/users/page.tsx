"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Shield, UserCheck, UserX } from "lucide-react";
import { clsx } from "clsx";

interface ItUser {
  id: string;
  employeeId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  position: string | null;
  twoFactorEnabled: boolean;
  assignedSiteIds: string[];
  lastLoginAt: string | null;
}

interface UsersResponse {
  items: ItUser[];
  total: number;
  totalPages: number;
  kpis: { total: number; active: number; inactive: number; suspended: number; mfaEnabled: number };
}

export default function ItUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [mfa, setMfa] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["it", "users", search, role, status, mfa, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (mfa) params.set("mfa", mfa);
      params.set("page", String(page));
      const res = await fetch(`/api/it/users?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<UsersResponse>;
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Utilisateurs et habilitations</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Gestion des comptes, rôles, MFA, sessions — journalisé dans l'audit log.
          </p>
        </div>
        <Link
          href="/informatique/users/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvel utilisateur
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Comptes actifs" value={data?.kpis.active ?? 0} tone="ok" />
        <Kpi label="MFA activé" value={data?.kpis.mfaEnabled ?? 0} icon={Shield} tone="ok" />
        <Kpi label="Inactifs" value={data?.kpis.inactive ?? 0} tone="warning" />
        <Kpi label="Verrouillés / suspendus" value={data?.kpis.suspended ?? 0} tone="danger" />
      </section>

      <section className="grid gap-2 rounded-xl border border-line bg-white p-3 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche..."
            className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px]"
          />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">Tous rôles</option>
          <option value="DG">DG</option>
          <option value="DAF">DAF</option>
          <option value="HR">RH</option>
          <option value="TECH_DIRECTOR">Direction technique</option>
          <option value="WORKS_DIRECTOR">Directeur travaux</option>
          <option value="WORKS_MANAGER">Conducteur</option>
          <option value="SITE_MANAGER">Chef chantier</option>
          <option value="ACCOUNTANT">Comptable</option>
          <option value="WAREHOUSE">Magasinier</option>
          <option value="LOGISTICS">Logistique</option>
          <option value="EMPLOYEE">Employé</option>
          <option value="WORKER">Ouvrier</option>
          <option value="TENANT_ADMIN">Informaticien</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="SUSPENDED">Suspendu</option>
        </select>
        <select value={mfa} onChange={(e) => setMfa(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">MFA tous</option>
          <option value="1">MFA activé</option>
          <option value="0">Sans MFA</option>
        </select>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Utilisateur</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Rôle</th>
                    <th className="px-3 py-2">MFA</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Dernière connexion</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((u) => (
                    <tr key={u.id} className="border-b border-line hover:bg-surface-alt/40">
                      <td className="px-3 py-2">
                        <Link href={`/informatique/users/${u.id}`} className="font-medium text-ink hover:text-primary-700">
                          {u.firstName} {u.lastName}
                        </Link>
                        {u.position && <div className="text-[11px] text-ink-3">{u.position}</div>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-ink-2">{u.email}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {u.twoFactorEnabled ? (
                          <UserCheck className="h-4 w-4 text-success" />
                        ) : (
                          <UserX className="h-4 w-4 text-ink-3" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            u.status === "ACTIVE" && "bg-success/10 text-success",
                            u.status === "INACTIVE" && "bg-ink-3/10 text-ink-3",
                            u.status === "SUSPENDED" && "bg-danger/10 text-danger"
                          )}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-3">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/informatique/users/${u.id}`}
                          className="text-[11.5px] font-medium text-primary-700 hover:underline"
                        >
                          Éditer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line p-3 text-[12px] text-ink-3">
                <span>{data.items.length} sur {data.total} · page {page} / {data.totalPages}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-line px-2 py-1 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page === data.totalPages}
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    className="rounded border border-line px-2 py-1 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: typeof Shield;
  tone?: "ok" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        {Icon && <Icon className={clsx(
          "h-4 w-4",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          (!tone || tone === "ok") && "text-success"
        )} />}
      </div>
      <div className={clsx(
        "mt-1 text-2xl font-bold",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning",
        (!tone || tone === "ok") && "text-ink"
      )}>
        {value}
      </div>
    </div>
  );
}
