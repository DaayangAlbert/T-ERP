"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

export function SiteSwitcher() {
  const { activeChantier, availableChantiers, switchChantier, isLoading } = useChantier();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (isLoading || !activeChantier) {
    return (
      <div className="mb-3 h-12 animate-pulse rounded-xl border border-line bg-surface-alt" />
    );
  }

  const showChips = availableChantiers.length <= 3;
  const filtered = availableChantiers.filter(
    (s) => !search || s.code.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-3 rounded-xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
          <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-tight text-ink">
              {activeChantier.code} · {activeChantier.name}
            </div>
            <div className="truncate text-[11px] text-ink-3 leading-tight">
              {activeChantier.client} · {activeChantier.progress}% · Livraison{" "}
              {new Date(activeChantier.plannedEndDate).toLocaleDateString("fr-FR")}
            </div>
          </div>

          {showChips && availableChantiers.length > 1 ? (
            <div className="flex gap-1 overflow-x-auto">
              {availableChantiers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => switchChantier(s.id)}
                  style={{ minHeight: 40 }}
                  className={clsx(
                    "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition",
                    s.id === activeChantier.id
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-ink-2 hover:border-ink-3"
                  )}
                >
                  {s.code}
                </button>
              ))}
            </div>
          ) : availableChantiers.length > 1 ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              style={{ minHeight: 40 }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:border-ink-3"
            >
              Changer chantier <ChevronDown className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-full w-full max-w-md flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[80vh] sm:rounded-xl">
            <header className="flex items-center justify-between border-b border-line p-3">
              <h2 className="text-[14px] font-semibold text-ink">Sélectionner un chantier</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-ink-3">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="border-b border-line p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Code ou nom du chantier"
                  className="h-10 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px]"
                />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      switchChantier(s.id);
                      setDrawerOpen(false);
                    }}
                    style={{ minHeight: 56 }}
                    className={clsx(
                      "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-alt",
                      s.id === activeChantier.id && "bg-primary-50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-ink">{s.code} · {s.name}</div>
                      <div className="text-[11.5px] text-ink-3">{s.client} · {s.progress}%</div>
                    </div>
                    {s.id === activeChantier.id && (
                      <span className="rounded bg-primary-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        Actif
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-6 text-center text-[12.5px] text-ink-3">Aucun chantier trouvé.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
