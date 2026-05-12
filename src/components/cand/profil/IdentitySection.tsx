"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Save } from "lucide-react";
import { SectionCard } from "./SectionCard";

export interface IdentityData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null; // ISO
  address: string | null;
  avatarInitials: string;
}

export function IdentitySection({ initial }: { initial: IdentityData }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    initial.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : "",
  );
  const [address, setAddress] = useState(initial.address ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    firstName !== initial.firstName ||
    lastName !== initial.lastName ||
    (phone || null) !== initial.phone ||
    (dateOfBirth || null) !==
      (initial.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : null) ||
    (address || null) !== initial.address;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const body: Record<string, unknown> = {
      firstName,
      lastName,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      address: address || null,
    };
    const res = await fetch("/api/cand/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <SectionCard
      title="Identité"
      icon={<User className="h-4 w-4" />}
      action={
        dirty ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
        ) : saved ? (
          <span className="text-xs text-emerald-700">✓ Enregistré</span>
        ) : null
      }
    >
      <div className="flex gap-4">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-brand">
          {initial.avatarInitials}
        </div>
        <div className="flex-1 grid gap-3 sm:grid-cols-2">
          <Input label="Prénom *" value={firstName} onChange={setFirstName} />
          <Input label="Nom *" value={lastName} onChange={setLastName} />
          <Input
            label="Email"
            value={initial.email}
            onChange={() => undefined}
            disabled
          />
          <Input label="Téléphone" value={phone} onChange={setPhone} type="tel" />
          <Input
            label="Date de naissance"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            type="date"
          />
          <Input
            label="Adresse"
            value={address}
            onChange={setAddress}
            className="sm:col-span-2"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-alt disabled:text-ink-3"
      />
    </label>
  );
}
