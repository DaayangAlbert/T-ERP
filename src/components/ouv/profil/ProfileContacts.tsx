"use client";

import { useState } from "react";
import { Pencil, X, Loader2, Smartphone, Home, Users } from "lucide-react";
import { type OuvProfile, useUpdateProfile } from "@/hooks/useOuvProfile";

interface Props {
  profile: OuvProfile;
}

// Section "Mes coordonnées" — éditable champ par champ (phone, adresse,
// personne à prévenir). Le reste est read-only. Tap sur la ligne → modal.
type EditableField = "phone" | "address" | "emergency";

export function ProfileContacts({ profile }: Props) {
  const [editing, setEditing] = useState<EditableField | null>(null);

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">📞 Mes coordonnées</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <ContactRow
          icon={Smartphone}
          iconBg="bg-blue-50 text-blue-700"
          label="Téléphone"
          value={profile.phone ?? "Non renseigné"}
          onEdit={() => setEditing("phone")}
        />
        <ContactRow
          icon={Home}
          iconBg="bg-emerald-50 text-emerald-700"
          label="Adresse"
          value={profile.address ?? "Non renseignée"}
          onEdit={() => setEditing("address")}
        />
        <ContactRow
          icon={Users}
          iconBg="bg-amber-50 text-amber-700"
          label="Personne à prévenir"
          value={
            profile.emergencyContactName
              ? `${profile.emergencyContactName}${
                  profile.emergencyContactPhone ? ` · ${profile.emergencyContactPhone}` : ""
                }`
              : "Non renseignée"
          }
          onEdit={() => setEditing("emergency")}
          isLast
        />
      </div>

      {editing === "phone" && (
        <EditModal
          title="Téléphone mobile"
          fields={[
            {
              key: "phoneMobile",
              label: "Téléphone",
              initial: profile.phone ?? "",
              placeholder: "+237 6 78 24 18 92",
              type: "tel",
            },
          ]}
          onClose={() => setEditing(null)}
        />
      )}
      {editing === "address" && (
        <EditModal
          title="Adresse"
          fields={[
            {
              key: "address",
              label: "Adresse",
              initial: profile.address ?? "",
              placeholder: "Quartier, ville",
              type: "text",
              multiline: true,
            },
          ]}
          onClose={() => setEditing(null)}
        />
      )}
      {editing === "emergency" && (
        <EditModal
          title="Personne à prévenir"
          fields={[
            {
              key: "emergencyContactName",
              label: "Nom complet",
              initial: profile.emergencyContactName ?? "",
              placeholder: "Bernadette MBALLA (épouse)",
              type: "text",
            },
            {
              key: "emergencyContactPhone",
              label: "Téléphone",
              initial: profile.emergencyContactPhone ?? "",
              placeholder: "+237 6 99 11 22 33",
              type: "tel",
            },
          ]}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ContactRow({
  icon: Icon,
  iconBg,
  label,
  value,
  onEdit,
  isLast,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: string;
  onEdit: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left active:bg-purple-50/50 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className="truncate text-[14px] font-bold text-slate-900">{value}</p>
      </div>
      <Pencil className="h-4 w-4 flex-shrink-0 text-purple-500" />
    </button>
  );
}

interface FieldDef {
  key: string;
  label: string;
  initial: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}

function EditModal({
  title,
  fields,
  onClose,
}: {
  title: string;
  fields: FieldDef[];
  onClose: () => void;
}) {
  const mut = useUpdateProfile();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.initial]))
  );
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key]?.trim();
      if (v !== undefined && v !== f.initial.trim()) payload[f.key] = v;
    }
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setError(null);
    try {
      await mut.mutateAsync(payload as Parameters<typeof mut.mutateAsync>[0]);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {fields.map((f) => (
          <div key={f.key} className="mb-3">
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              {f.label}
            </label>
            {f.multiline ? (
              <textarea
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                maxLength={300}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            ) : (
              <input
                type={f.type ?? "text"}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                maxLength={120}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            )}
          </div>
        ))}

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={mut.isPending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          {mut.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
