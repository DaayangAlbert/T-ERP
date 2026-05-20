"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDtDelegations, useCreateDelegation, useRevokeDelegation } from "@/hooks/useDtCircuit";
import { clsx } from "clsx";

interface ManagerProps {
  worksDirectors: Array<{ id: string; name: string }>;
}

function fmt(n: number | null): string {
  if (n === null) return "Tout montant";
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

export function DtDelegationsManager({ worksDirectors }: ManagerProps) {
  const { data, isLoading } = useDtDelegations();
  const create = useCreateDelegation();
  const revoke = useRevokeDelegation();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    toUserId: "",
    startDate: today,
    endDate: today,
    reason: "",
    maxAmount: "",
  });

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">Mes délégations</h3>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-primary-300 bg-primary-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-100"
        >
          <Plus className="h-3 w-3" /> Créer délégation
        </button>
      </header>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
      ) : data?.items.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune délégation. Créez-en une pour vos vacances ou missions terrain.
        </div>
      ) : (
        <ul className="space-y-2">
          {data?.items.map((d) => (
            <li
              key={d.id}
              className={clsx(
                "rounded-xl border bg-white p-3",
                d.active ? "border-emerald-200" : "border-line opacity-70"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{d.toUser}</div>
                  <div className="text-[11.5px] text-ink-3">{d.toUserRole}</div>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                    d.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {d.active ? "Active" : "Révoquée"}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                <div>
                  <dt className="text-ink-3">Période</dt>
                  <dd className="font-medium">
                    {format(new Date(d.startDate), "dd/MM/yy", { locale: fr })} →{" "}
                    {d.endDate ? format(new Date(d.endDate), "dd/MM/yy", { locale: fr }) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Plafond</dt>
                  <dd className="font-medium tabular-nums">{fmt(d.maxAmount)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-ink-3">Motif</dt>
                  <dd className="font-medium">{d.reason ?? "—"}</dd>
                </div>
              </dl>
              {d.active && (
                <button
                  onClick={() => revoke.mutate(d.id)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                >
                  <Trash className="h-3 w-3" /> Révoquer maintenant
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await create.mutateAsync({
                  toUserId: form.toUserId,
                  startDate: form.startDate,
                  endDate: form.endDate,
                  reason: form.reason,
                  maxAmount: form.maxAmount ? parseInt(form.maxAmount) : undefined,
                });
                setOpen(false);
              }}
              className="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-2xl"
            >
              <h3 className="mb-3 text-[14px] font-semibold text-ink">Créer une délégation</h3>
              <label className="block text-[11px] font-medium text-ink-2">Destinataire</label>
              <select
                required
                value={form.toUserId}
                onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
              >
                <option value="">— Sélectionner —</option>
                {worksDirectors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-ink-2">Du</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-2">Au</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <label className="mt-2 block text-[11px] font-medium text-ink-2">Plafond (FCFA, optionnel)</label>
              <input
                type="number"
                value={form.maxAmount}
                onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
                placeholder="Ex: 50000000"
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
              />
              <label className="mt-2 block text-[11px] font-medium text-ink-2">Motif</label>
              <textarea
                required
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="Mission terrain Bonabéri, congés..."
                className="mt-1 w-full rounded-md border border-line-2 bg-white p-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="rounded bg-primary-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {create.isPending ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
