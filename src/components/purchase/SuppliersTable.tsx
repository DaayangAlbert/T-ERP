"use client";

import { useState } from "react";
import { Search, Star, ShieldOff, Phone, Mail, Pencil } from "lucide-react";
import { useSuppliers } from "@/hooks/usePurchase";
import { SupplierFormModal, type SupplierFormValues } from "@/components/purchase/SupplierFormModal";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

export function SuppliersTable() {
  const [search, setSearch] = useState("");
  const [strategicOnly, setStrategicOnly] = useState(false);
  const [editing, setEditing] = useState<SupplierFormValues | null>(null);
  const { data, isLoading } = useSuppliers({ strategic: strategicOnly, q: search || undefined });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  const canManage = data.canManage;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, catégorie…"
            className="h-9 w-full rounded-md border border-line bg-surface-alt pl-8 pr-3 text-[12.5px]"
          />
        </div>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <input type="checkbox" checked={strategicOnly} onChange={(e) => setStrategicOnly(e.target.checked)} />
          Stratégiques uniquement
        </label>
        <span className="ml-auto text-[11.5px] text-ink-3">
          {data.summary.total} fournisseurs · {data.summary.strategic} stratégiques · Vol. YTD {formatFCFA(BigInt(data.summary.totalVolumeYTD))}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[980px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Nom</th>
              <th className="py-2 text-left">Catégorie</th>
              <th className="py-2 text-left">Contact</th>
              <th className="py-2 text-right">Volume YTD</th>
              <th className="py-2 text-right">BC</th>
              <th className="py-2 text-right">Délai</th>
              <th className="py-2 text-center">Notation</th>
              <th className="py-2 text-center">Tags</th>
              {canManage && <th className="py-2 pr-3 text-center">Action</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s.id} className={clsx("border-t border-line hover:bg-surface-alt", s.blocked && "bg-danger/5")}>
                <td className="py-2 pl-3 font-medium text-ink">{s.name}</td>
                <td className="py-2 text-ink-3">{s.category}</td>
                <td className="py-2">
                  {s.phone || s.email ? (
                    <div className="flex flex-col gap-0.5">
                      {s.phone && (
                        <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-primary-700 hover:underline">
                          <Phone className="h-3 w-3" /> {s.phone}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-ink-3 hover:text-primary-700 hover:underline">
                          <Mail className="h-3 w-3" /> {s.email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-3">
                      <Phone className="h-3 w-3 opacity-40" /> Non renseigné
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(s.volumeYTD))}</td>
                <td className="py-2 text-right">{s.poCount}</td>
                <td className="py-2 text-right">{s.paymentTerms} j</td>
                <td className="py-2 text-center"><Stars value={s.ratingQuality} /></td>
                <td className="py-2 text-center">
                  <div className="inline-flex gap-1">
                    {s.strategic && (
                      <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">Stratégique</span>
                    )}
                    {s.blocked && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        <ShieldOff className="h-2.5 w-2.5" /> Bloqué
                      </span>
                    )}
                  </div>
                </td>
                {canManage && (
                  <td className="py-2 pr-3 text-center">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: s.id, name: s.name, category: s.category, taxId: null, rccm: null, phone: s.phone, email: s.email, city: s.city, strategic: s.strategic })}
                      title="Modifier le contact"
                      className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700"
                    >
                      <Pencil className="h-3 w-3" /> Éditer
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <SupplierFormModal initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-3">—</span>;
  const full = Math.floor(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-warning">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={clsx("h-3 w-3", i < full ? "fill-warning" : "fill-none opacity-30")} />
      ))}
      <span className="ml-1 text-[10.5px] text-ink-3">{value.toFixed(1)}</span>
    </span>
  );
}
