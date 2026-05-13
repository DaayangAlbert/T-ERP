"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Shield } from "lucide-react";
import { clsx } from "clsx";

interface AdminUser {
  id: string;
  employeeId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  position: string | null;
  assignedSiteIds: string[];
  assignedSites: Array<{ id: string; code: string; name: string }>;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", q, role, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/users?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: AdminUser[]; total: number }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-config-users">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Configuration · Utilisateurs</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Gestion des comptes, rôles et périmètres chantiers — workflow promotion auditée.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/promotions"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <Shield className="h-3.5 w-3.5" /> Promotions
          </Link>
          <Link
            href="/securite"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvel utilisateur
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche nom, email, matricule..."
              className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px] outline-none focus:border-primary-400"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
          >
            <option value="">Tous les rôles</option>
            <option value="DG">DG</option>
            <option value="DAF">DAF</option>
            <option value="ACCOUNTANT">Comptable</option>
            <option value="HR">RH</option>
            <option value="TECH_DIRECTOR">Directeur technique</option>
            <option value="WORKS_DIRECTOR">Directeur travaux</option>
            <option value="WORKS_MANAGER">Conducteur travaux</option>
            <option value="SITE_MANAGER">Chef chantier</option>
            <option value="EMPLOYEE">Employé</option>
            <option value="WORKER">Ouvrier</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
          >
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Rôle</th>
                    <th className="px-3 py-2">Périmètre</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Dernière connexion</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((u) => (
                    <tr key={u.id} className="border-b border-line hover:bg-surface-alt/40">
                      <td className="px-3 py-2 font-medium text-ink">
                        <Link href={`/admin/users/${u.id}`} className="hover:text-primary-700">
                          {u.firstName} {u.lastName}
                          {u.position && <span className="ml-2 text-ink-3">— {u.position}</span>}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-ink-2">{u.email}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-2">
                        {u.assignedSites.length === 0 ? (
                          <span className="italic text-ink-3">Vue globale</span>
                        ) : (
                          <span>{u.assignedSites.map((s) => s.code).join(", ")}</span>
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
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-ink-3">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {data?.items.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="block rounded-lg border border-line bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink">{u.firstName} {u.lastName}</div>
                      <div className="text-[12px] text-ink-3">{u.email}</div>
                    </div>
                    <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                      {u.role}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] text-ink-2">
                    {u.assignedSites.length === 0 ? "Vue globale" : `Périmètre : ${u.assignedSites.map((s) => s.code).join(", ")}`}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
