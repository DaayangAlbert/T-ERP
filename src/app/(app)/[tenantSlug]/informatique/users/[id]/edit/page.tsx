"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPen, Building2, Check } from "lucide-react";

const CONTRACT_OPTIONS = ["CDI", "CDD", "STAGE", "JOURNALIER", "INTERIM"] as const;

const SITE_ROLES = new Set([
  "WORKER",
  "SITE_MANAGER",
  "WORKS_MANAGER",
  "WORKS_DIRECTOR",
  "WAREHOUSE",
  "LOGISTICS",
]);

// Rôles modifiables par l'IT (idem création — SUPER_ADMIN / TENANT_ADMIN exclus).
const ROLE_OPTIONS = [
  { value: "OWNER", label: "Propriétaire / PCA" },
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

interface SiteOption {
  id: string;
  code: string;
  name: string;
  region: string | null;
  status: string;
}

interface UserData {
  id: string;
  employeeId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  position: string | null;
  category: string | null;
  contractType: string | null;
  hireDate: string | null;
  matricule: string | null;
  professionalCategory: string | null;
  dateOfBirth: string | null;
  cniNumber: string | null;
  phoneMobile: string | null;
  personalEmail: string | null;
  address: string | null;
  familyStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  cnpsNumber: string | null;
  niu: string | null;
  bankName: string | null;
  bankAgency: string | null;
  rib: string | null;
  assignedSiteIds: string[];
}

function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const userId = params?.id ?? "";

  const [loaded, setLoaded] = useState(false);
  const [originalRole, setOriginalRole] = useState("EMPLOYEE");
  // role éditable séparément du originalRole (qui sert juste à afficher
  // l'avant + à savoir si on a changé pour SITE_ROLES).
  const [role, setRole] = useState("EMPLOYEE");
  const [originalEmail, setOriginalEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [category, setCategory] = useState("");
  const [contractType, setContractType] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [assignedSiteIds, setAssignedSiteIds] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState("");

  const [matricule, setMatricule] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cniNumber, setCniNumber] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [address, setAddress] = useState("");
  const [familyStatus, setFamilyStatus] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

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
  const [success, setSuccess] = useState(false);

  // Charge l'utilisateur existant
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`/api/it/users/${userId}`, { credentials: "same-origin" });
        if (!res.ok) {
          setError(`Impossible de charger l'utilisateur (HTTP ${res.status})`);
          return;
        }
        const json = (await res.json()) as { user: UserData };
        const u = json.user;
        setOriginalRole(u.role);
        setRole(u.role);
        setOriginalEmail(u.email);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setPhone(u.phone ?? "");
        setPosition(u.position ?? "");
        setCategory(u.category ?? "");
        setContractType(u.contractType ?? "");
        setHireDate(isoToDateInput(u.hireDate));
        setStatus(u.status);
        setAssignedSiteIds(u.assignedSiteIds ?? []);
        setMatricule(u.matricule ?? "");
        setDateOfBirth(isoToDateInput(u.dateOfBirth));
        setCniNumber(u.cniNumber ?? "");
        setPhoneMobile(u.phoneMobile ?? "");
        setPersonalEmail(u.personalEmail ?? "");
        setAddress(u.address ?? "");
        setFamilyStatus(u.familyStatus ?? "");
        setEmergencyContactName(u.emergencyContactName ?? "");
        setEmergencyContactPhone(u.emergencyContactPhone ?? "");
        setCnpsNumber(u.cnpsNumber ?? "");
        setNiu(u.niu ?? "");
        setProfessionalCategory(u.professionalCategory ?? "");
        setBankName(u.bankName ?? "");
        setBankAgency(u.bankAgency ?? "");
        setRib(u.rib ?? "");
        setLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [userId]);

  // Charge les chantiers
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

  const showSiteSelector = SITE_ROLES.has(originalRole);
  const filteredSites = sites.filter((s) => {
    if (!siteFilter) return true;
    const q = siteFilter.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.region?.toLowerCase().includes(q) ?? false);
  });

  function toggleSite(id: string) {
    setAssignedSiteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      firstName,
      lastName,
      phone: phone || null,
      // N'envoyer le rôle que s'il a changé — évite d'écraser des side-effects
      // que la route applique sur changement de rôle.
      ...(role !== originalRole ? { role } : {}),
      position: position || null,
      category: category || null,
      contractType: contractType || null,
      hireDate: hireDate ? new Date(hireDate).toISOString() : null,
      status,
      assignedSiteIds: showSiteSelector ? assignedSiteIds : [],
      matricule: matricule || null,
      professionalCategory: professionalCategory || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      cniNumber: cniNumber || null,
      phoneMobile: phoneMobile || null,
      personalEmail: personalEmail || null,
      address: address || null,
      familyStatus: familyStatus || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      cnpsNumber: cnpsNumber || null,
      niu: niu || null,
      bankName: bankName || null,
      bankAgency: bankAgency || null,
      rib: rib || null,
    };
    const res = await fetch(`/api/it/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } };
      const flat = data.issues?.fieldErrors
        ? Object.entries(data.issues.fieldErrors).map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`).join(" · ")
        : null;
      setError(flat ?? data.error ?? "Erreur de mise à jour");
      return;
    }
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  if (!loaded && !error) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-md bg-surface-alt" />
        <div className="h-96 animate-pulse rounded-md bg-surface-alt" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/${tenantSlug}/informatique/users`} className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </Link>
      </div>

      <section className="rounded-xl border border-line bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-ink">Modifier l&apos;utilisateur</h1>
          </div>
          <div className="text-xs text-ink-3">
            <span className="font-mono">{originalEmail}</span> · <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">{originalRole}</span>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <Check className="h-4 w-4" /> Modifications enregistrées.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Identité</Legend>
            <Field label="Prénom *">
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Nom *">
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Email (verrouillé)">
              <input type="email" disabled value={originalEmail} className={`${INPUT} bg-surface-alt text-ink-3`} />
            </Field>
            <Field label="Téléphone">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 ..." className={INPUT} />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Poste &amp; statut</Legend>
            <Field
              label="Rôle"
              hint={
                role !== originalRole
                  ? `⚠ Changement de rôle : ${originalRole} → ${role}. ` +
                    (role === "DG"
                      ? "Tous les pouvoirs DG seront activés."
                      : originalRole === "DG"
                        ? "Les pouvoirs DG seront révoqués."
                        : "")
                  : "Modifier le rôle adapte automatiquement les pouvoirs (promotion/démotion)."
              }
            >
              <select value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
                {/* Si le user actuel a un rôle non-listé (SUPER_ADMIN/TENANT_ADMIN), on l'affiche en disabled */}
                {!ROLE_OPTIONS.some((r) => r.value === originalRole) && (
                  <option value={originalRole} disabled>
                    {originalRole} (verrouillé)
                  </option>
                )}
              </select>
            </Field>
            <Field label="Statut">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            </Field>
            <Field label="Poste / Intitulé">
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex: Chef de chantier Yaoundé Nord" className={INPUT} />
            </Field>
            <Field label="Catégorie professionnelle">
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Cadre HC, ETAM 6, OQ 3, OS 1…" className={INPUT} />
            </Field>
            <Field label="Type de contrat">
              <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={INPUT}>
                <option value="">—</option>
                {CONTRACT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date d'embauche">
              <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Matricule employeur">
              <input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="Ex: BTC-2024-0142" className={INPUT} />
            </Field>
            <Field label="Catégorie pro grille BTP">
              <input value={professionalCategory} onChange={(e) => setProfessionalCategory(e.target.value)} placeholder="Ex: Catégorie 8 · échelon 3" className={INPUT} />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Identité personnelle</Legend>
            <Field label="Date de naissance">
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={INPUT} />
            </Field>
            <Field label="N° CNI">
              <input value={cniNumber} onChange={(e) => setCniNumber(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Téléphone perso">
              <input type="tel" value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} placeholder="+237 ..." className={INPUT} />
            </Field>
            <Field label="Email perso">
              <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} placeholder="prenom@gmail.com" className={INPUT} />
            </Field>
            <Field label="Adresse" className="sm:col-span-2">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Yaoundé · Mvog-Mbi · BP 1234" className={INPUT} />
            </Field>
            <Field label="Situation familiale">
              <input value={familyStatus} onChange={(e) => setFamilyStatus(e.target.value)} placeholder="Marié · 3 enfants" className={INPUT} />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Contact d'urgence (nom)">
              <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Contact d'urgence (téléphone)">
              <input type="tel" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={INPUT} />
            </Field>
          </fieldset>

          <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Legend>Données légales &amp; bancaires</Legend>
            <Field label="N° CNPS">
              <input value={cnpsNumber} onChange={(e) => setCnpsNumber(e.target.value)} placeholder="10-1234567" className={INPUT} />
            </Field>
            <Field label="NIU (DGI)">
              <input value={niu} onChange={(e) => setNiu(e.target.value)} placeholder="F218014203187" className={INPUT} />
            </Field>
            <Field label="Banque">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Afriland First Bank" className={INPUT} />
            </Field>
            <Field label="Agence">
              <input value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="Yaoundé Centre" className={INPUT} />
            </Field>
            <Field label="RIB" className="sm:col-span-2">
              <input value={rib} onChange={(e) => setRib(e.target.value)} placeholder="CM21 1234 5678 9012 3456 789" className={`${INPUT} font-mono`} />
            </Field>
          </fieldset>

          {showSiteSelector ? (
            <fieldset className="sm:col-span-2">
              <Legend>
                <Building2 className="mr-1 inline h-3.5 w-3.5" />
                Affectation chantiers ({assignedSiteIds.length} sélectionné{assignedSiteIds.length > 1 ? "s" : ""})
              </Legend>
              {loadingSites ? (
                <p className="text-xs text-ink-3">Chargement des chantiers…</p>
              ) : sites.length === 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Aucun chantier disponible.</p>
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
                      <p className="p-3 text-xs text-ink-3">Aucun chantier ne correspond.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {filteredSites.map((s) => {
                          const checked = assignedSiteIds.includes(s.id);
                          return (
                            <li key={s.id}>
                              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white">
                                <input type="checkbox" checked={checked} onChange={() => toggleSite(s.id)} className="h-4 w-4 rounded border-line text-primary" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-ink">{s.name}</div>
                                  <div className="text-[11px] text-ink-3">{s.code}{s.region ? ` · ${s.region}` : ""}</div>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-ink-3/10 text-ink-3"}`}>{s.status}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </fieldset>
          ) : (
            <p className="sm:col-span-2 rounded-md bg-surface-alt px-3 py-2 text-[11px] text-ink-3">
              Ce rôle est un poste siège — pas d&apos;affectation chantier nécessaire.
            </p>
          )}

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{error}</p>
          ) : null}

          <div className="sm:col-span-2 flex items-center gap-3 border-t border-line pt-4">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-primary-600 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
            <Link href={`/${tenantSlug}/informatique/users`} className="text-xs text-ink-3 hover:text-ink">Annuler</Link>
            <Link href={`/${tenantSlug}/informatique/users/${userId}`} className="ml-auto text-xs text-primary hover:underline">
              Voir la fiche complète →
            </Link>
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
  hint,
  children,
}: {
  label: string;
  className?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-ink-3">{hint}</span>}
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
