"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { clsx } from "clsx";
import type { InstitutionCategory, InstitutionType, RelationshipStatus } from "@prisma/client";
import { useCreateInstitution } from "@/hooks/useSgInstitutions";

interface Props {
  onClose: () => void;
  onSuccess: (id: string) => void;
}

const TYPES: { id: InstitutionType; label: string }[] = [
  { id: "MINISTRY", label: "Ministère" },
  { id: "MUNICIPALITY", label: "Commune" },
  { id: "PUBLIC_INSTITUTION", label: "Institution publique" },
  { id: "PROFESSIONAL_ASSOCIATION", label: "Association pro" },
  { id: "LAW_FIRM", label: "Cabinet juridique" },
  { id: "AUDIT_FIRM", label: "Cabinet d'audit" },
  { id: "BANK", label: "Banque" },
  { id: "OTHER", label: "Autre" },
];

const CATEGORIES: { id: InstitutionCategory; label: string }[] = [
  { id: "CLIENT", label: "Client" },
  { id: "REGULATORY", label: "Régulateur" },
  { id: "ASSOCIATION", label: "Association" },
  { id: "SUPPLIER", label: "Fournisseur" },
  { id: "PARTNER", label: "Partenaire" },
];

export function NewInstitutionModal({ onClose, onSuccess }: Props) {
  const create = useCreateInstitution();
  const [name, setName] = useState("");
  const [type, setType] = useState<InstitutionType>("MINISTRY");
  const [category, setCategory] = useState<InstitutionCategory>("CLIENT");
  const [status, setStatus] = useState<RelationshipStatus>("ACTIVE");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    try {
      const r = await create.mutateAsync({
        name: name.trim(),
        type,
        category,
        primaryContactName: contactName.trim() || undefined,
        primaryContactRole: contactRole.trim() || undefined,
        primaryContactPhone: contactPhone.trim() || undefined,
        primaryContactEmail: contactEmail.trim() || undefined,
        website: website.trim() || undefined,
        relationshipStatus: status,
        relationshipNotes: notes.trim() || undefined,
      });
      onSuccess(r.id);
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = name.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold text-ink">Nouvelle institution</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <Field label="Nom *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : MINFI — Ministère des Finances"
              className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </Field>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Type *">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InstitutionType)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Catégorie *">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InstitutionCategory)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Relation">
              <div className="flex gap-1">
                {(["ACTIVE", "WATCH", "SENSITIVE", "INACTIVE"] as const).map((s) => {
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={clsx(
                        "flex-1 rounded-md border px-1 py-1 text-[10px] font-semibold",
                        active
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-line bg-white text-ink-3 hover:bg-surface-alt",
                      )}
                      title={s}
                    >
                      {s[0]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Contact principal">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </Field>
            <Field label="Fonction">
              <input
                type="text"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </Field>
          </div>

          <Field label="Site web">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.exemple.cm"
              className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </Field>

          <Field label="Notes confidentielles SG">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </Field>

          {create.isError && (
            <p className="text-[11.5px] text-rose-600">{(create.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || create.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Créer
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
