"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Plus, FileText } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/format";
import { useTenantHref } from "@/hooks/useTenantHref";
import { usePurchaseOrders, useCreatePurchaseOrder, useSuppliers, type PurchaseOrderItem } from "@/hooks/usePurchase";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const fmt = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

const STATUT: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-ink-3/10 text-ink-3" },
  PENDING_DAF: { label: "À valider (DAF)", cls: "bg-warning/10 text-warning" },
  PENDING_DG: { label: "À valider (DG)", cls: "bg-warning/10 text-warning" },
  APPROVED: { label: "Approuvé", cls: "bg-success/10 text-success" },
  REJECTED: { label: "Rejeté", cls: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Annulé", cls: "bg-ink-3/10 text-ink-3" },
};

export function OrdersManager() {
  const { data, isLoading } = usePurchaseOrders();
  const tenantHref = useTenantHref();
  const [creating, setCreating] = useState(false);
  const canManage = data?.canManage ?? false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-3">
          Bons de commande émis. Au-delà de 2 000 000 FCFA, le BC part en validation (DAF puis DG).
        </p>
        {canManage && (
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
            <Plus className="h-3.5 w-3.5" /> Nouveau bon de commande
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-surface-alt" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center text-[12.5px] text-ink-3">
          Aucun bon de commande. Cliquez « Nouveau bon de commande » pour en créer un.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="border-b border-line bg-surface-alt text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2">N° BC</th>
                <th className="px-3 py-2">Fournisseur</th>
                <th className="px-3 py-2">Désignation</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => {
                const st = STATUT[o.status] ?? STATUT.DRAFT;
                return (
                  <tr key={o.id} className="border-b border-line">
                    <td className="px-3 py-2 font-mono text-[11.5px] text-ink">{o.reference}</td>
                    <td className="px-3 py-2 text-ink-2">{o.supplier}</td>
                    <td className="px-3 py-2"><span className="text-ink">{o.label}</span> <span className="text-[11px] text-ink-3">· {o.category}</span>{o.chantier ? <span className="text-[11px] text-ink-3"> · {o.chantier}</span> : null}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(o.amount)}</td>
                    <td className="px-3 py-2"><span className={clsx("rounded px-2 py-0.5 text-[11px] font-medium", st.cls)}>{st.label}</span></td>
                    <td className="px-3 py-2 text-ink-3">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <a href={tenantHref(`/api/purchase/orders/${o.id}/pdf`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700">
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateOrderModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePurchaseOrder();
  const { data: suppliers } = useSuppliers();
  const [supplierId, setSupplierId] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; status: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const a = onlyDigits(amount);
    if (!supplierId) { setError("Choisissez un fournisseur"); return; }
    if (!label.trim()) { setError("Désignation requise"); return; }
    if (!category.trim()) { setError("Catégorie requise"); return; }
    if (!a || a === "0") { setError("Montant invalide"); return; }
    try {
      const r = await create.mutateAsync({ supplierId, label: label.trim(), category: category.trim(), amount: a });
      setDone({ reference: r.reference, status: r.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouveau bon de commande">
      {done ? (
        <div className="space-y-3 text-center">
          <p className="text-[13px] text-ink">Bon de commande créé :</p>
          <p className="text-xl font-bold text-primary-700">{done.reference}</p>
          <p className="text-[12px] text-ink-3">{done.status === "APPROVED" ? "Émis directement (sous le seuil)." : "Envoyé en validation."}</p>
          <button type="button" onClick={onClose} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700">Fermer</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="rounded-md bg-surface-alt px-3 py-2 text-[12px] text-ink-2">Le numéro (BC-0000-{new Date().getFullYear()}) est généré automatiquement.</p>
          <Field label="Fournisseur">
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {(suppliers?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </Field>
          <Field label="Désignation"><input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: 200 sacs de ciment CPJ 42.5" /></Field>
          <Field label="Catégorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Ciment" /></Field>
          <Field label="Montant HT (FCFA)"><input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
            <button type="submit" disabled={create.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{create.isPending ? "Création…" : "Créer le BC"}</button>
          </div>
        </form>
      )}
    </TreasuryModal>
  );
}
