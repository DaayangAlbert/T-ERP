"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Check, Plus, Trash2 } from "lucide-react";

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

interface FinancingRow {
  label: string;
  amountHT: string;
}

/** Ajoute n mois à une date en gérant la fin de mois (31 jan + 1 mois = 28/29 fév). */
function addMonths(iso: string, months: number): Date | null {
  if (!iso || !Number.isFinite(months)) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

const fmtFcfa = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

export default function NewSitePage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<string>("BUILDING");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<string>("PLANNED");
  const [managerId, setManagerId] = useState("");
  const [marginTarget, setMarginTarget] = useState(20);
  const [moaName, setMoaName] = useState("");
  const [moaTypeKind, setMoaTypeKind] = useState("");
  const [contractTypeKind, setContractTypeKind] = useState("");

  // ── Montant du marché ──
  const [financingType, setFinancingType] = useState<"SINGLE" | "JOINT">("SINGLE");
  const [financings, setFinancings] = useState<FinancingRow[]>([{ label: "", amountHT: "" }]);
  const [vatRate, setVatRate] = useState(19.25);
  const [irRate, setIrRate] = useState(2.2);

  // ── Délai d'exécution ──
  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState<number>(12);

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

  // ── Calculs en direct ──
  const totalHT = useMemo(
    () =>
      financings.reduce((sum, f) => {
        const v = Number(f.amountHT);
        return sum + (Number.isFinite(v) && v > 0 ? v : 0);
      }, 0),
    [financings],
  );
  const montantTTC = totalHT * (1 + vatRate / 100);
  const montantNet = totalHT * (1 - irRate / 100);
  const endDate = useMemo(() => addMonths(startDate, durationMonths), [startDate, durationMonths]);

  function setFinancingTypeSafe(next: "SINGLE" | "JOINT") {
    setFinancingType(next);
    if (next === "SINGLE") {
      // On garde la 1re ligne (source + montant).
      setFinancings((rows) => [{ label: rows[0]?.label ?? "", amountHT: rows[0]?.amountHT ?? "" }]);
    } else if (financings.length < 2) {
      setFinancings((rows) => [...rows, { label: "", amountHT: "" }]);
    }
  }

  function updateRow(i: number, patch: Partial<FinancingRow>) {
    setFinancings((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setFinancings((rows) => [...rows, { label: "", amountHT: "" }]);
  }
  function removeRow(i: number) {
    setFinancings((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanFinancings = financings
      .map((f) => ({ label: f.label.trim(), amountHT: Math.round(Number(f.amountHT)) }))
      .filter((f) => Number.isFinite(f.amountHT) && f.amountHT > 0);

    if (cleanFinancings.length === 0) {
      setError("Renseigne au moins un montant HT de financement.");
      return;
    }
    if (cleanFinancings.some((f) => !f.label)) {
      setError("Renseigne la source de chaque financement.");
      return;
    }
    if (!startDate) {
      setError("La date de démarrage est requise.");
      return;
    }
    if (!durationMonths || durationMonths < 1) {
      setError("Le délai d'exécution (en mois) doit être au moins 1.");
      return;
    }

    setSaving(true);
    const body = {
      code: code.trim(),
      name: name.trim(),
      client: client.trim(),
      type,
      region: region.trim() || undefined,
      status,
      managerId: managerId || undefined,
      marginTarget,
      moaName: moaName.trim() || undefined,
      moaTypeKind: moaTypeKind || undefined,
      contractTypeKind: contractTypeKind || undefined,
      financingType,
      financings: cleanFinancings,
      vatRate,
      irRate,
      startDate: new Date(startDate).toISOString(),
      durationMonths,
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
          <Field label="Marge cible (%)" hint="Marge bénéficiaire visée">
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
        </fieldset>

        {/* ───────── Montant du marché ───────── */}
        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Montant du marché</Legend>

          <Field label="Type de financement" required className="sm:col-span-2">
            <div className="mt-1 inline-flex rounded-md border border-line bg-surface-alt p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setFinancingTypeSafe("SINGLE")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  financingType === "SINGLE"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                Financement simple
              </button>
              <button
                type="button"
                onClick={() => setFinancingTypeSafe("JOINT")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  financingType === "JOINT"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                Financement conjoint
              </button>
            </div>
          </Field>

          {financingType === "SINGLE" ? (
            <>
              <Field
                label="Source du financement"
                required
                hint="Ex: BIP, Budget communal, FEICOM, Fonds propres…"
              >
                <input
                  required
                  value={financings[0]?.label ?? ""}
                  onChange={(e) => updateRow(0, { label: e.target.value })}
                  placeholder="Ex: BIP, Fonds propres…"
                  className={INPUT}
                />
              </Field>
              <Field label="Montant HT du marché (FCFA)" required>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={financings[0]?.amountHT ?? ""}
                  onChange={(e) => updateRow(0, { amountHT: e.target.value })}
                  placeholder="150000000"
                  className={`${INPUT} font-mono`}
                />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2 space-y-2">
              <span className="text-xs font-medium text-ink-2">
                Sources de financement (montant HT par source)
                <span className="ml-0.5 text-rose-500">*</span>
              </span>
              {financings.map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    placeholder="Source (ex: BIP, FEICOM, Fonds propres)"
                    className={`${INPUT} flex-1`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={row.amountHT}
                    onChange={(e) => updateRow(i, { amountHT: e.target.value })}
                    placeholder="Montant HT"
                    className={`${INPUT} w-44 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={financings.length <= 1}
                    title="Supprimer cette source"
                    className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-2 bg-white text-ink-3 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-dashed border-line-2 bg-white px-3 text-[13px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une source
              </button>
            </div>
          )}

          <Field label="TVA (%)" required>
            <input
              type="number"
              required
              min={0}
              max={100}
              step={0.05}
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="IR / acompte (%)" required hint="Retenue à la source — net à mandater = HT × (1 − IR)">
            <input
              type="number"
              required
              min={0}
              max={100}
              step={0.05}
              value={irRate}
              onChange={(e) => setIrRate(Number(e.target.value))}
              className={INPUT}
            />
          </Field>

          {/* Aperçu calculé en direct */}
          <div className="sm:col-span-2 grid gap-2 rounded-lg border border-primary-200 bg-primary-50/50 p-3 sm:grid-cols-3">
            <Preview label="Montant HT" value={fmtFcfa(totalHT)} />
            <Preview label={`Montant TTC (TVA ${vatRate}%)`} value={fmtFcfa(montantTTC)} />
            <Preview label={`Net à mandater (IR ${irRate}%)`} value={fmtFcfa(montantNet)} highlight />
          </div>
        </fieldset>

        {/* ───────── Délai d'exécution ───────── */}
        <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <Legend>Délai d&apos;exécution</Legend>
          <Field label="Date de démarrage" required>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Délai d'exécution (mois)" required>
            <input
              type="number"
              required
              min={1}
              step={1}
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <div className="sm:col-span-2 rounded-lg border border-line bg-surface-alt p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
              Date de fin prévue (calculée)
            </div>
            <div className="mt-0.5 font-mono text-[15px] font-bold text-ink">
              {fmtDate(endDate)}
            </div>
          </div>
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

function Preview({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={`mt-0.5 font-mono text-[15px] font-bold ${
          highlight ? "text-primary-800" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
