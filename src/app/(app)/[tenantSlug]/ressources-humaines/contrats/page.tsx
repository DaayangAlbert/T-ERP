"use client";

import { useState } from "react";
import { FileText, Plus, Download, FileSignature, Trash2, Eye } from "lucide-react";
import { clsx } from "clsx";
import {
  useContracts,
  useContract,
  useCreateContract,
  useUpdateContract,
  CONTRACT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  type ContractType,
  type ContractStatus,
  type CreateContractPayload,
} from "@/hooks/useRhContracts";
import { usePersonnel } from "@/hooks/useRhPersonnel";
import { PageHelp } from "@/components/help/PageHelp";
import { RhContratsTutorial } from "@/components/help/tutorials/RhContratsTutorial";

function fmtFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(n))
    .replace(/[   ]/g, " ");
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useContracts({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="text-sm text-slate-500">RH · Administratif</div>
          <h1 className="text-2xl font-bold text-slate-900">Contrats de travail</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rédige, génère et fait signer les contrats CDI / CDD / Stage / Journalier / Prestataire en ligne.
            Les contrats signés sont archivés automatiquement dans le dossier du salarié.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Contrats de travail"><RhContratsTutorial /></PageHelp>
          <button
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nouveau contrat
          </button>
        </div>
      </header>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher (référence, employé, poste...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tous types</option>
          {Object.entries(CONTRACT_TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.entries(CONTRACT_STATUS_LABEL).map(([k, { label }]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          Chargement…
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          Aucun contrat pour ces filtres.
          <div className="mt-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="text-primary hover:underline"
            >
              Créer un premier contrat
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3 text-left">Salarié</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Poste</th>
                <th className="px-4 py-3 text-left">Salaire base</th>
                <th className="px-4 py-3 text-left">Période</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.reference}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {c.employee.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{c.employee.fullName}</div>
                        <div className="text-xs text-slate-500">{c.employee.matricule ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.type}</td>
                  <td className="px-4 py-3 text-slate-700">{c.jobTitle}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{fmtFCFA(c.baseSalary)} FCFA</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {fmtDate(c.startDate)} {c.endDate ? `→ ${fmtDate(c.endDate)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", CONTRACT_STATUS_LABEL[c.status].tone)}>
                      {CONTRACT_STATUS_LABEL[c.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir
                      </button>
                      <a
                        href={`/api/rh/contracts/${c.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {wizardOpen && <ContractWizard onClose={() => setWizardOpen(false)} onCreated={(id) => { setWizardOpen(false); setSelectedId(id); }} />}
      {selectedId && <ContractDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ───────────────────────── Wizard ─────────────────────────────────────

function ContractWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [type, setType] = useState<ContractType>("CDI");
  const [userId, setUserId] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [professionalCategory, setProfessionalCategory] = useState("");
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [trialPeriodDays, setTrialPeriodDays] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>("");
  const [workLocation, setWorkLocation] = useState("");
  const [workingHours, setWorkingHours] = useState("173 h/mois");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState("");
  const [internshipSchool, setInternshipSchool] = useState("");
  const [internshipTutor, setInternshipTutor] = useState("");
  const [providerCompanyName, setProviderCompanyName] = useState("");
  const [providerRccm, setProviderRccm] = useState("");
  const [providerNiu, setProviderNiu] = useState("");
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [cdiMotive, setCdiMotive] = useState("");
  const [notes, setNotes] = useState("");

  const create = useCreateContract();
  const personnel = usePersonnel({ limit: 200 });

  // Pré-remplissage depuis la fiche du salarié sélectionné
  const selectedEmployee = personnel.data?.items.find((p) => p.id === userId);
  const handleSelectEmployee = (id: string) => {
    setUserId(id);
    const emp = personnel.data?.items.find((p) => p.id === id);
    if (emp) {
      setJobTitle((cur) => cur || emp.position);
      setProfessionalCategory((cur) => cur || emp.category);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      alert("Sélectionnez un salarié");
      return;
    }
    if (!jobTitle.trim()) {
      alert("Précisez l'intitulé du poste");
      return;
    }
    if (baseSalary <= 0 && type !== "JOURNALIER") {
      alert("Précisez un salaire de base");
      return;
    }
    const payload: CreateContractPayload = {
      userId,
      type,
      jobTitle: jobTitle.trim(),
      professionalCategory: professionalCategory || null,
      baseSalary: type === "JOURNALIER" ? 0 : baseSalary,
      trialPeriodDays,
      startDate,
      endDate: endDate || null,
      workLocation: workLocation || null,
      workingHours,
      benefits,
      customClauses: [],
      internshipSchool: type === "STAGE" ? internshipSchool || null : null,
      internshipTutor: type === "STAGE" ? internshipTutor || null : null,
      providerCompanyName: type === "PRESTATAIRE" ? providerCompanyName || null : null,
      providerRccm: type === "PRESTATAIRE" ? providerRccm || null : null,
      providerNiu: type === "PRESTATAIRE" ? providerNiu || null : null,
      dailyRate: type === "JOURNALIER" ? dailyRate : null,
      cdiMotive: type === "CDD" ? cdiMotive || null : null,
      notes: notes || null,
    };
    try {
      const res = await create.mutateAsync(payload);
      onCreated(res.id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nouveau contrat de travail</h2>
            <p className="text-xs text-slate-500">Pré-rempli depuis la fiche du salarié sélectionné.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Type */}
          <Section title="Type de contrat">
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(CONTRACT_TYPE_LABEL) as ContractType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={clsx(
                    "rounded-lg border p-3 text-center text-xs font-semibold transition-colors",
                    type === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <div className="text-sm font-bold">{t}</div>
                  <div className="mt-1 text-[10px] font-normal text-slate-500">
                    {CONTRACT_TYPE_LABEL[t].split(" · ")[1] ?? CONTRACT_TYPE_LABEL[t]}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Salarié */}
          <Section title="Salarié">
            <select
              value={userId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner un salarié —</option>
              {personnel.data?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matricule ? `${p.matricule} · ` : ""}{p.fullName} — {p.position}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                <strong>{selectedEmployee.fullName}</strong> · {selectedEmployee.category} · {selectedEmployee.site}
              </p>
            )}
          </Section>

          {/* Poste & rémunération */}
          <Section title="Poste et rémunération">
            <Field label="Intitulé du poste *">
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex : Conducteur de travaux"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Catégorie CCT BTP">
              <input
                value={professionalCategory}
                onChange={(e) => setProfessionalCategory(e.target.value)}
                placeholder="Ex : Cadre M, ETAM N3, OQ N4"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            {type === "JOURNALIER" ? (
              <Field label="Taux journalier (FCFA) *">
                <input
                  type="number"
                  min={0}
                  value={dailyRate || ""}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            ) : (
              <Field label="Salaire mensuel brut (FCFA) *">
                <input
                  type="number"
                  min={0}
                  value={baseSalary || ""}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            )}
            <Field label="Période d'essai (jours)">
              <input
                type="number"
                min={0}
                max={180}
                value={trialPeriodDays || 0}
                onChange={(e) => setTrialPeriodDays(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </Section>

          {/* Durée & lieu */}
          <Section title="Durée et lieu de travail">
            <Field label="Date d'entrée *">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            {type !== "CDI" && (
              <Field label={`Date de fin ${type === "CDD" || type === "STAGE" ? "*" : ""}`}>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            )}
            <Field label="Lieu de travail">
              <input
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="Siège, chantier, ville…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Durée du travail">
              <input
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </Section>

          {/* Spécifique CDD */}
          {type === "CDD" && (
            <Section title="Motif du CDD (obligatoire)">
              <textarea
                value={cdiMotive}
                onChange={(e) => setCdiMotive(e.target.value)}
                rows={2}
                placeholder="Remplacement, accroissement temporaire d'activité, chantier déterminé…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Section>
          )}

          {/* Spécifique Stage */}
          {type === "STAGE" && (
            <Section title="Encadrement pédagogique">
              <Field label="École / Université *">
                <input
                  value={internshipSchool}
                  onChange={(e) => setInternshipSchool(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Tuteur en entreprise">
                <input
                  value={internshipTutor}
                  onChange={(e) => setInternshipTutor(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            </Section>
          )}

          {/* Spécifique Prestataire */}
          {type === "PRESTATAIRE" && (
            <Section title="Identité du prestataire">
              <Field label="Raison sociale *">
                <input
                  value={providerCompanyName}
                  onChange={(e) => setProviderCompanyName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="RCCM">
                <input
                  value={providerRccm}
                  onChange={(e) => setProviderRccm(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="NIU">
                <input
                  value={providerNiu}
                  onChange={(e) => setProviderNiu(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
            </Section>
          )}

          {/* Avantages */}
          <Section title="Avantages en nature">
            <div className="flex flex-wrap gap-2">
              {benefits.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800">
                  {b}
                  <button onClick={() => setBenefits(benefits.filter((_, idx) => idx !== i))} className="hover:text-emerald-900">
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBenefit.trim()) {
                    setBenefits([...benefits, newBenefit.trim()]);
                    setNewBenefit("");
                  }
                }}
                placeholder="Ex : Logement, Prime de panier, Véhicule de fonction"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (newBenefit.trim()) {
                    setBenefits([...benefits, newBenefit.trim()]);
                    setNewBenefit("");
                  }
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Ajouter
              </button>
            </div>
          </Section>

          <Section title="Notes internes (non imprimées)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? "Création…" : "Créer le brouillon"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────── Détail / Signature ─────────────────────────

function ContractDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: c, isLoading } = useContract(id);
  const update = useUpdateContract(id);
  const [signing, setSigning] = useState<null | "employer" | "employee">(null);

  if (isLoading || !c) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-xl bg-white p-8 text-sm text-slate-500">Chargement…</div>
      </div>
    );
  }

  const handleGeneratePdf = async () => {
    // L'URL pointe vers l'endpoint qui rend le PDF à la volée.
    // C'est cet endpoint qui devient le "snapshot" stocké dans contract.pdfUrl.
    const pdfUrl = `/api/rh/contracts/${id}/pdf`;
    await update.mutateAsync({ action: "generate-pdf", pdfUrl });
  };

  const handleSignEmployer = async (text: string) => {
    await update.mutateAsync({ action: "sign-employer", signatureText: text });
    setSigning(null);
  };

  const handleSignEmployee = async (text: string) => {
    await update.mutateAsync({ action: "sign-employee", signatureText: text });
    setSigning(null);
  };

  const handleCancel = async () => {
    if (!confirm("Annuler ce brouillon ?")) return;
    await update.mutateAsync({ action: "cancel" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{c.reference}</h2>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", CONTRACT_STATUS_LABEL[c.status].tone)}>
                {CONTRACT_STATUS_LABEL[c.status].label}
              </span>
            </div>
            <p className="text-xs text-slate-500">{CONTRACT_TYPE_LABEL[c.type]} · {c.employee.fullName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </header>

        <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
          {/* Métadonnées */}
          <div className="col-span-1 space-y-3 overflow-y-auto border-r border-slate-200 bg-slate-50 p-5 text-xs">
            <h3 className="text-[11px] font-bold uppercase text-slate-500">Salarié</h3>
            <KV label="Nom" value={c.employee.fullName} />
            <KV label="Matricule" value={c.employee.matricule ?? "—"} />
            <KV label="CNI" value={c.employee.identityCard ?? "—"} />
            <KV label="CNPS" value={c.employee.cnpsNumber ?? "—"} />

            <h3 className="mt-4 text-[11px] font-bold uppercase text-slate-500">Contrat</h3>
            <KV label="Poste" value={c.jobTitle} />
            <KV label="Catégorie" value={c.professionalCategory ?? "—"} />
            <KV label="Salaire base" value={`${fmtFCFA(c.baseSalary)} FCFA`} />
            {c.dailyRate ? <KV label="Taux/jour" value={`${fmtFCFA(c.dailyRate)} FCFA`} /> : null}
            <KV label="Essai" value={c.trialPeriodDays ? `${c.trialPeriodDays} j` : "—"} />
            <KV label="Début" value={fmtDate(c.startDate)} />
            {c.endDate ? <KV label="Fin" value={fmtDate(c.endDate)} /> : null}
            <KV label="Lieu" value={c.workLocation ?? "—"} />
            <KV label="Avantages" value={c.benefits.length ? c.benefits.join(", ") : "—"} />

            <h3 className="mt-4 text-[11px] font-bold uppercase text-slate-500">Signatures</h3>
            <KV
              label="Employeur"
              value={c.employerSignedAt ? `${c.employerSignatureText} · ${fmtDate(c.employerSignedAt)}` : "Non signé"}
            />
            <KV
              label="Salarié"
              value={c.employeeSignedAt ? `${c.employeeSignatureText} · ${fmtDate(c.employeeSignedAt)}` : "Non signé"}
            />
          </div>

          {/* Aperçu PDF */}
          <div className="col-span-2 overflow-y-auto bg-slate-100 p-5">
            <iframe
              src={`/api/rh/contracts/${id}/pdf`}
              className="h-full min-h-[600px] w-full rounded-lg border border-slate-300 bg-white shadow-sm"
              title="Aperçu contrat"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          {c.status === "DRAFT" && (
            <>
              <button onClick={handleCancel} className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">
                <Trash2 className="h-4 w-4" /> Annuler le brouillon
              </button>
              <button onClick={handleGeneratePdf} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                Générer & passer en signature
              </button>
            </>
          )}
          {c.status === "PENDING_SIGNATURE" && (
            <>
              <a
                href={`/api/rh/contracts/${id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> Télécharger
              </a>
              {!c.employerSignedAt && (
                <button onClick={() => setSigning("employer")} className="inline-flex items-center gap-1 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                  <FileSignature className="h-4 w-4" /> Signer (Employeur)
                </button>
              )}
              {!c.employeeSignedAt && (
                <button onClick={() => setSigning("employee")} className="inline-flex items-center gap-1 rounded-md border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                  <FileSignature className="h-4 w-4" /> Signer (Salarié)
                </button>
              )}
            </>
          )}
          {(c.status === "SIGNED" || c.status === "ACTIVE") && (
            <a
              href={`/api/rh/contracts/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> Télécharger PDF signé
            </a>
          )}
        </footer>

        {signing && (
          <SignDialog
            label={signing === "employer" ? "Signature Employeur" : "Signature Salarié"}
            placeholder={signing === "employer" ? "Ex : Jean DUPONT, DRH" : "Ex : Marie NGUEMA"}
            onClose={() => setSigning(null)}
            onSubmit={signing === "employer" ? handleSignEmployer : handleSignEmployee}
          />
        )}
      </div>
    </div>
  );
}

function SignDialog({
  label,
  placeholder,
  onClose,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">{label}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Tapez votre nom complet ci-dessous. La signature sera horodatée et conservée
          dans le contrat. Aucune signature manuscrite n'est requise.
        </p>
        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              J'ai lu et j'accepte sans réserve les termes du présent contrat. Je reconnais que ma
              signature électronique a la même valeur juridique qu'une signature manuscrite.
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={async () => {
              if (text.trim().length < 3) {
                alert("Précisez votre nom complet");
                return;
              }
              if (!agree) {
                alert("Vous devez accepter les termes pour signer");
                return;
              }
              setSubmitting(true);
              try {
                await onSubmit(text.trim());
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Signature…" : "Signer le contrat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Helpers ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase text-slate-500">{label}</div>
      <div className="text-slate-900">{value}</div>
    </div>
  );
}
