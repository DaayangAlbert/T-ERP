"use client";

import { useState } from "react";
import { Users, MapPin, Globe, SlidersHorizontal } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useDafAccountants, type AccountantItem } from "@/hooks/useDafAccountants";
import { AccountantSitesModal } from "./AccountantSitesModal";

export function AccountantsAssignSection() {
  const canManage = useAccess(MODULES.DAF).canEdit;
  const { data, isLoading, isError } = useDafAccountants();
  const [editing, setEditing] = useState<AccountantItem | null>(null);

  if (isError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Erreur de chargement des comptables.
      </section>
    );
  }

  const sites = data?.sites ?? [];
  const siteCodeById = new Map(sites.map((s) => [s.id, s.code]));

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-primary-600" /> Affectation des comptables
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Définissez le périmètre de chantiers de chaque comptable. Sans périmètre, le comptable a une vue Direction (tous chantiers).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-alt" />)}
        </div>
      ) : !data || data.accountants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-ink-3">
          Aucun comptable dans ce tenant.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.accountants.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{a.firstName} {a.lastName}</span>
                  {a.isDirection ? (
                    <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                      <Globe className="h-3 w-3" /> Direction · tous chantiers
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <MapPin className="h-3 w-3" /> {a.assignedSiteIds.length} chantier{a.assignedSiteIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{a.position ?? a.email}</p>
                {!a.isDirection && a.assignedSiteIds.length > 0 && (
                  <p className="mt-1 truncate font-mono text-[10.5px] text-ink-3">
                    {a.assignedSiteIds.map((id) => siteCodeById.get(id) ?? "?").join(" · ")}
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Gérer le périmètre
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <AccountantSitesModal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          accountant={editing}
          sites={sites}
        />
      )}
    </section>
  );
}
