"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuditLog } from "@/hooks/useSecurity";
import { formatDate } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  "user.login": "Connexion",
  "user.logout": "Déconnexion",
  "user.create": "Création utilisateur",
  "user.update": "Modification utilisateur",
  "user.suspend": "Suspension",
  "user.reactivate": "Réactivation",
  "user.reset_password": "Réinit. mot de passe",
  "validation.approve": "Validation approuvée",
  "validation.reject": "Validation rejetée",
  "validation.bulk_approve": "Validation en lot",
  "validation.request_info": "Demande info",
  "config.modules.update": "Modules modifiés",
  "config.paie.update": "Paramètres paie",
  "report.generate": "Rapport généré",
  "report.send": "Rapport diffusé",
  "session.revoke": "Session révoquée",
  "site.update": "Modif chantier",
  "payslip.validate": "Bulletin validé",
};

export function AuditLogTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAuditLog({ page, q: search || undefined });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher dans actions / entités…"
            className="h-9 w-full rounded-md border border-line bg-surface-alt pl-8 pr-3 text-[12.5px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Date</th>
              <th className="py-2 text-left">Utilisateur</th>
              <th className="py-2 text-left">Action</th>
              <th className="py-2 text-left">Entité</th>
              <th className="py-2 pr-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-3">
                  Chargement…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-3">
                  Aucune entrée.
                </td>
              </tr>
            ) : (
              data.items.map((a) => (
                <tr key={a.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono text-[11px] text-ink-3">{formatDate(a.createdAt, "dd/MM HH:mm")}</td>
                  <td className="py-2 text-ink-2">{a.user}</td>
                  <td className="py-2">
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                      {ACTION_LABEL[a.action] ?? a.action}
                    </span>
                  </td>
                  <td className="py-2 text-ink-3">
                    {a.entityType}
                    {a.entityId && <span className="ml-1 font-mono text-[10.5px]">#{a.entityId.slice(-6)}</span>}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink-3">{a.ipAddress ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>
            {data.total} entrées · Page {data.page} / {data.totalPages}
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
    </div>
  );
}
