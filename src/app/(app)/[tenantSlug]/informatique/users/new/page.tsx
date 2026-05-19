"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPlus, Building2, Copy, Check } from "lucide-react";

// Rôles que l'IT_ADMIN peut créer/remplacer dans son tenant.
// Exclus (CRITICAL_ROLES côté API) : SUPER_ADMIN, TENANT_ADMIN.
// DG est autorisé : le TENANT_ADMIN gère le DG de son tenant (suspension,
// remplacement, etc.) sans dépendre du SUPER_ADMIN T-ERP.
const ROLE_OPTIONS = [
  { value: "DG", label: "Directeur Général" },
  { value: "DAF", label: "DAF" },
  { value: "TECH_DIRECTOR", label: "Directeur Technique" },
  { value: "WORKS_DIRECTOR", label: "Directeur de Travaux" },
  { value: "WORKS_MANAGER", label: "Conducteur de Travaux" },
  { value: "SITE_MANAGER", label: "Chef de Chantier" },
  { value: "HR", label: "Responsable RH" },
  { value: "ACCOUNTANT", label: "Comptable" },
  { value: "SECRETARY_GENERAL", label: "Secrétaire Général(e)" },
  { value: "ARCHIVIST", label: "Référent Documentaire" },
  { value: "WAREHOUSE", label: "Magasinier" },
  { value: "LOGISTICS", label: "Logisticien" },
  { value: "EMPLOYEE", label: "Employé bureau" },
  { value: "WORKER", label: "Ouvrier" },
] as const;

const CONTRACT_OPTIONS = ["CDI", "CDD", "STAGE", "JOURNALIER", "INTERIM"] as const;

// Rôles qui ont du sens à affecter sur un chantier (les autres = siège).
const SITE_ROLES = new Set([
  "WORKER",
  "SITE_MANAGER",
  "WORKS_MANAGER",
  "WORKS_DIRECTOR",
  "WAREHOUSE",
  "LOGISTICS",
]);

