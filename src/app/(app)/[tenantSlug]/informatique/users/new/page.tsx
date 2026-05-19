"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employé bureau" },
  { value: "WORKER", label: "Ouvrier" },
  { value: "SITE_MANAGER", label: "Chef de Chantier" },
  { value: "WORKS_MANAGER", label: "Conducteur de Travaux" },
  { value: "WORKS_DIRECTOR", label: "Directeur de Travaux" },
  { value: "TECH_DIRECTOR", label: "Directeur Technique" },
  { value: "WAREHOUSE", label: "Magasinier" },
  { value: "LOGISTICS", label: "Logisticien" },
  { value: "ACCOUNTANT", label: "Comptable" },
  { value: "HR", label: "Responsable RH" },
  { value: "DAF", label: "DAF" },
  { value: "SECRETARY_GENERAL", label: "Secrétaire Général(e)" },
  { value: "ARCHIVIST", label: "Référent Documentaire" },
  { value: "TENANT_ADMIN", label: "Administrateur IT (autre)" },
] as const;

const CONTRACT_OPTIONS = ["CDI", "CDD", "STAGE", "JOURNALIER", "INTERIM"] as const;

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
  const [contractType, setContractType] = useState<string>("");
  const [tempPassword, setTempPassword] = useState(generatePwd());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/it/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone || null,
        role,
        position: position || null,
        contractType: contractType || null,
        password: tempPassword,
      }),
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
    const { user } = (await res.json()) as { user: { id: string } };
    router.push(`/${tenantSlug}/informatique/users/${user.id}`);
    router.refresh();
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
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Rôle *">
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={INPUT}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
          <Field label="Poste" className="sm:col-span-2">
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ex: Chef de chantier Yaoundé Nord"
              className={INPUT}
            />
          </Field>
          <Field label="Mot de passe temporaire" className="sm:col-span-2">
            <div className="mt-1 flex gap-2">
              <input
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className={`${INPUT} mt-0 flex-1 font-mono`}
                style={{ marginTop: 0 }}
              />
              <button
                type="button"
                onClick={() => setTempPassword(generatePwd())}
                className="rounded-md border border-line bg-white px-3 py-2 text-xs font-medium text-ink-2 hover:bg-surface-alt"
              >
                Régénérer
              </button>
            </div>
            <span className="mt-1 block text-[11px] text-ink-3">
              L&apos;utilisateur recevra un email avec ce mot de passe et devra le
              changer à la première connexion.
            </span>
          </Field>

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Création…" : "Créer l'utilisateur"}
            </button>
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

function generatePwd(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd + "!";
}
