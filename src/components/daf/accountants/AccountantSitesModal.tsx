"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TreasuryModal } from "@/components/daf/treasury/TreasuryModal";
import { useAssignAccountantSites, type AccountantItem, type AssignableSite } from "@/hooks/useDafAccountants";

interface Props {
  open: boolean;
  onClose: () => void;
  accountant: AccountantItem | null;
  sites: AssignableSite[];
}

export function AccountantSitesModal({ open, onClose, accountant, sites }: Props) {
  const assign = useAssignAccountantSites();
  const [direction, setDirection] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initKey, setInitKey] = useState<string | null>(null);

  // Réinitialise l'état local quand on ouvre la modale sur un nouveau comptable.
  if (open && accountant && initKey !== accountant.id) {
    setInitKey(accountant.id);
    setDirection(accountant.isDirection);
    setSelected(new Set(accountant.assignedSiteIds));
    setSearch("");
    setError(null);
  }
  if (!open && initKey !== null) setInitKey(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.client.toLowerCase().includes(q),
    );
  }, [sites, search]);

  if (!accountant) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    try {
      await assign.mutateAsync({
        id: accountant.id,
        siteIds: direction ? [] : Array.from(selected),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal
      open={open}
      onClose={onClose}
      title={`Périmètre · ${accountant.firstName} ${accountant.lastName}`}
    >
      <div className="space-y-3">
        <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-alt p-3">
          <input
            type="checkbox"
            checked={direction}
            onChange={(e) => setDirection(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary-600"
          />
          <span>
            <span className="block text-[13px] font-semibold text-ink">Comptable Direction (tous chantiers)</span>
            <span className="mt-0.5 block text-[11.5px] text-ink-3">
              Accès consolidé à l&apos;ensemble des chantiers, sans restriction de périmètre.
            </span>
          </span>
        </label>

        {!direction && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer code, nom, MOA…"
                className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px]"
              />
            </div>

            <div className="flex items-center justify-between text-[11.5px] text-ink-3">
              <span>{selected.size} chantier{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(filtered.map((s) => s.id)))}
                  className="font-medium text-primary-700 hover:underline"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="font-medium text-ink-3 hover:underline"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">Aucun chantier.</p>
              ) : (
                filtered.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-alt"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 accent-primary-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-3">{s.code}</span>
                        <span className="truncate text-[12.5px] font-medium text-ink">{s.name}</span>
                      </span>
                      <span className="block truncate text-[11px] text-ink-3">{s.client}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </>
        )}

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={assign.isPending}
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {assign.isPending ? "Enregistrement…" : "Enregistrer le périmètre"}
          </button>
        </div>
      </div>
    </TreasuryModal>
  );
}
