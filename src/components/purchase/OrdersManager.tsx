"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Plus, FileText, Trash2 } from "lucide-react";
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

interface LineDraft { designation: string; quantity: string; unitPrice: string }
const emptyLine = (): LineDraft => ({ designation: "", quantity: "1", unitPrice: "" });

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePurchaseOrder();
  const { data: suppliers } = useSuppliers();
  const [supplierId, setSupplierId] = useState("");
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; status: string } | null>(null);

  const setLine = (i: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));

  const lineAmount = (l: LineDraft) => {
    const q = parseFloat(l.quantity.replace(",", ".")) || 0;
    const pu = Number(onlyDigits(l.unitPrice) || "0");
    return Math.round(q * pu);
  };
  const total = lines.reduce((s, l) => s + lineAmount(l), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) { setError("Choisissez un fournisseur"); return; }
    if (!category.trim()) { setError("Catégorie requise"); return; }
    const clean = lines
      .map((l) => ({ designation: l.designation.trim(), quantity: parseFloat(l.quantity.replace(",", ".")) || 0, unitPrice: onlyDigits(l.unitPrice) }))
      .filter((l) => l.designation && l.quantity > 0 && l.unitPrice && l.unitPrice !== "0");
    if (clean.length === 0) { setError("Ajoutez au moins un article (désignation, quantité, prix)"); return; }
    try {
      const r = await create.mutateAsync({ supplierId, category: category.trim(), lines: clean });
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fournisseur">
              <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Sélectionner…</option>
                {(suppliers?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
              </select>
            </Field>
            <Field label="Catégorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Gros œuvre" /></Field>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Articles</span>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter un article
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="rounded-lg border border-line p-2">
                  <input className={clsx(inputCls, "mb-1.5")} value={l.designation} onChange={(e) => setLine(i, { designation: e.target.value })} placeholder="Désignation (ex: Sac de ciment CPJ 42.5)" />
                  <div className="flex items-center gap-2">
                    <input className={clsx(inputCls, "w-20")} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} placeholder="Qté" />
                    <input className={clsx(inputCls, "flex-1")} inputMode="numeric" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} placeholder="Prix unitaire" />
                    <span className="w-28 shrink-0 text-right text-[12px] tabular-nums text-ink-2">{fmt(String(lineAmount(l)))}</span>
                    <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} title="Retirer" className="grid h-8 w-8 shrink-0 place-items-center rounded text-ink-3 hover:bg-rose-50 hover:text-danger disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2">
            <span className="text-[12.5px] font-medium text-ink-2">Total HT</span>
            <span className="text-[15px] font-bold tabular-nums text-ink">{fmt(String(total))}</span>
          </div>

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