interface SiteOption {
  id: string;
  code: string;
  name: string;
  region: string | null;
  status: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [position, setPosition] = useState("");
  const [category, setCategory] = useState("");
  const [contractType, setContractType] = useState<string>("");
  const [hireDate, setHireDate] = useState("");
  const [requireMfa, setRequireMfa] = useState(false);
  const [assignedSiteIds, setAssignedSiteIds] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState("");
  // Identité personnelle (alignée sur la page profil employé)
  const [matricule, setMatricule] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cniNumber, setCniNumber] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [address, setAddress] = useState("");
  const [familyStatus, setFamilyStatus] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  // Informations professionnelles complémentaires
  const [cnpsNumber, setCnpsNumber] = useState("");
  const [niu, setNiu] = useState("");
  const [professionalCategory, setProfessionalCategory] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [rib, setRib] = useState("");

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    initialPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/it/sites?page=1");
        if (res.ok) {
          const data = (await res.json()) as { items: SiteOption[] };
          setSites(data.items ?? []);
        }
      } finally {
        setLoadingSites(false);
      }
    })();
  }, []);

  const showSiteSelector = SITE_ROLES.has(role);
  const filteredSites = sites.filter((s) => {
    if (!siteFilter) return true;
    const q = siteFilter.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.region?.toLowerCase().includes(q) ?? false)
    );
  });

  function toggleSite(id: string) {
    setAssignedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      firstName,
      lastName,
      email,
      phone: phone || null,
      role,
      position: position || undefined,
      category: category || undefined,
      contractType: contractType || undefined,
      hireDate: hireDate ? new Date(hireDate).toISOString() : undefined,
      assignedSiteIds: showSiteSelector ? assignedSiteIds : undefined,
      requireMfa,
      matricule: matricule || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
      cniNumber: cniNumber || undefined,
      phoneMobile: phoneMobile || undefined,
      personalEmail: personalEmail || undefined,
      address: address || undefined,
      familyStatus: familyStatus || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      cnpsNumber: cnpsNumber || undefined,
      niu: niu || undefined,
      professionalCategory: professionalCategory || undefined,
      bankName: bankName || undefined,
      bankAgency: bankAgency || undefined,
      rib: rib || undefined,
    };
    const res = await fetch("/api/it/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
      };
      const flat = data.issues?.fieldErrors
        ? Object.entries(data.issues.fieldErrors)
            .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
            .join(" · ")
        : null;
      setError(flat ?? data.error ?? "Erreur de création");
      return;
    }
    const json = (await res.json()) as { id: string; initialPassword: string };
    setCreated(json);
    router.refresh();
  }

  // Écran de confirmation après création — affiche le mot de passe initial
  if (created) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-semibold text-emerald-800">
              Utilisateur créé
            </h1>
          </div>
          <p className="mt-2 text-sm text-emerald-800">
            Un compte vient d&apos;être créé pour <strong>{email}</strong>.
            Communiquez ce mot de passe initial à l&apos;utilisateur par un canal
            sécurisé (WhatsApp pro, SMS…). Il sera invité à le changer à la
            première connexion.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
            <code className="flex-1 font-mono text-lg tracking-widest text-ink">
              {created.initialPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(created.initialPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-alt px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-white"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copier
                </>
              )}
            </button>
          </div>
          <div className="mt-5 flex gap-2">
            <Link
              href={`/${tenantSlug}/informatique/users/${created.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-brand hover:bg-primary-600"
            >
              Voir la fiche →
            </Link>
            <Link
              href={`/${tenantSlug}/informatique/users`}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              Retour à la liste
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/${tenantSlug}/informatique/users`}
          className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </Link>
      </div>

      <section className="rounded-xl border border-line bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-ink">Créer un utilisateur</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Identité</Legend>
            <Field label="Prénom *">
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Nom *">
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 ..."
                className={INPUT}
              />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Rôle & poste</Legend>
            <Field label="Rôle *">
              <select
                required
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (!SITE_ROLES.has(e.target.value)) setAssignedSiteIds([]);
                }}
                className={INPUT}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Poste / Intitulé">
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex: Chef de chantier Yaoundé Nord"
                className={INPUT}
              />
            </Field>
            <Field label="Catégorie professionnelle">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Cadre HC, ETAM 6, OQ 3, OS 1…"
                className={INPUT}
              />
            </Field>
            <Field label="Type de contrat">
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className={INPUT}
              >
                <option value="">—</option>
                {CONTRACT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date d'embauche">
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Sécurité">
              <label className="mt-1 inline-flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3 py-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-primary"
                />
                Imposer MFA à la première connexion
              </label>
            </Field>
            <Field label="Matricule employeur">
              <input
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                placeholder="Ex: BTC-2024-0142"
                className={INPUT}
              />
            </Field>
            <Field label="Catégorie pro grille BTP">
              <input
                value={professionalCategory}
                onChange={(e) => setProfessionalCategory(e.target.value)}
                placeholder="Ex: Catégorie 8 · échelon 3"
                className={INPUT}
              />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Identité personnelle</Legend>
            <Field label="Date de naissance">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="N° CNI">
              <input
                value={cniNumber}
                onChange={(e) => setCniNumber(e.target.value)}
                placeholder="Ex: 123456789"
                className={INPUT}
              />
            </Field>
            <Field label="Téléphone perso">
              <input
                type="tel"
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                placeholder="+237 ..."
                className={INPUT}
              />
            </Field>
            <Field label="Email perso">
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="prenom@gmail.com"
                className={INPUT}
              />
            </Field>
            <Field label="Adresse" className="sm:col-span-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Yaoundé · Mvog-Mbi · BP 1234"
                className={INPUT}
              />
            </Field>
            <Field label="Situation familiale">
              <input
                value={familyStatus}
                onChange={(e) => setFamilyStatus(e.target.value)}
                placeholder="Ex: Marié · 3 enfants"
                className={INPUT}
              />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Contact d'urgence (nom)">
              <input
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Nom et prénom"
                className={INPUT}
              />
            </Field>
            <Field label="Contact d'urgence (téléphone)">
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+237 ..."
                className={INPUT}
              />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Données légales & bancaires</Legend>
            <Field label="N° CNPS">
              <input
                value={cnpsNumber}
                onChange={(e) => setCnpsNumber(e.target.value)}
                placeholder="Ex: 10-1234567"
                className={INPUT}
              />
            </Field>
            <Field label="NIU (DGI)">
              <input
                value={niu}
                onChange={(e) => setNiu(e.target.value)}
                placeholder="Ex: F218014203187"
                className={INPUT}
              />
            </Field>
            <Field label="Banque">
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Afriland First Bank"
                className={INPUT}
              />
            </Field>
            <Field label="Agence">
              <input
                value={bankAgency}
                onChange={(e) => setBankAgency(e.target.value)}
                placeholder="Ex: Yaoundé Centre"
                className={INPUT}
              />
            </Field>
            <Field label="RIB" className="sm:col-span-2">
              <input
                value={rib}
                onChange={(e) => setRib(e.target.value)}
                placeholder="CM21 1234 5678 9012 3456 789"
                className={`${INPUT} font-mono`}
              />
            </Field>
          </fieldset>

          {showSiteSelector ? (
            <fieldset className="sm:col-span-2">
              <Legend>
                <Building2 className="mr-1 inline h-3.5 w-3.5" />
                Affectation chantiers ({assignedSiteIds.length} sélectionné
                {assignedSiteIds.length > 1 ? "s" : ""})
              </Legend>
              {loadingSites ? (
                <p className="text-xs text-ink-3">Chargement des chantiers…</p>
              ) : sites.length === 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Aucun chantier disponible dans ce tenant. Créez-en un d&apos;abord
                  via{" "}
                  <Link
                    href={`/${tenantSlug}/informatique/sites`}
                    className="font-semibold underline"
                  >
                    Chantiers (admin)
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <input
                    type="search"
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    placeholder="Filtrer par code, nom, région…"
                    className={INPUT}
                    style={{ marginTop: 0 }}
                  />
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-line bg-surface-alt">
                    {filteredSites.length === 0 ? (
                      <p className="p-3 text-xs text-ink-3">
                        Aucun chantier ne correspond.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {filteredSites.map((s) => {
                          const checked = assignedSiteIds.includes(s.id);
                          return (
                            <li key={s.id}>
                              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSite(s.id)}
                                  className="h-4 w-4 rounded border-line text-primary"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-ink">
                                    {s.name}
                                  </div>
                                  <div className="text-[11px] text-ink-3">
                                    {s.code}
                                    {s.region ? ` · ${s.region}` : ""}
                                  </div>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    s.status === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-ink-3/10 text-ink-3"
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-3">
                    Restreint l&apos;accès de cet utilisateur aux chantiers
                    sélectionnés. Vide = accès à tous les chantiers (selon son
                    rôle).
                  </p>
                </>
              )}
            </fieldset>
          ) : (
            <p className="sm:col-span-2 rounded-md bg-surface-alt px-3 py-2 text-[11px] text-ink-3">
              Ce rôle est un poste siège — pas d&apos;affectation chantier
              nécessaire.
            </p>
          )}

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex items-center gap-3 border-t border-line pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Création…" : "Créer l'utilisateur"}
            </button>
            <Link
              href={`/${tenantSlug}/informatique/users`}
              className="text-xs text-ink-3 hover:text-ink"
            >
              Annuler
            </Link>
            <span className="ml-auto text-[11px] text-ink-3">
              Le mot de passe initial sera généré et affiché à la création.
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <p className="sm:col-span-2 -mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
      {children}
    </p>
  );
}
