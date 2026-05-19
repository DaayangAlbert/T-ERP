"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Check } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}

interface SuccessPayload {
  user: { id: string; email: string; firstName: string; lastName: string };
  initialPassword: string;
  message: string;
}

/**
 * Modale de création du 1er DG d'un tenant. Calquée sur FirstAdminModal
 * mais cible /api/admin/tenants/[id]/first-dg qui crée un user avec
 * role=DG et tous les pouvoirs métier + IT.
 *
 * Seul le SUPER_ADMIN voit ce bouton dans /admin/tenants.
 */
export function FirstDgModal({ tenantId, tenantName, onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/tenants/${tenantId}/first-dg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        position: position.trim() || undefined,
      }),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        json.error ??
          (res.status === 409
            ? "Un DG existe déjà pour ce tenant"
            : "Erreur création"),
      );
      return;
    }
    setSuccess(json as SuccessPayload);
    router.refresh();
  }

  function copyCreds() {
    if (!success) return;
    const text = `Login: ${success.user.email}\nMot de passe initial: ${success.initialPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-xl shadow-2xl"
        style={{ background: "#0F172A", borderColor: "#334155", borderWidth: 1 }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: "#334155" }}
        >
          <h3 className="text-sm font-semibold text-white">
            Créer le 1<sup>er</sup> DG · {tenantName}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-7 w-7 place-items-center rounded text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              ✓ Compte DG créé pour <strong>{success.user.firstName} {success.user.lastName}</strong>.
              <br />
              {success.message}
            </div>
            <div
              className="rounded-md border p-3"
              style={{ borderColor: "#334155", background: "#1E293B" }}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Identifiants à transmettre par canal sécurisé
              </div>
              <div className="space-y-1 font-mono text-xs text-white">
                <div>Email : <span className="text-cyan-300">{success.user.email}</span></div>
                <div>Mot de passe : <span className="text-cyan-300">{success.initialPassword}</span></div>
              </div>
              <button
                type="button"
                onClick={copyCreds}
                className={clsx(
                  "mt-3 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition",
                  copied
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="text-[11px] text-amber-200/80">
              ⚠ Communique ces identifiants au DG par WhatsApp / SMS / téléphone — pas par
              email non chiffré. L'utilisateur devra changer son mot de passe à la première connexion.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-full rounded-md bg-primary-500 text-sm font-medium text-white hover:bg-primary-600"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 px-5 py-5">
            <Field label="Email pro" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dg@aa-hatlad.cm"
                className={inputClass()}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className={inputClass()}
                />
              </Field>
              <Field label="Nom" required>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="DUPONT"
                  className={inputClass()}
                />
              </Field>
            </div>
            <Field label="Téléphone (optionnel)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6 90 00 00 00"
                className={inputClass()}
              />
            </Field>
            <Field label="Poste / Fonction (optionnel)">
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Directeur Général"
                className={inputClass()}
              />
            </Field>

            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              Le DG aura <strong>tous les pouvoirs</strong> sur ce tenant : pilotage métier
              (CA, budgets, objectifs), gestion utilisateurs, paramètres tenant,
              gouvernance, marchés clients, contentieux, courriers officiels.
            </p>

            {error && (
              <p className="rounded-md bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-md border border-white/15 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-10 flex-1 rounded-md bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
              >
                {busy ? "Création…" : "Créer le DG"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-white/70">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function inputClass() {
  return "h-10 w-full rounded-md border bg-[#1E293B] px-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 border-white/15";
}
