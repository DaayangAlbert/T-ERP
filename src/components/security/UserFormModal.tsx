"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
import { useCreateUser } from "@/hooks/useSecurity";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = Object.values(Role).filter((r) => r !== "SUPER_ADMIN" && r !== "CANDIDATE");

export function UserFormModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<string>(Role.EMPLOYEE);
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateUser();

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!email || !firstName || !lastName) {
      setError("Email, prénom et nom requis.");
      return;
    }
    try {
      const res = await create.mutateAsync({ email, firstName, lastName, role, position: position || undefined, phone: phone || undefined });
      // Reset
      setEmail("");
      setFirstName("");
      setLastName("");
      setPosition("");
      setPhone("");
      onClose();
      if (res.initialPassword) {
        alert(`Utilisateur créé.\n\nMot de passe initial (à transmettre) :\n${res.initialPassword}\n\n${res.note}`);
      } else {
        alert(res.note);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  const ic =
    "w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-ink">Nouvel utilisateur</h3>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Un email d'invitation sera envoyé (ou un mot de passe initial affiché si Resend n'est pas configuré).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11.5px] font-semibold text-ink-2">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={ic} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Prénom</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={ic} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Nom</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={ic} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Téléphone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={ic} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Rôle</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={ic}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11.5px] font-semibold text-ink-2">Poste</span>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className={ic} />
          </label>
        </div>

        {error && <p className="mt-3 text-[12.5px] text-rose-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {create.isPending ? "Création…" : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  );
}
