"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Lock, CheckCircle2, Loader2 } from "lucide-react";

interface FormState {
  companyName: string;
  slug: string;
  taxId: string;
  cnpsId: string;
  fullName: string;
  position: string;
  email: string;
  password: string;
  plan: "STARTER" | "STANDARD" | "BUSINESS" | "ENTERPRISE";
  acceptTerms: boolean;
}

const PLAN_LABELS: Record<FormState["plan"], string> = {
  STARTER: "Starter — 30 jours gratuits",
  STANDARD: "Standard",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugSuggested, setSlugSuggested] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    companyName: "",
    slug: "",
    taxId: "",
    cnpsId: "",
    fullName: "",
    position: "",
    email: "",
    password: "",
    plan: "STARTER",
    acceptTerms: false,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "companyName" && !prev.slug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    setSlugSuggested(null);
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSlugSuggested(null);

    if (!form.acceptTerms) {
      setError("Vous devez accepter les CGU et la Politique de confidentialité.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/register/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...form,
          cnpsId: form.cnpsId || undefined,
          position: form.position || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          suggested?: string;
        };
        if (body.suggested) setSlugSuggested(body.suggested);
        setError(body.error ?? "Une erreur est survenue. Réessayez.");
        return;
      }

      const data = (await res.json()) as { tenant: { slug: string } };
      router.push(`/${data.tenant.slug}/dashboard`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Building2 className="h-4 w-4 text-primary" />
          Votre entreprise
        </div>

        <Field label="Raison sociale" required>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Ex : Njoya BTP SARL"
            className={inputCls}
          />
        </Field>

        <Field
          label="Sous-domaine"
          hint={form.slug ? `Accès : ${form.slug}.terp.cm` : "Sera votre URL T-ERP"}
          required
        >
          <div className="flex items-stretch overflow-hidden rounded-md border border-line focus-within:ring-2 focus-within:ring-primary/40">
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => update("slug", slugify(e.target.value))}
              placeholder="njoya-btp"
              className="flex-1 px-3 py-2 text-[13px] outline-none"
              pattern="^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$"
            />
            <span className="grid place-items-center bg-surface-alt px-3 text-[12px] text-ink-3">
              .terp.cm
            </span>
          </div>
          {slugSuggested && (
            <button
              type="button"
              onClick={() => update("slug", slugSuggested)}
              className="mt-1 text-[12px] text-primary hover:underline"
            >
              Utiliser « {slugSuggested} » à la place
            </button>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="N° contribuable (NIU)" required>
            <input
              type="text"
              required
              value={form.taxId}
              onChange={(e) => update("taxId", e.target.value)}
              placeholder="M01234567890"
              className={inputCls}
            />
          </Field>
          <Field label="N° employeur CNPS" hint="Optionnel">
            <input
              type="text"
              value={form.cnpsId}
              onChange={(e) => update("cnpsId", e.target.value)}
              placeholder="00123456"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <User className="h-4 w-4 text-primary" />
          Votre compte administrateur
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom complet" required>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Albert NJOYA"
              className={inputCls}
            />
          </Field>
          <Field label="Fonction" hint="Optionnel">
            <input
              type="text"
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              placeholder="Directeur Général"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Email professionnel" required>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="albert@njoya-btp.cm"
            className={inputCls}
            autoComplete="email"
          />
        </Field>

        <Field label="Mot de passe" hint="Minimum 8 caractères" required>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={`${inputCls} pl-8`}
              autoComplete="new-password"
            />
          </div>
        </Field>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <Field label="Plan d'abonnement">
          <select
            value={form.plan}
            onChange={(e) => update("plan", e.target.value as FormState["plan"])}
            className={inputCls}
          >
            {(Object.keys(PLAN_LABELS) as Array<keyof typeof PLAN_LABELS>).map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-start gap-2 text-[12.5px] text-ink-2">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => update("acceptTerms", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary/40"
            required
          />
          <span>
            J'accepte les{" "}
            <a href="/terms" target="_blank" rel="noopener" className="text-primary hover:underline">
              CGU
            </a>{" "}
            et la{" "}
            <a href="/privacy" target="_blank" rel="noopener" className="text-primary hover:underline">
              Politique de confidentialité
            </a>{" "}
            de T-ERP.
          </span>
        </label>
      </section>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Création de votre espace…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Créer mon espace T-ERP
          </>
        )}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-line px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/40";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
        {hint && <span className="ml-1 font-normal text-ink-3">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}
