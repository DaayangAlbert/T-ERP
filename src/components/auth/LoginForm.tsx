"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: Props) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.login);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(json.error ?? "Connexion échouée");
      return;
    }
    setUser(json.user, "");
    if (json.user.tenantId) {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.user?.tenant) setTenant(me.user.tenant);
      }
    }
    onSuccess?.();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <Field label="Email" required error={errors.email?.message}>
        <input
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@entreprise.cm"
          {...register("email")}
          className={inputClass(Boolean(errors.email))}
        />
      </Field>

      <Field label="Mot de passe" required error={errors.password?.message}>
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className={clsx(inputClass(Boolean(errors.password)), "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            aria-label={showPwd ? "Masquer" : "Afficher"}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

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
        {isSubmitting ? "Connexion…" : "Se connecter"}
      </button>

      <p className="text-center text-[11.5px] text-ink-3">
        Compte démo : <span className="font-mono text-ink-2">albert@batimcam.cm / Demo2026!</span>
      </p>
    </form>
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-ink-3">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-rose-600">{error}</span>}
    </label>
  );
}

export function inputClass(hasError: boolean) {
  return clsx(
    "h-10 w-full rounded-md border bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2",
    hasError
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200"
      : "border-line-2 focus:border-primary-400 focus:ring-primary-200"
  );
}
