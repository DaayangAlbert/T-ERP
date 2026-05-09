"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, inputClass } from "./LoginForm";
import { registerCompanySchema, type RegisterCompanyInput } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { Eye, EyeOff, Shield } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  onSuccess?: () => void;
}

const PLAN_LABELS = [
  { value: "STARTER", label: "Starter — 30 j gratuits puis 180 K FCFA/mois" },
  { value: "STANDARD", label: "Standard — 180 K FCFA/mois (jusqu'à 50 utilisateurs)" },
  { value: "BUSINESS", label: "Business — 480 K FCFA/mois (jusqu'à 200 utilisateurs)" },
  { value: "ENTERPRISE", label: "Enterprise — 1,2 M FCFA/mois (utilisateurs illimités)" },
] as const;

function autoSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function RegisterCompanyForm({ onSuccess }: Props) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.login);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuggestion, setServerSuggestion] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<RegisterCompanyInput>({
    resolver: zodResolver(registerCompanySchema),
    defaultValues: {
      plan: "STARTER",
      acceptTerms: false as unknown as true,
      position: "Responsable informatique",
    },
  });

  const companyName = watch("companyName");
  useEffect(() => {
    if (!dirtyFields.slug && companyName) {
      setValue("slug", autoSlug(companyName), { shouldValidate: false });
    }
  }, [companyName, dirtyFields.slug, setValue]);

  const onSubmit = async (data: RegisterCompanyInput) => {
    setServerError(null);
    setServerSuggestion(null);
    const res = await fetch("/api/auth/register/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(json.error ?? "Inscription échouée");
      if (json.suggested) setServerSuggestion(json.suggested);
      return;
    }
    setUser(json.user, "");
    setTenant({ id: json.tenant.id, slug: json.tenant.slug, name: json.tenant.name });
    onSuccess?.();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="flex items-start gap-2 rounded-md border border-primary-200 bg-primary-50 p-2.5 text-[12px] text-ink-2">
        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
        <span>
          L'informaticien d'entreprise inscrit le <strong>tenant</strong> de sa société et reçoit
          les droits administrateur. Il pourra ensuite créer les comptes des autres collaborateurs.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Raison sociale" required error={errors.companyName?.message}>
          <input
            {...register("companyName")}
            placeholder="MaSociété SA"
            className={inputClass(Boolean(errors.companyName))}
          />
        </Field>

        <Field label="Sous-domaine" required error={errors.slug?.message}>
          <div
            className={clsx(
              "flex items-center overflow-hidden rounded-md border bg-white",
              errors.slug ? "border-rose-300" : "border-line-2 focus-within:border-primary-400"
            )}
          >
            <input
              {...register("slug")}
              placeholder="masociete"
              className="h-10 flex-1 border-0 bg-transparent px-3 text-sm focus:outline-none"
            />
            <span className="bg-surface-alt border-l border-line-2 px-3 text-[12px] text-ink-3">
              .terp.cm
            </span>
          </div>
        </Field>

        <Field label="N° contribuable" required error={errors.taxId?.message}>
          <input
            {...register("taxId")}
            placeholder="P0123456789012X"
            className={inputClass(Boolean(errors.taxId))}
          />
        </Field>

        <Field label="N° employeur CNPS" error={errors.cnpsId?.message}>
          <input
            {...register("cnpsId")}
            placeholder="10-XXXXXXX-X"
            className={inputClass(Boolean(errors.cnpsId))}
          />
        </Field>

        <Field label="Vos nom et prénom" required error={errors.fullName?.message}>
          <input
            {...register("fullName")}
            placeholder="Prénom NOM"
            autoComplete="name"
            className={inputClass(Boolean(errors.fullName))}
          />
        </Field>

        <Field label="Votre fonction" error={errors.position?.message}>
          <input {...register("position")} className={inputClass(Boolean(errors.position))} />
        </Field>
      </div>

      <Field label="Email professionnel" required error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          placeholder="it@masociete.cm"
          autoComplete="email"
          className={inputClass(Boolean(errors.email))}
        />
      </Field>

      <Field label="Plan choisi" required error={errors.plan?.message}>
        <select {...register("plan")} className={clsx(inputClass(false), "appearance-none")}>
          {PLAN_LABELS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Mot de passe" required error={errors.password?.message} hint="8 caractères minimum">
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            {...register("password")}
            autoComplete="new-password"
            className={clsx(inputClass(Boolean(errors.password)), "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <label className="flex items-start gap-2 text-[12.5px] text-ink-2">
        <input
          type="checkbox"
          {...register("acceptTerms")}
          className="mt-0.5 h-4 w-4 rounded border-line-2 text-primary-500 focus:ring-primary-500"
        />
        <span>
          J'accepte les CGV et la politique de confidentialité au nom de mon entreprise
        </span>
      </label>
      {errors.acceptTerms?.message && (
        <p className="-mt-2 text-[11px] text-rose-600">{errors.acceptTerms.message}</p>
      )}

      {serverError && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {serverError}
          {serverSuggestion && (
            <button
              type="button"
              onClick={() => setValue("slug", serverSuggestion, { shouldValidate: true, shouldDirty: true })}
              className="mt-1 block text-[12px] font-medium text-rose-800 underline"
            >
              Essayer "{serverSuggestion}"
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-full rounded-md bg-primary-500 text-sm font-medium text-white transition hover:bg-primary-600 hover:shadow-brand disabled:opacity-60"
      >
        {isSubmitting ? "Création…" : "Créer mon entreprise (admin)"}
      </button>
    </form>
  );
}
