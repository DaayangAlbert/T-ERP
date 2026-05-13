"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { useCreateEntry, type CptEntryLine } from "@/hooks/useCptEntries";

interface Props {
  open: boolean;
  onClose: () => void;
  journalCode: string;
  defaultSiteId?: string | null;
  isSiteAccountant: boolean;
  availableSites: Array<{ id: string; code: string; name: string }>;
}

const emptyLine = (): CptEntryLine => ({
  accountCode: "",
  description: "",
  debit: 0,
  credit: 0,
  siteId: null,
});

export function EntryFormModal({ open, onClose, journalCode, defaultSiteId, isSiteAccountant, availableSites }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState(defaultSiteId ?? "");
  const [lines, setLines] = useState<CptEntryLine[]>([emptyLine(), emptyLine()]);
  const create = useCreateEntry();

  if (!open) return null;

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const updateLine = (idx: number, patch: Partial<CptEntryLine>) => {
    setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  async function submit(validate: boolean) {
    if (!balanced) return;
    try {
      await create.mutateAsync({
        journalCode,
        entryDate: new Date(date).toISOString(),
        reference,
        description,
        siteId: siteId || null,
        lines: lines.filter((l) => l.accountCode),
        validate,
      });
      onClose();
    } catch {
      // error remains in mutation.error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Nouvelle écriture · {journalCode}</h2>
            <p className="text-[11.5px] text-ink-3">Au moins 2 lignes, débit = crédit obligatoire.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-surface-alt">
            <X className="h-4 w-4 text-ink-3" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[12px] font-medium text-ink-2">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Référence
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="FA-2026-0042"
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Chantier (analytique)
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
                required={isSiteAccountant}
              >
                <option value="">{isSiteAccountant ? "— Obligatoire —" : "— Aucun (siège) —"}</option>
                {availableSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-[12px] font-medium text-ink-2">
            Libellé
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Facture PIWA n°FA-001 — ciment Pont Mfoundi"
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
            />
          </label>

          <div className="mt-3 space-y-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Lignes d'écriture</h3>
            {/* Desktop */}
            <div className="hidden rounded-md border border-line md:block">
              <table className="w-full text-[12px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-2 py-1.5">Compte</th>
                    <th className="px-2 py-1.5">Libellé ligne</th>
                    <th className="px-2 py-1.5 text-right">Débit</th>
                    <th className="px-2 py-1.5 text-right">Crédit</th>
                    <th className="px-2 py-1.5">Chantier</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx} className="border-b border-line">
                      <td className="px-2 py-1">
                        <input
                          value={l.accountCode}
                          onChange={(e) => updateLine(idx, { accountCode: e.target.value })}
                          placeholder="401001"
                          className="h-8 w-24 rounded border border-line px-1.5 text-[12px] outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={l.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          className="h-8 w-full rounded border border-line px-1.5 text-[12px] outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          value={l.debit || ""}
                          onChange={(e) => updateLine(idx, { debit: Number(e.target.value), credit: 0 })}
                          className="h-8 w-28 rounded border border-line px-1.5 text-right text-[12px] outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          value={l.credit || ""}
                          onChange={(e) => updateLine(idx, { credit: Number(e.target.value), debit: 0 })}
                          className="h-8 w-28 rounded border border-line px-1.5 text-right text-[12px] outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={l.siteId ?? ""}
                          onChange={(e) => updateLine(idx, { siteId: e.target.value || null })}
                          className="h-8 w-32 rounded border border-line px-1 text-[12px] outline-none focus:border-primary-400"
                        >
                          <option value="">—</option>
                          {availableSites.map((s) => (
                            <option key={s.id} value={s.id}>{s.code}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-right">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setLines((cur) => cur.filter((_, i) => i !== idx))}
                            className="rounded p-1 text-ink-3 hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {lines.map((l, idx) => (
                <div key={idx} className="rounded-md border border-line bg-white p-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={l.accountCode}
                      onChange={(e) => updateLine(idx, { accountCode: e.target.value })}
                      placeholder="Compte"
                      className="h-8 rounded border border-line px-1.5 text-[12px]"
                    />
                    <select
                      value={l.siteId ?? ""}
                      onChange={(e) => updateLine(idx, { siteId: e.target.value || null })}
                      className="h-8 rounded border border-line px-1 text-[12px]"
                    >
                      <option value="">— Chantier —</option>
                      {availableSites.map((s) => (
                        <option key={s.id} value={s.id}>{s.code}</option>
                      ))}
                    </select>
                    <input
                      value={l.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="Libellé"
                      className="col-span-2 h-8 rounded border border-line px-1.5 text-[12px]"
                    />
                    <input
                      type="number"
                      value={l.debit || ""}
                      onChange={(e) => updateLine(idx, { debit: Number(e.target.value), credit: 0 })}
                      placeholder="Débit"
                      className="h-8 rounded border border-line px-1.5 text-right text-[12px]"
                    />
                    <input
                      type="number"
                      value={l.credit || ""}
                      onChange={(e) => updateLine(idx, { credit: Number(e.target.value), debit: 0 })}
                      placeholder="Crédit"
                      className="h-8 rounded border border-line px-1.5 text-right text-[12px]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLines((cur) => [...cur, emptyLine()])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink-3 hover:border-primary-300 hover:text-primary-700"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </button>
          </div>

          <div
            className={clsx(
              "mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-[12.5px] font-medium",
              balanced ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
            )}
          >
            <span>Total débit : {totalDebit.toLocaleString("fr-FR")} FCFA</span>
            <span>Total crédit : {totalCredit.toLocaleString("fr-FR")} FCFA</span>
            <span>{balanced ? "✓ Équilibré" : "✗ Non équilibré"}</span>
          </div>

          {create.error && (
            <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-[12px] text-danger">
              {String((create.error as Error).message)}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!balanced || create.isPending}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 disabled:opacity-50"
          >
            Enregistrer en brouillard
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!balanced || create.isPending}
            className="h-9 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Enregistrer et valider
          </button>
        </footer>
      </div>
    </div>
  );
}
