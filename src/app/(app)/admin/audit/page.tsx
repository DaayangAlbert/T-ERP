"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: { firstName: string; lastName: string; email: string; role: string } | null;
}

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit", actionFilter, entityType, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (entityType) params.set("entityType", entityType);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/audit?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: AuditEntry[]; total: number; totalPages: number }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-config-audit">
      <header className="border-b border-line pb-3">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          <ScrollText className="h-5 w-5 text-primary-600" /> Journal d'audit
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Toutes les actions sensibles tracées — accès réservé DG / Informaticien d'entreprise.
        </p>
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Action (ex: promotion, user.update)"
              className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px] outline-none focus:border-primary-400"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
          >
            <option value="">Toutes entités</option>
            <option value="User">Utilisateur</option>
            <option value="RolePromotionRequest">Promotion</option>
            <option value="Entry">Écriture comptable</option>
            <option value="SupplierInvoice">Facture frns</option>
            <option value="ProgressBilling">Situation travaux</option>
            <option value="Site">Chantier</option>
          </select>
          <div className="text-right text-[12px] text-ink-3">
            {data ? `${data.total} entrée${data.total > 1 ? "s" : ""}` : ""}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Acteur</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Cible</th>
                    <th className="px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((a) => (
                    <tr key={a.id} className="border-b border-line">
                      <td className="px-3 py-2 text-ink-3">{new Date(a.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="px-3 py-2 text-ink-2">
                        {a.user ? `${a.user.firstName} ${a.user.lastName} (${a.user.role})` : "Système"}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">{a.action}</td>
                      <td className="px-3 py-2 text-ink-2">
                        {a.entityType ? `${a.entityType}${a.entityId ? ` #${a.entityId.slice(0, 8)}` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-ink-3">{a.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {data?.items.map((a) => (
                <div key={a.id} className="rounded-lg border border-line bg-white p-3 text-[12.5px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{a.action}</span>
                    <span className="text-[11px] text-ink-3">
                      {new Date(a.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="mt-1 text-ink-2">
                    {a.user ? `${a.user.firstName} ${a.user.lastName}` : "Système"}
                    {a.entityType && <span className="ml-2 text-ink-3">· {a.entityType}</span>}
                  </div>
                </div>
              ))}
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line p-3 text-[12px] text-ink-3">
                <span>Page {page} / {data.totalPages}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border border-line px-2 py-1 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
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
