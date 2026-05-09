"use client";

import { AlertTriangle, LogOut, Monitor } from "lucide-react";
import { useSessions, useRevokeSession } from "@/hooks/useSecurity";
import { formatDate, formatRelativeDate } from "@/lib/format";
import { clsx } from "clsx";

export function SessionsTable() {
  const { data, isLoading } = useSessions();
  const revoke = useRevokeSession();

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-white p-3 text-[12.5px] text-ink-3 shadow-card">
        Sessions actives sur l'ensemble des utilisateurs du tenant. Les sessions{" "}
        <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">suspectes</span>{" "}
        sont mises en évidence (IP inhabituelle ou Tor).
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Utilisateur</th>
              <th className="py-2 text-left">IP</th>
              <th className="py-2 text-left">Localisation</th>
              <th className="py-2 text-left">Navigateur</th>
              <th className="py-2 text-left">Dernière activité</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-3">
                  Chargement…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-3">
                  Aucune session active.
                </td>
              </tr>
            ) : (
              data.items.map((s) => (
                <tr key={s.id} className={clsx("border-t border-line hover:bg-surface-alt", s.suspicious && "bg-danger/5")}>
                  <td className="py-2 pl-3">
                    <div className="flex items-center gap-1.5">
                      {s.suspicious && <AlertTriangle className="h-3.5 w-3.5 text-danger" />}
                      <span className="font-medium text-ink">{s.user.name}</span>
                      <span className="text-[10.5px] text-ink-3">{s.user.role}</span>
                    </div>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-ink-3">{s.ipAddress}</td>
                  <td className={clsx("py-2", s.suspicious ? "text-danger font-semibold" : "text-ink-2")}>{s.location}</td>
                  <td className="py-2 max-w-[180px] truncate text-[11.5px] text-ink-3">
                    <Monitor className="mr-1 inline h-3 w-3" />
                    {s.userAgent?.match(/(Chrome|Safari|Firefox)\S*/)?.[0] ?? "—"}
                  </td>
                  <td className="py-2 text-[11.5px] text-ink-3">
                    {formatRelativeDate(s.lastActivityAt)} <span className="opacity-60">({formatDate(s.lastActivityAt, "dd/MM HH:mm")})</span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Déconnecter la session de ${s.user.name} ?`)) revoke.mutate(s.id);
                      }}
                      className="inline-flex h-7 items-center gap-1 rounded border border-line bg-white px-2 text-[11.5px] text-ink-3 hover:border-rose-300 hover:text-rose-700"
                    >
                      <LogOut className="h-3 w-3" /> Déconnecter
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
