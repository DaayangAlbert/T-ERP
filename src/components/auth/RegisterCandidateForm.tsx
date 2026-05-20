"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "./LoginForm";
import { registerCandidateSchema, type RegisterCandidateInput } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import {
  ProfessionDatalist,
  PROFESSION_DATALIST_ID,
} from "@/components/common/ProfessionDatalist";

interface Props {
  onSuccess?: () => void;
}

export function RegisterCandidateForm({ onSuccess }: Props) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterCandidateInput>({
    resolver: zodResolver(registerCandidateSchema),
    defaultValues: { acceptTerms: false as unknown as true },
  });

  const onSubmit = async (data: RegisterCandidateInput) => {
    setServerError(null);
    const res = await fetch("/api/auth/register/candidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(json.error ?? "Inscription échouée");
      return;
    }
    setUser(json.user, "");
    onSuccess?.();
    // Un candidat n'a pas de tenant : son espace est /cand/*, pas /dashboard
    // (route tenant qui 404 sans slug).
    router.push("/cand/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <Field label="Nom complet" required error={errors.fullName?.message}>
        <input
          {...register("fullName")}
          placeholder="Prénom NOM"
          autoComplete="name"
          className={inputClass(Boolean(errors.fullName))}
        />
      </Field>

      <Field label="Email" required error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          placeholder="email@exemple.cm"
          autoComplete="email"
          className={inputClass(Boolean(errors.email))}
        />
      </Field>

      <Field label="Téléphone" error={errors.phone?.message}>
        <input
          {...register("phone")}
          placeholder="+237 6XX XX XX XX"
          autoComplete="tel"
          className={inputClass(Boolean(errors.phone))}
        />
      </Field>

      <Field
        label="Métier / poste recherché"
        error={errors.desiredJob?.message}
        hint="Tous secteurs — choisissez ou saisissez votre métier"
      >
        <input
          {...register("desiredJob")}
          list={PROFESSION_DATALIST_ID}
          placeholder="Ex : Maçon, Agent de sécurité, Ménagère, Comptable…"
          className={inputClass(Boolean(errors.desiredJob))}
        />
        <ProfessionDatalist />
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
        <span>J'accepte les CGU et la politique de confidentialité</span>
      </label>
      {errors.acceptTerms?.message && (
        <p className="-mt-2 text-[11px] text-rose-600">{errors.acceptTerms.message}</p>
      )}

      {serverError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-full rounded-md bg-primary-500 text-sm font-medium text-white transition hover:bg-primary-600 hover:shadow-brand disabled:opacity-60"
      >
        {isSubmitting ? "Création…" : "Créer mon compte candidat"}
      </button>
    </form>
  );
}
