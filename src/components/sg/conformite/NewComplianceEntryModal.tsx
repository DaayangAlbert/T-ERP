"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Award, ShieldCheck, Archive } from "lucide-react";
import { clsx } from "clsx";

type Tab = "approval" | "certification" | "register";

const REGISTER_TYPES = [
  { value: "AG_DECISIONS", label: "Registre AG" },
  { value: "SHAREHOLDERS", label: "Registre actionnaires" },
  { value: "BOARD_DECISIONS", label: "Registre CA" },
  { value: "PERSONNEL", label: "Registre personnel" },
  { value: "HSE_SITES", label: "Registre HSE chantiers" },
  { value: "REGULATED_AGREEMENTS", label: "Conventions réglementées" },
  { value: "BANK_GUARANTEES", label: "Cautions bancaires" },
  { value: "PUBLIC_MARKETS", label: "Marchés publics" },
];

export function NewComplianceEntryModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("approval");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouvelle entrée conformité</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 border-b border-line bg-surface-alt/30 px-2 pt-2">
          <TabBtn active={tab === "approval"} onClick={() => setTab("approval")} icon={<Award className="h-3.5 w-3.5" />}>Agrément</TabBtn>
          <TabBtn active={tab === "certification"} onClick={() => setTab("certification")} icon={<ShieldCheck className="h-3.5 w-3.5" />}>Certification ISO</TabBtn>
          <TabBtn active={tab === "register"} onClick={() => setTab("register")} icon={<Archive className="h-3.5 w-3.5" />}>Registre</TabBtn>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {tab === "approval" && <ApprovalForm onClose={onClose} />}
          {tab === "certification" && <CertificationForm onClose={onClose} />}
          {tab === "register" && <RegisterForm onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-[12px] font-semibold transition",
        active ? "bg-white text-violet-700 shadow-sm" : "text-ink-3 hover:text-ink",
      )}
    >
      {icon} {children}
    </button>
  );
}

function ApprovalForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ approvalName: "", deliveringAuthority: "", approvalNumber: "", issuedAt: "", expiresAt: "", renewable: true, documentUrl: "" });
  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/sg/approvals`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sg"] });
      qc.invalidateQueries({ queryKey: ["dg", "compliance-summary"] });
      onClose();
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
      <Field label="Intitulé de l'agrément" required>
        <input required minLength={2} value={form.approvalName} onChange={(e) => setForm({ ...form, approvalName: e.target.value })} placeholder="Agrément BTP catégorie 4..." className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Autorité délivrante" required>
          <input required value={form.deliveringAuthority} onChange={(e) => setForm({ ...form, deliveringAuthority: e.target.value })} placeholder="MINMAP, MINTP..." className={inputCls} />
        </Field>
        <Field label="N° d'agrément" required>
          <input required value={form.approvalNumber} onChange={(e) => setForm({ ...form, approvalNumber: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date d'émission" required><input required type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} className={inputCls} /></Field>
        <Field label="Date d'expiration" required><input required type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Document (URL, optionnel)"><input type="url" value={form.documentUrl} onChange={(e) => setForm({ ...form, documentUrl: e.target.value })} className={inputCls} /></Field>
      <label className="inline-flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={form.renewable} onChange={(e) => setForm({ ...form, renewable: e.target.checked })} /> Renouvelable</label>

      {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}
      <FormActions onClose={onClose} pending={create.isPending} label="Créer l'agrément" />
    </form>
  );
}

function CertificationForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ standard: "", scope: "", issuedBy: "", issuedAt: "", validUntil: "", surveillanceAuditDate: "" });
  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/sg/certifications`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, scope: data.scope || null, surveillanceAuditDate: data.surveillanceAuditDate || null }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sg"] });
      qc.invalidateQueries({ queryKey: ["dg", "compliance-summary"] });
      onClose();
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Norme" required>
          <input required value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })} list="standard-list" placeholder="ISO 9001..." className={inputCls} />
          <datalist id="standard-list"><option value="ISO 9001" /><option value="ISO 14001" /><option value="ISO 45001" /><option value="ISO 37001" /></datalist>
        </Field>
        <Field label="Organisme certificateur" required>
          <input required value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} placeholder="TÜV, Bureau Veritas..." className={inputCls} />
        </Field>
      </div>
      <Field label="Périmètre (optionnel)"><input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Construction de bâtiments, génie civil..." className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Émission" required><input required type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} className={inputCls} /></Field>
        <Field label="Validité jusqu'au" required><input required type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Date audit de suivi (optionnel)"><input type="date" value={form.surveillanceAuditDate} onChange={(e) => setForm({ ...form, surveillanceAuditDate: e.target.value })} className={inputCls} /></Field>

      {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}
      <FormActions onClose={onClose} pending={create.isPending} label="Créer la certification" />
    </form>
  );
}

function RegisterForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ registerType: "AG_DECISIONS", name: "", description: "", legalBasis: "", responsibleUserId: "", nextReviewDate: "" });

  const users = useQuery({
    queryKey: ["sg", "users-for-register"],
    queryFn: async () => {
      const res = await fetch(`/api/users?roles=SECRETARY_GENERAL,DG,DAF,TECH_DIRECTOR,HR&limit=100`, { credentials: "same-origin" });
      if (!res.ok) return { items: [] as Array<{ id: string; firstName: string; lastName: string; role: string }> };
      return res.json() as Promise<{ items: Array<{ id: string; firstName: string; lastName: string; role: string }> }>;
    },
  });

  const create = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/sg/compliance/registers`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, description: data.description || null }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sg"] });
      qc.invalidateQueries({ queryKey: ["dg", "compliance-summary"] });
      onClose();
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type de registre" required>
          <select required value={form.registerType} onChange={(e) => setForm({ ...form, registerType: e.target.value })} className={inputCls}>
            {REGISTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Nom" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Base légale" required>
        <input required value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value })} placeholder="Art. 245 Acte Uniforme OHADA..." className={inputCls} />
      </Field>
      <Field label="Description (optionnel)">
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Responsable" required>
          <select required value={form.responsibleUserId} onChange={(e) => setForm({ ...form, responsibleUserId: e.target.value })} className={inputCls}>
            <option value="">— Choisir —</option>
            {(users.data?.items ?? []).map((u) => <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.role})</option>)}
          </select>
        </Field>
        <Field label="Prochaine revue" required><input required type="date" value={form.nextReviewDate} onChange={(e) => setForm({ ...form, nextReviewDate: e.target.value })} className={inputCls} /></Field>
      </div>

      {create.error && <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{(create.error as Error).message}</p>}
      <FormActions onClose={onClose} pending={create.isPending} label="Créer le registre" />
    </form>
  );
}

function FormActions({ onClose, pending, label }: { onClose: () => void; pending: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">Annuler</button>
      <button type="submit" disabled={pending} className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
        {pending ? "Création..." : label}
      </button>
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
