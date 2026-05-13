"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { clsx } from "clsx";
import type { ContractingAuthorityType, LegalPosition } from "@prisma/client";
import { useCreateLegalCase } from "@/hooks/useSgLegalCases";

interface Props {
  onClose: () => void;
  onSuccess: (id: string) => void;
}

type Step = 1 | 2 | 3 | 4;

interface FormState {
  reference: string;
  title: string;
  description: string;
  opposingParty: string;
  opposingPartyType: ContractingAuthorityType | "";
  jurisdiction: string;
  caseNumber: string;
  ourPosition: LegalPosition;
  amountAtStake: string;
  strategy: string;
  lawyerName: string;
  lawFirm: string;
  provisionAmount: string;
  successProbability: number;
  nextHearingDate: string;
}

const PARTY_TYPES: { id: ContractingAuthorityType; label: string }[] = [
  { id: "PUBLIC_MINISTRY", label: "Ministère" },
  { id: "PUBLIC_MUNICIPALITY", label: "Commune / collectivité" },
  { id: "PUBLIC_INSTITUTION", label: "Institution publique" },
  { id: "PRIVATE_COMPANY", label: "Entreprise privée" },
  { id: "PRIVATE_INDIVIDUAL", label: "Particulier" },
];

const POSITIONS: { id: LegalPosition; label: string; hint: string }[] = [
  { id: "DEMANDEUR", label: "Demandeur", hint: "Nous attaquons" },
  { id: "DEFENDEUR", label: "Défendeur", hint: "Nous nous défendons" },
  { id: "MEDIATION", label: "Médiation", hint: "Phase amiable" },
  { id: "ARBITRATION", label: "Arbitrage", hint: "Procédure arbitrale" },
];

