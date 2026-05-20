"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Check } from "lucide-react";

const SITE_TYPES = [
  { value: "ROAD", label: "Routier (BTP)" },
  { value: "BUILDING", label: "Bâtiment" },
  { value: "CIVIL_ENG", label: "Génie civil" },
  { value: "DEVELOPMENT", label: "Aménagement" },
  { value: "HYDRAULIC", label: "Forage / AEP" },
] as const;

const SITE_STATUSES = [
  { value: "PLANNED", label: "Planifié" },
  { value: "ACTIVE", label: "Actif" },
  { value: "ON_HOLD", label: "En pause" },
] as const;

const MOA_TYPES = [
  { value: "", label: "—" },
  { value: "PUBLIC", label: "Public (État, commune, parapublic)" },
  { value: "PRIVATE", label: "Privé" },
  { value: "PARAPUBLIC", label: "Parapublic" },
  { value: "INTERNATIONAL", label: "International (bailleur, ONG)" },
] as const;

const CONTRACT_TYPES = [
  { value: "", label: "—" },
  { value: "FIRM_PRICE", label: "Marché à prix ferme" },
  { value: "UNIT_PRICE", label: "Marché à prix unitaires" },
  { value: "COST_PLUS", label: "Régie (cost plus)" },
  { value: "DESIGN_BUILD", label: "Conception-réalisation" },
] as const;

interface ManagerOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function NewSitePage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<string>("BUILDING");
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [status, setStatus] = useState<string>("PLANNED");
  const [managerId, setManagerId] = useState("");
  const [marginTarget, setMarginTarget] = useState(20);
  const [moaName, setMoaName] = useState("");
  const [moaTypeKind, setMoaTypeKind] = useState("");
  const [contractTypeKind, setContractTypeKind] = useState("");

  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; code: string; name: string } | null>(null);

  // Charge la liste des directeurs de travaux possibles
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/it/users?page=1&role=WORKS_DIRECTOR");
        if (!res.ok) return;
        const data = (await res.json()) as { items: ManagerOption[] };
        setManagers(data.items ?? []);
      } catch {
        /* silencieux */
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      code: code.trim(),
      name: name.trim(),
      client: client.trim(),
      type,
      region: region.trim() || undefined,
      budget: Math.round(budget),
      startDate: startDate ? new Date(startDate).toISOString() : "",
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate).toISOString() : "",
      status,
      managerId: managerId || undefined,
      marginTarget,
      moaName: moaName.trim() || undefined,
      moaTypeKind: moaTypeKind || undefined,
      contractTypeKind: contractTypeKind || undefined,
    };
    const res = await fetch("/api/it/sites", {
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
    const json = (await res.json()) as { site: { id: string; code: string; name: string } };
    setCreated(json.site);
    router.refresh();
  }

  if (created) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-semibold text-emerald-800">Chantier créé</h1>
          </div>
          <p className="mt-2 text-sm text-emerald-800">
            Le chantier <strong>{created.name}</strong> (code{" "}
            <span className="font-mono">{created.code}</span>) a été créé avec
            succès.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/${tenantSlug}/informatique/sites`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
            >
              Retour à la liste
            </Link>
            <Link
              href={`/${tenantSlug}/chantiers/${created.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 bg-white px-4 text-sm font-medium text-ink-2 hover:border-primary-300"
            >
              Voir le détail
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <Link
            href={`/${tenantSlug}/informatique/sites`}
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux chantiers
          </Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Nouveau chantier
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Création d&apos;un nouveau projet — accessible ensuite par les profils
            DT, DTrav, CC, Comptable et DG.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:grid-cols-2"
      >
        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Identification</Legend>
          <Field label="Code chantier" required hint="Ex: CHT-2026-031">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CHT-2026-031"
              className={`${INPUT} font-mono`}
            />
          </Field>
          <Field label="Nom du chantier" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pont Mfoundi - Yaoundé"
              className={INPUT}
            />
          </Field>
          <Field label="Client (maître d'œuvre)" required>
            <input
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Ex: Commune Yaoundé I"
              className={INPUT}
            />
          </Field>
          <Field label="Région">
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Centre, Littoral, Ouest..."
              className={INPUT}
            />
          </Field>
        </fieldset>

        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Caractéristiques</Legend>
          <Field label="Type de chantier" required>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={INPUT}
            >
              {SITE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut initial">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={INPUT}
            >
              {SITE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Budget (FCFA)"
            required
            hint="Montant total alloué au chantier"
          >
            <input
              type="number"
              required
              min={0}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              placeholder="150000000"
              className={INPUT}
            />
          </Field>
          <Field
            label="Marge cible (%)"
            hint="Marge bénéficiaire visée"
          >
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={marginTarget}
              onChange={(e) => setMarginTarget(Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Date de démarrage" required>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Date de fin prévue" required>
            <input
              type="date"
              required
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
              className={INPUT}
            />
          </Field>
        </fieldset>

        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Maître d&apos;ouvrage (MOA)</Legend>
          <Field label="Nom du MOA">
            <input
              value={moaName}
              onChange={(e) => setMoaName(e.target.value)}
              placeholder="Ex: Ministère des Travaux Publics"
              className={INPUT}
            />
          </Field>
          <Field label="Type de MOA">
            <select
              value={moaTypeKind}
              onChange={(e) => setMoaTypeKind(e.target.value)}
              className={INPUT}
            >
              {MOA_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de contrat" className="sm:col-span-2">
            <select
              value={contractTypeKind}
              onChange={(e) => setContractTypeKind(e.target.value)}
              className={INPUT}
            >
              {CONTRACT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Direction</Legend>
          <Field
            label="Directeur de travaux (manager du chantier)"
            className="sm:col-span-2"
            hint={
              managers.length === 0
                ? "Aucun WORKS_DIRECTOR créé pour ce tenant — l'affectation pourra se faire plus tard."
                : undefined
            }
          >
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={INPUT}
            >
              <option value="">— Non assigné —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.role})
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        {error && (
          <p className="sm:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Link
            href={`/${tenantSlug}/informatique/sites`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 bg-white px-4 text-sm font-medium text-ink-2 hover:border-primary-300"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Création…" : "Créer le chantier"}
          </button>
        </div>
      </form>
    </div>
  );
}

const INPUT =
  "mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200";

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
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
