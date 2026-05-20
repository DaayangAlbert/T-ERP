"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { useLogPurchaseOrders, useCreateLogPO } from "@/hooks/useLogPurchaseOrders";

const STATUSES = [
  { value: "", label: "Tous statuts" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "PENDING_DAF", label: "N2 DAF" },
  { value: "PENDING_DG", label: "N3 DG" },
  { value: "APPROVED", label: "Émis" },
  { value: "REJECTED", label: "Rejeté" },
  { value: "CANCELLED", label: "Annulé" },
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_DAF: "bg-amber-100 text-amber-700",
  PENDING_DG: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_DAF: "N2 DAF",
  PENDING_DG: "N3 DG",
  APPROVED: "Émis",
  REJECTED: "Rejeté",
  CANCELLED: "Annulé",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function LogPurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading } = useLogPurchaseOrders({
    status,
    supplier,
    search: debouncedSearch,
    page,
  });

  const create = useCreateLogPO();
  const [createOpen, setCreateOpen] = useState(false);

  const inputCls =
    "h-9 w-full rounded-md border border-line-2 bg-white px-2.5 text-[12.5px] focus:border-primary-500 focus:outline-none";

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Bons de commande
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Émission et suivi des BC, workflow N1 logisticien → N2 DAF si &gt; 5 M FCFA.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-3 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau BC
          </button>
        </div>
      </header>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="text-[20px] font-bold leading-none text-ink">{data.kpis.inProgressCount}</div>
            <div className="mt-1 text-[11.5px] text-ink-2">En cours</div>
          </div>
          <div className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className={clsx("text-[20px] font-bold leading-none", data.kpis.toValidateCount > 0 ? "text-amber-700" : "text-ink")}>
              {data.kpis.toValidateCount}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-2">À valider</div>
          </div>
          <div className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className={clsx("text-[20px] font-bold leading-none", data.kpis.n2DafCount > 0 ? "text-rose-700" : "text-ink")}>
              {data.kpis.n2DafCount}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-2">N2 DAF (&gt; 5 M)</div>
          </div>
          <div className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="text-[20px] font-bold leading-none text-emerald-700">{data.kpis.receivedMonthCount}</div>
            <div className="mt-1 text-[11.5px] text-ink-2">Reçus ce mois</div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            placeholder="Rechercher réf, objet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
          <option value="">Tous fournisseurs</option>
          {data?.facets.suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div /> {/* 5e col vide pour préserver grille */}
      </div>

      {/* Tableau BC */}
      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucun bon de commande ne correspond aux filtres.
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Réf BC</th>
                  <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                  <th className="px-3 py-2 text-left font-medium">Objet</th>
                  <th className="px-3 py-2 text-left font-medium">Chantier</th>
                  <th className="px-3 py-2 text-right font-medium">Montant HT</th>
                  <th className="px-3 py-2 text-left font-medium">Créé le</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-surface-alt/60">
                    <td className="px-3 py-2 font-mono text-[11.5px]">{p.reference}</td>
                    <td className="px-3 py-2 font-medium text-ink">{p.supplier}</td>
                    <td className="px-3 py-2 text-ink-2">{p.label}</td>
                    <td className="px-3 py-2 text-ink-2">{p.site ?? "Siège"}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(p.amount)}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {format(new Date(p.createdAt), "dd/MM/yy", { locale: fr })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={clsx("inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[p.status])}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.items.map((p) => (
              <div key={p.id} className="rounded-lg border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-ink-3">{p.reference}</div>
                    <div className="text-[13px] font-semibold text-ink">{p.supplier}</div>
                    <div className="text-[11.5px] text-ink-3">{p.label}</div>
                  </div>
                  <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", STATUS_BADGE[p.status])}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-[11.5px]">
                  <span className="text-ink-3">{p.site ?? "Siège"}</span>
                  <span className="font-mono">{fmt(p.amount)} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2 text-[12px]">
          <span className="text-ink-3">
            Page {data.pagination.page} / {data.pagination.totalPages} · {data.pagination.total} BC
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
            >Précédent</button>
            <button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
            >Suivant</button>
          </div>
        </div>
      )}

      {/* Modale Nouveau BC (form simplifié) */}
      {createOpen && (
        <NewBcModal
          suppliers={data?.facets.suppliers ?? []}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (d) => {
            await create.mutateAsync(d);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NewBcModal({
  suppliers,
  onClose,
  onSubmit,
}: {
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (d: { supplierId: string; label: string; amount: number; category: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    supplierId: "",
    label: "",
    amount: 0,
    category: "Ciment",
  });
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
              await onSubmit(form);
            } finally {
              setSubmitting(false);
            }
          }}
          className="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-2xl"
        >
          <h3 className="mb-3 text-[14px] font-semibold text-ink">Nouveau bon de commande</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-ink-2">Fournisseur</label>
              <select
                required
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
              >
                <option value="">— Sélectionner —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-2">Objet</label>
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
                placeholder="Ex: 1200 sacs ciment HPC"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-2">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
              >
                {["Ciment", "Acier", "Carburant", "Coffrage", "Granulats", "Engins", "Pièces", "Autre"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-2">Montant HT (FCFA)</label>
              <input
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value || "0") })}
                className="mt-1 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
              />
              {form.amount > 5_000_000 && (
                <p className="mt-1 text-[10.5px] text-amber-700">
                  ⚠ Montant &gt; 5 M FCFA → workflow N2 DAF.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2"
            >Annuler</button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-primary-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >{submitting ? "Création…" : "Créer BC"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