export function NewLegalCaseWizard({ onClose, onSuccess }: Props) {
  const create = useCreateLegalCase();
  const [step, setStep] = useState<Step>(1);
  const [f, setF] = useState<FormState>({
    reference: `CONT-${new Date().getFullYear()}-`,
    title: "",
    description: "",
    opposingParty: "",
    opposingPartyType: "",
    jurisdiction: "",
    caseNumber: "",
    ourPosition: "DEFENDEUR",
    amountAtStake: "",
    strategy: "",
    lawyerName: "",
    lawFirm: "",
    provisionAmount: "",
    successProbability: 50,
    nextHearingDate: "",
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  const amountAtStakeNum = Number(f.amountAtStake) || 0;
  const provisionSuggested = Math.round(amountAtStakeNum * ((100 - f.successProbability) / 100));

  const step1Valid = f.reference.length > 5 && f.title.length > 2 && f.description.length > 9 && f.opposingParty.length > 1;
  const step2Valid = f.jurisdiction.length > 1 && amountAtStakeNum > 0;
  const step3Valid = f.lawyerName.length > 1 && f.lawFirm.length > 1;
  const step4Valid = f.provisionAmount !== "" && Number(f.provisionAmount) >= 0 && Number(f.provisionAmount) <= amountAtStakeNum;

  function canNext(): boolean {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid;
    if (step === 3) return step3Valid;
    return step4Valid;
  }

  async function submit() {
    try {
      const r = await create.mutateAsync({
        reference: f.reference.trim(),
        title: f.title.trim(),
        description: f.description.trim(),
        ourPosition: f.ourPosition,
        jurisdiction: f.jurisdiction.trim(),
        caseNumber: f.caseNumber.trim() || undefined,
        opposingParty: f.opposingParty.trim(),
        opposingPartyType: f.opposingPartyType || undefined,
        amountAtStake: amountAtStakeNum,
        provisionAmount: Number(f.provisionAmount),
        lawyerName: f.lawyerName.trim(),
        lawFirm: f.lawFirm.trim(),
        strategy: f.strategy.trim() || undefined,
        nextHearingDate: f.nextHearingDate ? new Date(f.nextHearingDate).toISOString() : undefined,
      });
      onSuccess(r.id);
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const stepperLabels = ["Identification", "Stratégie", "Avocat", "Provision IFRS"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Nouveau dossier contentieux</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">Étape {step}/4 · {stepperLabels[step - 1]}</p>
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

        {/* Stepper */}
        <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-line bg-surface-alt/30 px-3 py-2">
          {stepperLabels.map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex flex-col items-center">
                <div
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-bold",
                    done
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-violet-600 text-white"
                        : "bg-slate-200 text-slate-600",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </div>
                <div
                  className={clsx(
                    "mt-0.5 truncate text-[10px]",
                    active ? "font-semibold text-violet-700" : done ? "text-emerald-700" : "text-ink-3",
                  )}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {step === 1 && (
            <>
              <Field label="Référence interne *" hint="Ex : CONT-2026-006">
                <input
                  type="text"
                  value={f.reference}
                  onChange={(e) => set("reference", e.target.value)}
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <Field label="Intitulé du dossier *">
                <input
                  type="text"
                  value={f.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ex : Litige fournisseur ferraillage Olembé"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <Field label="Description *" hint="Synthèse, faits, contexte (min. 10 caractères)">
                <textarea
                  value={f.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.3fr_1fr]">
                <Field label="Partie adverse *">
                  <input
                    type="text"
                    value={f.opposingParty}
                    onChange={(e) => set("opposingParty", e.target.value)}
                    placeholder="Ex : Commune Yaoundé I"
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={f.opposingPartyType}
                    onChange={(e) => set("opposingPartyType", e.target.value as ContractingAuthorityType | "")}
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  >
                    <option value="">— Non précisé —</option>
                    {PARTY_TYPES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Position *">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {POSITIONS.map((p) => {
                    const active = f.ourPosition === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => set("ourPosition", p.id)}
                        className={clsx(
                          "rounded-md border px-2 py-1.5 text-left text-[11.5px]",
                          active
                            ? "border-violet-500 bg-violet-50 font-semibold text-violet-700"
                            : "border-line bg-white text-ink hover:bg-surface-alt",
                        )}
                      >
                        <div>{p.label}</div>
                        <div className="text-[10px] font-normal text-ink-3">{p.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.3fr_1fr]">
                <Field label="Juridiction *">
                  <input
                    type="text"
                    value={f.jurisdiction}
                    onChange={(e) => set("jurisdiction", e.target.value)}
                    placeholder="Ex : Tribunal de Première Instance Yaoundé"
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
                <Field label="N° dossier juridiction">
                  <input
                    type="text"
                    value={f.caseNumber}
                    onChange={(e) => set("caseNumber", e.target.value)}
                    placeholder="Ex : TPI/Yaoundé/2026/0118"
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Enjeu financier (FCFA) *">
                  <input
                    type="number"
                    min={0}
                    value={f.amountAtStake}
                    onChange={(e) => set("amountAtStake", e.target.value)}
                    placeholder="Ex : 28000000"
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
                <Field label="Prochaine audience">
                  <input
                    type="date"
                    value={f.nextHearingDate}
                    onChange={(e) => set("nextHearingDate", e.target.value)}
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>
              </div>
              <Field label="Stratégie initiale" hint="Validation DG + DAF si enjeu > 50 M FCFA">
                <textarea
                  value={f.strategy}
                  onChange={(e) => set("strategy", e.target.value)}
                  rows={3}
                  placeholder="Approche, arguments, alliés, scénarios…"
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Avocat / Conseil *">
                <input
                  type="text"
                  value={f.lawyerName}
                  onChange={(e) => set("lawyerName", e.target.value)}
                  placeholder="Ex : Me Sophie ATANGANA"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <Field label="Cabinet *">
                <input
                  type="text"
                  value={f.lawFirm}
                  onChange={(e) => set("lawFirm", e.target.value)}
                  placeholder="Ex : Cabinet ATANGANA & Associés"
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </Field>
              <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[11.5px] text-violet-900">
                BatimCAM travaille avec 3 cabinets partenaires. Ce dossier peut renforcer ou élargir le partenariat selon le résultat.
              </p>
            </>
          )}

          {step === 4 && (
            <>
              <Field
                label="Probabilité de succès estimée"
                hint="Sert au calcul automatique de la provision IFRS (15-100 %)"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={15}
                    max={100}
                    step={5}
                    value={f.successProbability}
                    onChange={(e) => set("successProbability", Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-[12px] font-bold text-ink">{f.successProbability}%</span>
                </div>
                {amountAtStakeNum > 0 && (
                  <p className="mt-1 text-[11px] text-ink-3">
                    Provision suggérée : <strong className="text-ink">{provisionSuggested.toLocaleString("fr-FR")} FCFA</strong>{" "}
                    <button
                      type="button"
                      onClick={() => set("provisionAmount", String(provisionSuggested))}
                      className="ml-1 text-violet-700 hover:underline"
                    >
                      Utiliser
                    </button>
                  </p>
                )}
              </Field>
              <Field label="Provision IFRS (FCFA) *">
                <input
                  type="number"
                  min={0}
                  max={amountAtStakeNum}
                  value={f.provisionAmount}
                  onChange={(e) => set("provisionAmount", e.target.value)}
                  className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
                {Number(f.provisionAmount) > amountAtStakeNum && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    La provision ne peut pas dépasser l'enjeu ({amountAtStakeNum.toLocaleString("fr-FR")} FCFA).
                  </p>
                )}
              </Field>
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
                CAC (Cabinet KPMG) sera notifié pour comptabilisation. Revue trimestrielle obligatoire par DAF + CAC.
              </p>
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
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext()}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Suivant <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canNext() || create.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Créer le dossier
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
