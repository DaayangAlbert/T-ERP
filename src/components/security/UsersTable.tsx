"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Plus, Shield, Key, Pause, Play } from "lucide-react";
import { Role, UserStatus } from "@prisma/client";
import { useUsers, useSuspendUser, useResetUserPassword } from "@/hooks/useSecurity";
import { UserFormModal } from "./UserFormModal";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

const ROLE_OPTIONS = Object.values(Role);

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [tf, setTf] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useUsers({
    page,
    q: search || undefined,
    role: role || undefined,
    status: status || undefined,
    twoFactor: tf || undefined,
  });
  const suspend = useSuspendUser();
  const resetPwd = useResetUserPassword();

  const onReset = async (id: string, name: string) => {
    if (!confirm(`Réinitialiser le mot de passe de ${name} ?`)) return;
    const res = await resetPwd.mutateAsync(id);
    if (res.tempPassword) {
      alert(`Mot de passe temporaire (à transmettre manuellement) :\n\n${res.tempPassword}\n\n${res.note}`);
    } else {
      alert(res.note);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, email, matricule…"
            className="h-9 w-full rounded-md border border-line bg-surface-alt pl-8 pr-3 text-[12.5px]"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous rôles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          <option value={UserStatus.ACTIVE}>Actifs</option>
          <option value={UserStatus.SUSPENDED}>Suspendus</option>
          <option value={UserStatus.INACTIVE}>Inactifs</option>
        </select>
        <select
          value={tf}
          onChange={(e) => {
            setTf(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">2FA tous</option>
          <option value="1">2FA activée</option>
          <option value="0">2FA désactivée</option>
        </select>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvel utilisateur
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Matricule</th>
              <th className="py-2 text-left">Nom</th>
              <th className="py-2 text-left">Email</th>
              <th className="py-2 text-left">Rôle</th>
              <th className="py-2 text-left">Poste</th>
              <th className="py-2 text-center">Statut</th>
              <th className="py-2 text-center">2FA</th>
              <th className="py-2 text-left">Dernière connexion</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-3">
                  Chargement…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-3">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              data.items.map((u) => (
                <tr key={u.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono text-[11px]">{u.employeeId ?? "—"}</td>
                  <td className="py-2 font-medium text-ink">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="py-2 font-mono text-[11.5px] text-ink-3">{u.email}</td>
                  <td className="py-2">
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2 text-ink-2">{u.position ?? "—"}</td>
                  <td className="py-2 text-center">
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                        u.status === "ACTIVE"
                          ? "bg-success/10 text-success"
                          : u.status === "SUSPENDED"
                          ? "bg-danger/10 text-danger"
                          : "bg-ink-3/10 text-ink-3"
                      )}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={
                        u.twoFactorEnabled
                          ? "inline-grid h-4 w-4 place-items-center rounded-full bg-success text-[10px] text-white"
                          : "inline-block text-ink-3"
                      }
                    >
                      {u.twoFactorEnabled ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="py-2 text-[11.5px] text-ink-3">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Jamais"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => onReset(u.id, `${u.firstName} ${u.lastName}`)}
                        title="Réinitialiser mot de passe"
                        className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Key className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => suspend.mutate(u.id)}
                        title={u.status === "SUSPENDED" ? "Réactiver" : "Suspendre"}
                        className={clsx(
                          "grid h-7 w-7 place-items-center rounded",
                          u.status === "SUSPENDED"
                            ? "text-success hover:bg-success/10"
                            : "text-danger hover:bg-danger/10"
                        )}
                      >
                        {u.status === "SUSPENDED" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        title="2FA"
                        className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>
            {data.total} utilisateurs · Page {data.page} / {data.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="grid h-8 w-8 place-items-center rounded border border-line bg-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="grid h-8 w-8 place-items-center rounded border border-line bg-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <UserFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
