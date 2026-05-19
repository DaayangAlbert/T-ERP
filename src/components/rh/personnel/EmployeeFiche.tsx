"use client";

import { useEffect, useState } from "react";
import { Building2, IdCard, Mail, Phone, X, Briefcase, FileText, Activity, Banknote, BadgeCheck, Save } from "lucide-react";
import { clsx } from "clsx";
import { usePersonnelFiche, useUpdatePersonnelClassification, useSalaryHistory, type PersonnelClassificationPatch, type PersonnelFiche as PersonnelFicheType } from "@/hooks/useRhPersonnel";

interface Props {
  id: string;
  onClose: () => void;
}

type Tab = "identity" | "pro" | "classification" | "documents" | "pay" | "activity";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "identity", label: "Identité", icon: <IdCard className="h-3.5 w-3.5" /> },
  { key: "pro", label: "Pro", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "classification", label: "Classification", icon: <BadgeCheck className="h-3.5 w-3.5" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "pay", label: "Paie", icon: <Banknote className="h-3.5 w-3.5" /> },
  { key: "activity", label: "Activité", icon: <Activity className="h-3.5 w-3.5" /> },
];

function initials(first: string, last: string): string {
  return `${first[0] ?? "?"}${last[0] ?? "?"}`.toUpperCase();
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const FAMILY_LABEL: Record<string, string> = {
  SINGLE: "Célibataire",
  MARRIED: "Marié(e)",
  WIDOWED: "Veuf/veuve",
  DIVORCED: "Divorcé(e)",
  FREE_UNION: "Union libre",
};

export function EmployeeFiche({ id, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("identity");
  const { data, isLoading } = usePersonnelFiche(id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-3 py-2">
          <h3 className="text-[13px] font-semibold text-ink">Fiche employé</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {isLoading || !data ? (
          <div className="space-y-2 p-3">
            <div className="h-24 animate-pulse rounded-md bg-surface-alt" />
            <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
          </div>
        ) : (
          <>
            <div className="p-3">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt p-3">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[14px] font-bold text-white">
                  {initials(data.firstName, data.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10.5px] text-ink-3">{data.matricule}</div>
                  <div className="text-[15px] font-bold text-ink">
                    {data.firstName} {data.lastName}
                  </div>
                  <div className="text-[12px] text-ink-3">{data.position}</div>
                </div>
                {data.isSynthetic && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Démo
                  </span>
                )}
              </div>
            </div>

            <div className="px-3">
              <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={clsx(
                      "relative inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[12px] font-medium",
                      tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
                    )}
                  >
                    {t.icon}
                    {t.label}
                    {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-3">
              {tab === "identity" && (
                <>
                  <Section title="Coordonnées">
                    <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={data.email} mono />
                    <Row icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={data.phone ?? "—"} mono />
                    <Row icon={<IdCard className="h-3.5 w-3.5" />} label="N° CNI" value={data.profile?.identityCard ?? "—"} mono />
                  </Section>
                  <Section title="Situation familiale">
                    <Row label="Statut familial" value={FAMILY_LABEL[data.profile?.familyStatus ?? ""] ?? "—"} />
                    <Row label="Nombre d'enfants" value={String(data.profile?.childrenCount ?? 0)} />
                  </Section>
                  <Section title="Adresse">
                    <Row label="Ville" value={data.profile?.address?.city ?? "—"} />
                    <Row label="Quartier" value={data.profile?.address?.neighborhood ?? "—"} />
                  </Section>
                  <Section title="Contact d'urgence">
                    <Row label="Nom" value={data.profile?.emergencyContact?.name ?? "—"} />
                    <Row label="Téléphone" value={data.profile?.emergencyContact?.phone ?? "—"} mono />
                    <Row label="Lien" value={data.profile?.emergencyContact?.relation ?? "—"} />
                  </Section>
                </>
              )}
              {tab === "pro" && (
                <Section title="Informations professionnelles">
                  <Row icon={<Briefcase className="h-3.5 w-3.5" />} label="Poste" value={data.position} />
                  <Row label="Catégorie" value={data.category} />
                  <Row label="Type de contrat" value={data.contractType} />
                  <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Affectation" value={data.site} />
                  <Row label="Région" value={data.region ?? "—"} />
                  <Row label="Date d'embauche" value={fmtDate(data.hireDate)} />
                  <Row label="N° CNPS" value={data.cnpsNumber ?? "—"} mono />
                </Section>
              )}
              {tab === "classification" && <ClassificationEditor data={data} />}
              {tab === "documents" && (
                <Section title={`Documents (${data.documents.length})`}>
                  {data.documents.length === 0 ? (
                    <p className="text-[12px] text-ink-3">Aucun document enregistré pour cet employé.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 rounded-md border border-line bg-white p-2">
                          <FileText className="h-4 w-4 text-primary-600" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium text-ink truncate">{d.title}</div>
                            <div className="text-[10.5px] text-ink-3">{d.type} · {fmtDate(d.uploadedAt)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}
              {tab === "pay" && (
                <Section title="Coordonnées bancaires">
                  <Row icon={<Banknote className="h-3.5 w-3.5" />} label="Banque" value={data.profile?.bankAccount?.bank ?? "—"} />
                  <Row label="IBAN" value={data.profile?.bankAccount?.iban ?? "—"} mono />
                  <Row label="SWIFT/BIC" value={data.profile?.bankAccount?.swift ?? "—"} mono />
                </Section>
              )}
              {tab === "activity" && (
                <Section title="Historique d'activité">
                  <p className="text-[12px] text-ink-3">
                    Module activité (audits, modifications, accès) à venir dans une prochaine itération.
                  </p>
                </Section>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{title}</h4>
      <div className="rounded-md border border-line bg-white p-2.5 space-y-1">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="mt-0.5 inline-flex w-32 flex-shrink-0 items-center gap-1 text-ink-3">
        {icon}
        {label}
      </span>
      <span className={clsx("min-w-0 flex-1 break-words text-ink", mono && "font-mono text-[11.5px]")}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Onglet Classification — édition de la grille salariale et des champs
// affichés sur le bulletin officiel. Réservé RH (l'API rejette les autres).
// ════════════════════════════════════════════════════════════════════════

function ClassificationEditor({ data }: { data: PersonnelFicheType }) {
  const update = useUpdatePersonnelClassification(data.id);
  const [dirty, setDirty] = useState<PersonnelClassificationPatch>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const merged = { ...data, ...dirty };
  const set = (patch: PersonnelClassificationPatch) => setDirty((c) => ({ ...c, ...patch }));

  if (data.isSynthetic) {
    return (
      <Section title="Classification & paie">
        <p className="text-[12px] text-ink-3">
          Cet employé est un profil de démo (synthétique). La saisie de classification est désactivée.
        </p>
      </Section>
    );
  }

  return (
    <>
      <Section title="Photo & catégorie professionnelle">
        <EditField label="Avatar (URL)" value={merged.avatarUrl ?? ""} onChange={(v) => set({ avatarUrl: v || null })} mono />
        <EditField label="Catégorie pro (libellé)" value={merged.professionalCategory ?? ""} onChange={(v) => set({ professionalCategory: v || null })} />
        <EditField label="Département" value={merged.department ?? ""} onChange={(v) => set({ department: v || null })} />
        <EditField label="Situation familiale" value={merged.familyStatus ?? ""} onChange={(v) => set({ familyStatus: v || null })} placeholder="Ex: Marié, 2 enfants" />
      </Section>

      <Section title="Grille salariale">
        <div className="grid grid-cols-2 gap-2">
          <EditField label="Échelon" value={merged.echelon ?? ""} onChange={(v) => set({ echelon: v || null })} placeholder="E3" />
          <EditField label="Classe" value={merged.classCategory ?? ""} onChange={(v) => set({ classCategory: v || null })} placeholder="Classe 2" />
          <EditField
            label="Indice"
            type="number"
            value={merged.indiceSalarial?.toString() ?? ""}
            onChange={(v) => set({ indiceSalarial: v === "" ? null : Number(v) })}
          />
          <EditField
            label="Coefficient"
            type="number"
            step="0.01"
            value={merged.coefficientSalarial?.toString() ?? ""}
            onChange={(v) => set({ coefficientSalarial: v === "" ? null : Number(v) })}
          />
        </div>
      </Section>

      <SalaryEditor
        userId={data.id}
        currentBase={merged.baseSalary ?? null}
        currentGrade={merged.salaryGrade ?? null}
        dirty={dirty}
        onChange={(p) => set(p)}
      />

      <Section title="Identifiants administratifs">
        <EditField label="N° CNPS" value={merged.cnpsNumber ?? ""} onChange={(v) => set({ cnpsNumber: v || null })} mono />
        <EditField label="N° Carte CNPS" value={merged.cnpsCardNumber ?? ""} onChange={(v) => set({ cnpsCardNumber: v || null })} mono />
        <EditField label="N° Contribuable (NIU)" value={merged.niu ?? ""} onChange={(v) => set({ niu: v || null })} mono />
      </Section>

      <Section title="Coordonnées bancaires">
        <EditField label="Banque" value={merged.bankName ?? ""} onChange={(v) => set({ bankName: v || null })} />
        <EditField label="Agence" value={merged.bankAgency ?? ""} onChange={(v) => set({ bankAgency: v || null })} />
        <EditField label="RIB / Compte" value={merged.rib ?? ""} onChange={(v) => set({ rib: v || null })} mono />
      </Section>

      <div className="sticky bottom-0 -mx-3 flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2">
        <div className="text-[11.5px]">
          {update.isError && <span className="text-danger">{(update.error as Error).message}</span>}
          {success && <span className="text-success">✓ Enregistré</span>}
          {!success && !update.isError && Object.keys(dirty).length > 0 && (
            <span className="text-ink-3">{Object.keys(dirty).length} modification(s) en attente</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirty({})}
            disabled={Object.keys(dirty).length === 0}
            className="h-8 rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink-2 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={update.isPending || Object.keys(dirty).length === 0}
            onClick={() => {
              update.mutate(dirty, {
                onSuccess: () => {
                  setDirty({});
                  setSuccess(true);
                },
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-600 px-2.5 text-[12px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {update.isPending ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </>
  );
}

function EditField({
  label, value, onChange, type = "text", step, mono, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-[11.5px] font-medium text-ink-3">
      {label}
      <input
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "mt-0.5 h-8 w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink",
          mono && "font-mono",
        )}
      />
    </label>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SalaryEditor — saisie du salaire de base contractuel + historique.
// Affiche : montant actuel + grade + table de l'historique des révisions.
// Si modification du montant, une révision est enregistrée (raison + notes).
// ════════════════════════════════════════════════════════════════════════

const REASON_OPTIONS = [
  { value: "HIRING", label: "Embauche" },
  { value: "ANNUAL_REVIEW", label: "Révision annuelle" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "NEGOTIATION", label: "Renégociation" },
  { value: "CCM_ADJUSTMENT", label: "Ajustement CCM" },
  { value: "CORRECTION", label: "Correction" },
  { value: "OTHER", label: "Autre" },
] as const;

function fmtFCFA(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(n))
    .replace(/[   ]/g, " ") + " FCFA";
}

function SalaryEditor({
  userId, currentBase, currentGrade, dirty, onChange,
}: {
  userId: string;
  currentBase: number | null;
  currentGrade: string | null;
  dirty: PersonnelClassificationPatch;
  onChange: (p: PersonnelClassificationPatch) => void;
}) {
  const history = useSalaryHistory(userId);
  const previousBase = currentBase;
  const proposedBase = dirty.baseSalary !== undefined ? dirty.baseSalary : currentBase;
  const isChanged = dirty.baseSalary !== undefined && dirty.baseSalary !== previousBase;
  const variation = isChanged && previousBase && proposedBase
    ? Math.round(((proposedBase - previousBase) / previousBase) * 1000) / 10
    : null;

  return (
    <>
      <Section title="Salaire contractuel">
        <div className="grid grid-cols-2 gap-2">
          <EditField
            label="Salaire de base (FCFA / mois)"
            type="number"
            value={proposedBase?.toString() ?? ""}
            onChange={(v) => onChange({ baseSalary: v === "" ? null : Number(v) })}
            placeholder="Ex: 2 000 000"
            mono
          />
          <EditField
            label="Grade / position salariale"
            value={dirty.salaryGrade !== undefined ? dirty.salaryGrade ?? "" : currentGrade ?? ""}
            onChange={(v) => onChange({ salaryGrade: v || null })}
            placeholder="Ex: Grille A - Position III"
          />
        </div>

        {/* Bandeau de révision si le montant est modifié */}
        {isChanged && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11.5px] text-amber-900">
              <span className="font-semibold">⚠ Révision salariale détectée</span>
              <span className="font-mono">
                {fmtFCFA(previousBase)} → <span className="font-bold">{fmtFCFA(proposedBase)}</span>
                {variation !== null && (
                  <span className={clsx("ml-2 font-bold", variation > 0 ? "text-emerald-700" : "text-rose-700")}>
                    ({variation > 0 ? "+" : ""}{variation} %)
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-medium text-amber-900">
                Motif
                <select
                  value={dirty.salaryChangeReason ?? "ANNUAL_REVIEW"}
                  onChange={(e) => onChange({ salaryChangeReason: e.target.value as PersonnelClassificationPatch["salaryChangeReason"] })}
                  className="mt-0.5 h-7 w-full rounded border border-amber-300 bg-white px-1.5 text-[11.5px]"
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] font-medium text-amber-900">
                Notes
                <input
                  type="text"
                  value={dirty.salaryChangeNotes ?? ""}
                  placeholder="Justification de la révision…"
                  onChange={(e) => onChange({ salaryChangeNotes: e.target.value })}
                  className="mt-0.5 h-7 w-full rounded border border-amber-300 bg-white px-1.5 text-[11.5px]"
                />
              </label>
            </div>
          </div>
        )}
      </Section>

      {/* Historique des révisions */}
      <Section title={`Historique des révisions (${history.data?.items.length ?? 0})`}>
        {history.data && history.data.items.length > 0 ? (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="py-1">Effet</th>
                <th className="py-1">Montant</th>
                <th className="py-1">Variation</th>
                <th className="py-1">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.data.items.map((h) => (
                <tr key={h.id}>
                  <td className="py-1.5 font-mono">{h.effectiveAt}</td>
                  <td className="py-1.5 font-mono">{fmtFCFA(h.baseSalary)}</td>
                  <td className={clsx("py-1.5 font-mono", h.variation && h.variation > 0 ? "text-emerald-700" : "text-rose-700")}>
                    {h.variation !== null ? `${h.variation > 0 ? "+" : ""}${h.variation} %` : "—"}
                  </td>
                  <td className="py-1.5">{h.reasonLabel}{h.notes ? ` · ${h.notes}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[11.5px] italic text-ink-3">
            Aucune révision enregistrée. La première modification du salaire de base créera une entrée d'historique.
          </p>
        )}
      </Section>
    </>
  );
}
