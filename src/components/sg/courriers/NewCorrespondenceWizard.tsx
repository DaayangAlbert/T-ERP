"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Plus } from "lucide-react";
import { clsx } from "clsx";
import type { CorrespondenceConfidentiality, CorrespondenceDirection, Role } from "@prisma/client";
import { useCreateCorrespondence } from "@/hooks/useSgCorrespondences";

interface Props {
  onClose: () => void;
  onSuccess: (id: string, ref: string) => void;
}

type Step = 1 | 2 | 3;

const DIRECTIONS: { id: CorrespondenceDirection; label: string; hint: string }[] = [
  { id: "INCOMING", label: "Entrant (CE)", hint: "Courrier reçu d'une partie externe" },
  { id: "OUTGOING", label: "Sortant (CS)", hint: "Courrier émis par votre entreprise" },
];

const CONFIDENTIALITY_LEVELS: { id: CorrespondenceConfidentiality; label: string; tone: string }[] = [
  { id: "PUBLIC", label: "Public", tone: "border-slate-300 bg-slate-50 text-slate-700" },
  { id: "STANDARD", label: "Standard", tone: "border-violet-300 bg-violet-50 text-violet-700" },
  { id: "SENSITIVE", label: "Sensible", tone: "border-amber-300 bg-amber-50 text-amber-700" },
  { id: "CONFIDENTIAL", label: "Confidentiel", tone: "border-rose-300 bg-rose-50 text-rose-700" },
];

const ROLE_OPTIONS: { id: Role; label: string }[] = [
  { id: "DG" as Role, label: "Direction Générale" },
  { id: "DAF" as Role, label: "Finances (DAF)" },
  { id: "DT" as Role, label: "Technique (DT)" },
  { id: "RH" as Role, label: "RH" },
  { id: "SECRETARY_GENERAL" as Role, label: "Secrétaire Général" },
];

export function NewCorrespondenceWizard({ onClose, onSuccess }: Props) {
  const create = useCreateCorrespondence();
  const [step, setStep] = useState<Step>(1);

  const [direction, setDirection] = useState<CorrespondenceDirection>("INCOMING");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [correspondentName, setCorrespondentName] = useState("");
  const [correspondentEntity, setCorrespondentEntity] = useState("");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [confidentiality, setConfidentiality] = useState<CorrespondenceConfidentiality>("STANDARD");
  const [documentUrl, setDocumentUrl] = useState("");
  const [assignedToRole, setAssignedToRole] = useState<Role | "">("");
  const [dueInDays, setDueInDays] = useState<number | "">(5);
  const [requiresDgSignature, setRequiresDgSignature] = useState(false);

  async function submit() {
    try {
      const r = await create.mutateAsync({
        direction,
        date: new Date(date).toISOString(),
        correspondentName: correspondentName.trim(),
        correspondentEntity: correspondentEntity.trim() || undefined,
        subject: subject.trim(),
        summary: summary.trim() || undefined,
        confidentiality,
        assignedToRole: (assignedToRole || undefined) as Role | undefined,
        dueInDays: typeof dueInDays === "number" ? dueInDays : undefined,
        requiresDgSignature,
        documentUrl: documentUrl.trim() || undefined,
      });
      onSuccess(r.id, r.reference);
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const step1Valid = correspondentName.trim().length > 1 && subject.trim().length > 2;
  const step2Valid = true; // confidentiality + summary optional, always valid

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Nouveau courrier</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">Étape {step}/3</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-line bg-surface-alt/30 px-3 py-2">
          {["Type", "Contenu", "Routage"].map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex flex-col items-center">
                <div
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-bold",
                    done ? "bg-emerald-600 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </div>
                <div className={clsx("mt-0.5 text-[10.5px]", active ? "font-semibold text-violet-700" : done ? "text-emerald-700" : "text-ink-3")}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {step === 1 && (
            <>
              <Field label="Type *">
                <div className="grid grid-cols-2 gap-1.5">
                  {DIRECTIONS.map((d) => {
                    const active = direction === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDirection(d.id)}
                        className={clsx(
                          "rounded-md border px-2.5 py-2 text-left text-[11.5px]",
                          active
                            ? "border-violet-500 bg-violet-50 font-semibold text-violet-700"
                            : "border-line bg-white text-ink hover:bg-surface-alt",
                        )}
                      >
                        <div>{d.label}</div>
                        <div className="text-[10.5px] font-normal text-ink-3">{d.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                <Field label="Correspondant *">
                  <input
                    type="text"
                    value={correspondentName}
                    onChange={(e) => setCorrespondentName(e.target.value)}
                    placeholder={direction === "INCOMING" ? "Ex : MINTP — Sec. Général" : "Ex : Bonabéri Habitat SARL"}
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
              </div>
              <Field label="Entité (optionnel)">
                <input
                  type="text"
                  value={correspondentEntity}
                  onChange={(e) => setCorrespondentEntity(e.target.value)}
                  placeholder="Ministère, mairie, société…"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <Field label="Objet *">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex : Notification décision attribution Pont Mfoundi extension"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Confidentialité *">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {CONFIDENTIALITY_LEVELS.map((l) => {
                    const active = confidentiality === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setConfidentiality(l.id)}
                        className={clsx(
                          "rounded-md border px-2 py-1.5 text-[11.5px]",
                          active ? l.tone + " font-semibold" : "border-line bg-white text-ink hover:bg-surface-alt",
                        )}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Résumé / extrait" hint="Indexé pour recherche full-text">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={5}
                  placeholder="Résumé du contenu, références, montants, échéances…"
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <Field label="URL document numérisé (GED)">
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://ged.terpgroup.com/courriers/2026/CE-2026-0142.pdf"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Affectation">
                <select
                  value={assignedToRole}
                  onChange={(e) => setAssignedToRole(e.target.value as Role | "")}
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                >
                  <option value="">— Non affecté —</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              {direction === "INCOMING" ? (
                <Field label="Délai de réponse (jours ouvrés)" hint="Standard 5j, marchés publics 30j, fournisseurs 15j">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={dueInDays}
                    onChange={(e) => setDueInDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8 w-32 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
              ) : (
                <Field label="Workflow">
                  <label className="flex items-start gap-2 rounded-md border border-line bg-white px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={requiresDgSignature}
                      onChange={(e) => setRequiresDgSignature(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold text-ink">Signature DG requise</span>
                      <span className="block text-[10.5px] text-ink-3">
                        Sortant standard → SG seul · Sensible ou engageant juridiquement → cocher pour soumettre au DG
                      </span>
                    </span>
                  </label>
                </Field>
              )}
              <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[11.5px] text-violet-900">
                Référence auto-attribuée à la création : <strong>{direction === "INCOMING" ? "CE" : "CS"}-{new Date().getFullYear()}-NNNN</strong>
              </div>
            </>
          )}

          {create.isError && (
            <p className="text-[11.5px] text-rose-600">{(create.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : onClose())}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {step > 1 ? "Précédent" : "Annuler"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Suivant <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Enregistrer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</label>
      {hint && <p className="text-[10.5px] text-ink-3/80">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
