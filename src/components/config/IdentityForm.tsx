"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useUpdateConfigSection } from "@/hooks/useConfig";
import type { IdentitySettings } from "@/lib/tenant-settings";

interface Props {
  initial: IdentitySettings;
}

export function IdentityForm({ initial }: Props) {
  const [data, setData] = useState<IdentitySettings>(initial);
  const [saved, setSaved] = useState(false);
  const update = useUpdateConfigSection();

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const submit = async () => {
    await update.mutateAsync({ section: "entreprise", payload: data });
    setSaved(true);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Identité légale
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Raison sociale">
            <input
              value={data.legalName}
              onChange={(e) => setData((d) => ({ ...d, legalName: e.target.value }))}
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="RCCM">
            <input
              value={data.rccm}
              onChange={(e) => setData((d) => ({ ...d, rccm: e.target.value }))}
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="NIU (numéro contribuable)">
            <input
              value={data.niu}
              onChange={(e) => setData((d) => ({ ...d, niu: e.target.value }))}
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="Capital social (FCFA)">
            <input
              value={data.capital}
              onChange={(e) => setData((d) => ({ ...d, capital: e.target.value }))}
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] font-mono focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="Plan T-ERP">
            <select
              value={data.plan}
              onChange={(e) => setData((d) => ({ ...d, plan: e.target.value }))}
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            >
              <option value="STARTER">Starter</option>
              <option value="STANDARD">Standard</option>
              <option value="BUSINESS">Business</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Coordonnées du siège
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Adresse">
            <input
              value={data.headquarters.address}
              onChange={(e) =>
                setData((d) => ({ ...d, headquarters: { ...d.headquarters, address: e.target.value } }))
              }
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="Ville">
            <input
              value={data.headquarters.city}
              onChange={(e) =>
                setData((d) => ({ ...d, headquarters: { ...d.headquarters, city: e.target.value } }))
              }
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="Téléphone">
            <input
              value={data.headquarters.phone}
              onChange={(e) =>
                setData((d) => ({ ...d, headquarters: { ...d.headquarters, phone: e.target.value } }))
              }
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={data.headquarters.email}
              onChange={(e) =>
                setData((d) => ({ ...d, headquarters: { ...d.headquarters, email: e.target.value } }))
              }
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Représentants légaux
        </h2>
        <ul className="space-y-2">
          {data.representatives.map((r, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <input
                value={r.role}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    representatives: d.representatives.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)),
                  }))
                }
                placeholder="Rôle"
                className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
              />
              <input
                value={r.name}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    representatives: d.representatives.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                  }))
                }
                placeholder="Nom complet"
                className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Comptes bancaires
        </h2>
        <ul className="space-y-2">
          {data.bankAccounts.map((b, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-2">
              <input
                value={b.bank}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    bankAccounts: d.bankAccounts.map((x, idx) => (idx === i ? { ...x, bank: e.target.value } : x)),
                  }))
                }
                placeholder="Banque"
                className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
              />
              <input
                value={b.accountNumber}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    bankAccounts: d.bankAccounts.map((x, idx) => (idx === i ? { ...x, accountNumber: e.target.value } : x)),
                  }))
                }
                placeholder="Numéro de compte"
                className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] font-mono focus:border-primary-300 focus:outline-none"
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Enregistré</span>}
        <button
          type="submit"
          disabled={update.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
