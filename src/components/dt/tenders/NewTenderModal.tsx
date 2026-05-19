"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

const MOA_TYPES = [
  { value: "PUBLIC_STATE", label: "État" },
  { value: "PUBLIC_LOCAL", label: "Collectivité publique" },
  { value: "PUBLIC_ENTERPRISE", label: "Entreprise publique" },
  { value: "PRIVATE_DOMESTIC", label: "Privé local" },
  { value: "PRIVATE_FOREIGN", label: "Privé international" },
  { value: "DONOR_INTERNATIONAL", label: "Bailleur international" },
];

const WORK_TYPES = [
  { value: "BUILDING", label: "Bâtiment" },
  { value: "ROADWORK", label: "Voirie" },
  { value: "CIVIL_ENGINEERING", label: "Génie civil" },
  { value: "HYDRAULIC", label: "Hydraulique" },
  { value: "LAYOUT", label: "Aménagement" },
  { value: "INDUSTRIAL", label: "Industriel" },
  { value: "OTHER", label: "Autre" },
];

const STAGES = [
  { value: "OPPORTUNITY", label: "Opportunité" },
  { value: "DCE_ANALYSIS", label: "Analyse DCE" },
  { value: "SITE_VISIT", label: "Visite site" },
  { value: "TECHNICAL_STUDY", label: "Étude technique" },
  { value: "PRICING", label: "Chiffrage" },
];

export function NewTenderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    reference: "",
    title: "",
    moaName: "",
    moaType: "PUBLIC_STATE",
    workType: "BUILDING",
    estimatedBudget: "",
    submissionDeadline: "",
    stage: "OPPORTUNITY",
    probability: 30,
  });

  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/dt/tenders`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, estimatedBudget: Number(data.estimatedBudget) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dt", "tenders"] });
      qc.invalidateQueries({ queryKey: ["dg", "pipeline-commercial"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouvelle étude / appel d&apos;offre</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
          className="max-h-[80vh] space-y-3 overflow-y-auto p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Référence" required>
              <input required value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="AO-2026-MINTP-018" className={inputCls} />
            </Field>
            <Field label="Étape">
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputCls}>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Intitulé de l'affaire" required>
            <input required minLength={4} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Construction école primaire à Bafoussam" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="MOA / Donneur d'ordre" required>
              <input required value={form.moaName} onChange={(e) => setForm({ ...form, moaName: e.target.value })} placeholder="MINTP, Commune Yaoundé I..." className={inputCls} />
            </Field>
            <Field label="Type MOA">
              <select value={form.moaType} onChange={(e) => setForm({ ...form, moaType: e.target.value })} className={inputCls}>
                {MOA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type de travaux">
              <select value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} className={inputCls}>
                {WORK_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </Field>
            <Field label="Budget estimé (FCFA)" required>
              <input required type="number" min={0} value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} placeholder="150000000" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date limite soumission" required>
              <input required type="date" value={form.submissionDeadline} onChange={(e) => setForm({ ...form, submissionDeadline: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Probabilité (%)">
              <input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} className={inputCls} />
            </Field>
          </div>

          {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">Annuler</button>
            <button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {create.isPending ? "Création..." : "Créer l'étude"}
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
