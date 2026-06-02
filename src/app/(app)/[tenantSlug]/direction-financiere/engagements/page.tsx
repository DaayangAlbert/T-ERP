"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, AlertOctagon, CheckCircle2, X, Landmark } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DafEngagementsTutorial } from "@/components/help/tutorials/DafEngagementsTutorial";

const TYPE_LABEL: Record<string, string> = {
  BANK_GUARANTEE: "Caution bancaire",
  FIRST_DEMAND_GUARANTEE: "Garantie 1er ordre",
  LETTER_CREDIT: "Lettre de crédit",
  PURCHASE_COMMITMENT: "Engagement d'achat",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expirée",
  RELEASED: "Libérée",
  REVOKED: "Révoquée",
  HONORED: "Honorée",
};
const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-rose-100 text-rose-800",
  RELEASED: "bg-slate-100 text-slate-700",
  REVOKED: "bg-stone-100 text-stone-600",
  HONORED: "bg-slate-100 text-slate-700",
};

interface Item {
  id: string;
  type: string;
  reference: string | null;
  bank: string | null;
  beneficiary: string | null;
  amount: string;
  siteId: string | null;
  issueDate: string;
  maturityDate: string;
  daysUntilMaturity: number;
  status: string;
  notes: string | null;
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  return Number.isFinite(v) ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA" : "—";
}

export default function DafEngagementsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["daf", "financial-commitments"],
    queryFn: async () => {
      const res = await fetch(`/api/daf/financial-commitments`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Item[] }>;
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
            <Wallet className="h-5 w-5 text-violet-600" /> Engagements financiers
          </h1>
          <p className="text-[12.5px] text-ink-3">Cautions, garanties 1er ordre, lettres de crédit, engagements d'achat</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Engagements financiers"><DafEngagementsTutorial /></PageHelp>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvel engagement
          </button>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : data.items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <Landmark className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun engagement financier</p>
          <p className="mt-1 text-[12px] text-ink-3">Créez le premier via le bouton « Nouvel engagement ».</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[920px] text-[12.5px]">
            <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Type</th>
                <th className="py-2 text-left">Référence</th>
                <th className="py-2 text-left">Bénéficiaire / Banque</th>
                <th className="py-2 text-right">Montant</th>
                <th className="py-2 text-left">Émission</th>
                <th className="py-2 text-left">Échéance</th>
                <th className="py-2 text-right">Reste</th>
                <th className="py-2 pr-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => {
                const isUrgent = i.status === "ACTIVE" && i.daysUntilMaturity <= 30;
                return (
                  <tr key={i.id} className={clsx("border-t border-line hover:bg-surface-alt", isUrgent && "bg-rose-50/30")}>
                    <td className="py-2.5 pl-3 text-[11.5px] text-ink-2">{TYPE_LABEL[i.type] ?? i.type}</td>
                    <td className="py-2.5 font-mono text-[10.5px]">{i.reference ?? "—"}</td>
                    <td className="py-2.5 text-[11.5px]">
                      <div className="font-semibold text-ink">{i.beneficiary ?? "—"}</div>
                      {i.bank && <div className="text-[10px] text-ink-3">{i.bank}</div>}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{fmtFCFA(i.amount)}</td>
                    <td className="py-2.5 text-[11px] text-ink-3">{new Date(i.issueDate).toLocaleDateString("fr-FR")}</td>
                    <td className="py-2.5 text-[11px] text-ink-2">{new Date(i.maturityDate).toLocaleDateString("fr-FR")}</td>
                    <td className={clsx("py-2.5 text-right font-mono tabular-nums text-[11px]", isUrgent && "font-bold text-rose-700", i.daysUntilMaturity < 0 && "text-stone-500 line-through")}>
                      {i.daysUntilMaturity >= 0 ? `${i.daysUntilMaturity} j` : "expiré"}
                    </td>
                    <td className="py-2.5 pr-3"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[i.status] ?? "bg-slate-100 text-slate-700")}>{STATUS_LABEL[i.status] ?? i.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <NewCommitmentModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function NewCommitmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: "BANK_GUARANTEE",
    reference: "",
    bank: "",
    beneficiary: "",
    amount: "",
    issueDate: "",
    maturityDate: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/daf/financial-commitments`, {
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
      qc.invalidateQueries({ queryKey: ["daf", "financial-commitments"] });
      qc.invalidateQueries({ queryKey: ["dg", "commitments-summary"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouvel engagement financier</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3 max-h-[80vh] overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type" required>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                <option value="BANK_GUARANTEE">Caution bancaire</option>
                <option value="FIRST_DEMAND_GUARANTEE">Garantie 1er ordre</option>
                <option value="LETTER_CREDIT">Lettre de crédit</option>
                <option value="PURCHASE_COMMITMENT">Engagement d'achat</option>
              </select>
            </Field>
            <Field label="Référence">
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="LC-2026-018..." className={inputCls} />
            </Field>
          </div>
          <Field label="Bénéficiaire">
            <input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} placeholder="Fournisseur, donneur d'ordre..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Banque émettrice">
              <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="BICEC, SGC, Afriland..." className={inputCls} />
            </Field>
            <Field label="Montant (FCFA)" required>
              <input required type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date d'émission" required>
              <input required type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Échéance" required>
              <input required type="date" value={form.maturityDate} onChange={(e) => setForm({ ...form, maturityDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]" />
          </Field>

          {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">Annuler</button>
            <button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {create.isPending ? "Création..." : "Créer l'engagement"}
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
