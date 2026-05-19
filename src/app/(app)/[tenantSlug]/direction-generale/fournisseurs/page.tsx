"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, Star, AlertOctagon, MapPin, X } from "lucide-react";
import { clsx } from "clsx";

interface Supplier {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  strategic: boolean;
  blocked: boolean;
  isSubcontractor: boolean;
  paymentTerms: number;
  ratingQuality: number | null;
  ratingDelay: number | null;
  ratingPrice: number | null;
  volumeYTD: string;
  poCount: number;
}
interface Response {
  summary: { total: number; strategic: number; blocked: number; subcontractors: number; citiesCount: number; totalVolumeYTD: string };
  cities: Array<{ city: string; count: number; strategic: number; volumeYTD: string }>;
  categories: string[];
  suppliers: Supplier[];
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  return Number.isFinite(v) ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA" : "—";
}

export default function DgFournisseursPage() {
  const [q, setQ] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dg", "suppliers"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/suppliers`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Response>;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.suppliers.filter((s) => {
      if (q && !`${s.name} ${s.category} ${s.city ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cityFilter && (s.city ?? "Non renseignée") !== cityFilter) return false;
      if (categoryFilter && s.category !== categoryFilter) return false;
      return true;
    });
  }, [data, q, cityFilter, categoryFilter]);

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
          <Building2 className="h-5 w-5 text-violet-600" /> Fournisseurs
        </h1>
        <p className="text-[12.5px] text-ink-3">Classement par ville · catégorie · ajout d'un nouveau fournisseur</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Fournisseurs" value={String(data.summary.total)} icon={<Building2 className="h-4 w-4" />} tone="primary" />
        <Kpi label="Stratégiques" value={String(data.summary.strategic)} icon={<Star className="h-4 w-4" />} tone="ok" />
        <Kpi label="Villes couvertes" value={String(data.summary.citiesCount)} icon={<MapPin className="h-4 w-4" />} tone="default" />
        <Kpi label="Volume YTD" value={fmtFCFA(data.summary.totalVolumeYTD)} icon={<Building2 className="h-4 w-4" />} tone="default" />
      </div>

      {/* Top villes */}
      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">Répartition par ville</h2>
        <div className="flex flex-wrap gap-2">
          {data.cities.map((c) => (
            <button
              key={c.city}
              onClick={() => setCityFilter(cityFilter === c.city ? "" : c.city)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-left transition",
                cityFilter === c.city ? "border-violet-500 bg-violet-50" : "border-line bg-white hover:border-violet-300 hover:bg-violet-50/50",
              )}
            >
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <MapPin className="h-3 w-3 text-violet-600" /> {c.city}
              </div>
              <div className="mt-0.5 text-[10.5px] text-ink-3">
                {c.count} fourn. · {c.strategic} stratég. · {fmtFCFA(c.volumeYTD)}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Filtres + bouton créer */}
      <div className="space-y-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            type="search"
            placeholder="Rechercher (nom, catégorie, ville)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Toutes catégories ({data.categories.length})</option>
            {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(q || cityFilter || categoryFilter) && (
            <button onClick={() => { setQ(""); setCityFilter(""); setCategoryFilter(""); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] hover:bg-surface-alt">
              ✕ Réinitialiser
            </button>
          )}
          <button onClick={() => setCreateOpen(true)} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700">
            <Plus className="h-3.5 w-3.5" /> Nouveau fournisseur
          </button>
        </div>
        <p className="text-[11px] text-ink-3">{filtered.length} fournisseur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[960px] text-[12.5px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Fournisseur</th>
              <th className="py-2 text-left">Catégorie</th>
              <th className="py-2 text-left">Ville</th>
              <th className="py-2 text-left">Contact</th>
              <th className="py-2 text-right">Volume YTD</th>
              <th className="py-2 text-right">CMD</th>
              <th className="py-2 text-right">Note Q.</th>
              <th className="py-2 pr-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-ink-3">Aucun fournisseur.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={clsx("border-t border-line hover:bg-surface-alt", s.blocked && "bg-rose-50/40 opacity-75")}>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center gap-1.5">
                      {s.strategic && <Star className="h-3 w-3 flex-shrink-0 fill-amber-400 text-amber-500" />}
                      <span className="font-semibold text-ink">{s.name}</span>
                    </div>
                    {s.taxId && <div className="text-[10px] text-ink-3">NIU {s.taxId}</div>}
                  </td>
                  <td className="py-2.5 text-[11.5px] text-ink-2">{s.category}</td>
                  <td className="py-2.5 text-[11.5px]">
                    {s.city ? (
                      <span className="inline-flex items-center gap-1 text-ink-2"><MapPin className="h-3 w-3 text-violet-500" />{s.city}</span>
                    ) : <span className="italic text-ink-3">—</span>}
                  </td>
                  <td className="py-2.5 text-[11px]">
                    {s.phone && <div className="text-ink-2">{s.phone}</div>}
                    {s.email && <div className="text-ink-3">{s.email}</div>}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{fmtFCFA(s.volumeYTD)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-[11px]">{s.poCount}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-[11px]">{s.ratingQuality !== null ? `${s.ratingQuality.toFixed(1)}/5` : "—"}</td>
                  <td className="py-2.5 pr-3">
                    {s.blocked ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"><AlertOctagon className="h-2.5 w-2.5" /> Bloqué</span>
                    ) : s.isSubcontractor ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Sous-traitant</span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Actif</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && <CreateSupplierModal onClose={() => setCreateOpen(false)} cities={data.cities.map((c) => c.city)} categories={data.categories} />}
    </div>
  );
}

function CreateSupplierModal({ onClose, cities, categories }: { onClose: () => void; cities: string[]; categories: string[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    category: "",
    city: "",
    taxId: "",
    rccm: "",
    phone: "",
    email: "",
    address: "",
    paymentTerms: 45,
    strategic: false,
    isSubcontractor: false,
  });

  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/dg/suppliers`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg", "suppliers"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouveau fournisseur</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
          className="space-y-3 p-4 max-h-[80vh] overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nom" required>
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Catégorie" required>
              <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="categories-list" placeholder="Ciment, Acier, Carburant..." className={inputCls} />
              <datalist id="categories-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ville">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} list="cities-list" placeholder="Douala, Yaoundé..." className={inputCls} />
              <datalist id="cities-list">{cities.filter((c) => c !== "Non renseignée").map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Délai paiement (jours)">
              <input type="number" min={0} max={180} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="NIU"><input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className={inputCls} /></Field>
            <Field label="RCCM"><input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Téléphone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Adresse"><textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]" /></Field>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={form.strategic} onChange={(e) => setForm({ ...form, strategic: e.target.checked })} /> Stratégique</label>
            <label className="inline-flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={form.isSubcontractor} onChange={(e) => setForm({ ...form, isSubcontractor: e.target.checked })} /> Sous-traitant</label>
          </div>
          {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">Annuler</button>
            <button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {create.isPending ? "Création..." : "Créer le fournisseur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-2">{label}{required && <span className="ml-0.5 text-rose-600">*</span>}</span>
      {children}
    </label>
  );
}

const inputCls = "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300";

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "default" | "ok" }) {
  const cls = { primary: "border-l-violet-500", default: "border-l-slate-400", ok: "border-l-emerald-500" }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[16px] font-bold text-ink">{value}</div>
    </div>
  );
}
