"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  FileText,
  KeyRound,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/useProfile";
import { updateProfileSchema, changePasswordSchema, type UpdateProfileInput, type ChangePasswordInput } from "@/schemas/user";
import { formatDate, formatRelativeDate } from "@/lib/format";
import { Field, inputClass } from "@/components/auth/LoginForm";

type TabId = "info" | "documents" | "activity" | "security" | "preferences";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info", label: "Informations", icon: <UserIcon className="h-3.5 w-3.5" /> },
  { id: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "activity", label: "Activité", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { id: "security", label: "Sécurité", icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "preferences", label: "Préférences", icon: <KeyRound className="h-3.5 w-3.5" /> },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<TabId>("info");
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) return <ProfileSkeleton />;

  return (
    <>
      <ProfileHero profile={profile} />

      <div className="my-5 flex flex-wrap gap-1 rounded-md bg-surface-alt p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12.5px] font-medium transition",
              tab === t.id
                ? "bg-white text-ink shadow-card"
                : "text-ink-3 hover:text-ink-2"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <KpiRow profile={profile} />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {tab === "info" && <IdentityForm profile={profile} />}
          {tab === "info" && <ProInfoCard profile={profile} />}
          {tab === "documents" && <DocumentsCard />}
          {tab === "activity" && <ActivityCard profile={profile} />}
          {tab === "security" && <SecurityCard profile={profile} />}
          {tab === "preferences" && <PreferencesCard />}
        </div>
        <div className="space-y-4">
          <SidePanel profile={profile} />
        </div>
      </div>
    </>
  );
}

function ProfileHero({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
  if (!profile) return null;
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  return (
    <section
      className="overflow-hidden rounded-xl text-white"
      style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
    >
      <div className="flex flex-wrap items-center gap-5 p-6">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-2xl font-bold ring-2 ring-white/30">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-primary-200">
            {profile.role}
            {profile.tenant && ` · ${profile.tenant.name}`}
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="mt-0.5 text-sm text-primary-100">
            {profile.position ?? "—"}
            {profile.category && ` · ${profile.category}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-primary-100">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </span>
            {profile.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {profile.phone}
              </span>
            )}
            {profile.employeeId && (
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                {profile.employeeId}
              </span>
            )}
            {profile.hireDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Embauché le {formatDate(profile.hireDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiRow({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  const seniority = profile.hireDate
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(profile.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 0;
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Solde congés" value="22" unit="jours" meta="Restants 2026" />
      <Kpi
        label="Ancienneté"
        value={String(Math.floor(seniority / 12))}
        unit={seniority < 12 ? "mois" : "ans"}
        meta={`${seniority} mois cumulés`}
      />
      <Kpi label="Documents" value="14" meta="Personnels" />
      <Kpi
        label="Dernière connexion"
        value={profile.lastLoginAt ? formatRelativeDate(profile.lastLoginAt) : "—"}
        meta="Session active"
      />
    </div>
  );
}

function Kpi({ label, value, unit, meta }: { label: string; value: string; unit?: string; meta?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-2 font-semibold leading-none">
        <span className="font-mono text-[22px] tabular-nums text-ink">{value}</span>
        {unit && <span className="ml-1 text-[12px] text-ink-3">{unit}</span>}
      </div>
      {meta && <div className="mt-2 text-[11.5px] text-ink-3">{meta}</div>}
    </div>
  );
}

function IdentityForm({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  const update = useUpdateProfile();
  const [serverMsg, setServerMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: profile.phone ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    },
  });

  useEffect(() => {
    reset({ phone: profile.phone ?? "", avatarUrl: profile.avatarUrl ?? "" });
  }, [profile.phone, profile.avatarUrl, reset]);

  const onSubmit = async (data: UpdateProfileInput) => {
    setServerMsg(null);
    try {
      await update.mutateAsync({
        phone: data.phone || "",
        avatarUrl: data.avatarUrl || null,
      });
      setServerMsg({ tone: "ok", text: "Profil mis à jour." });
    } catch (err) {
      setServerMsg({
        tone: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-line bg-white p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Identité &amp; coordonnées</h2>
          <p className="text-[11.5px] text-ink-3">
            Modifiable : téléphone, avatar. Le reste passe par les RH.
          </p>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Prénom">
          <input
            value={profile.firstName}
            disabled
            className={clsx(inputClass(false), "cursor-not-allowed bg-surface-alt")}
          />
        </Field>
        <Field label="Nom">
          <input
            value={profile.lastName}
            disabled
            className={clsx(inputClass(false), "cursor-not-allowed bg-surface-alt")}
          />
        </Field>
        <Field label="Email">
          <input
            value={profile.email}
            disabled
            className={clsx(inputClass(false), "cursor-not-allowed bg-surface-alt")}
          />
        </Field>
        <Field label="Téléphone" error={errors.phone?.message}>
          <input
            {...register("phone")}
            placeholder="+237 6XX XX XX XX"
            className={inputClass(Boolean(errors.phone))}
          />
        </Field>
        <Field label="Avatar (URL)" error={errors.avatarUrl?.message}>
          <input
            {...register("avatarUrl")}
            placeholder="https://…"
            className={inputClass(Boolean(errors.avatarUrl))}
          />
        </Field>
      </div>

      {serverMsg && (
        <p
          className={clsx(
            "mt-3 rounded-md px-3 py-2 text-sm ring-1",
            serverMsg.tone === "ok"
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-rose-50 text-rose-700 ring-rose-200"
          )}
        >
          {serverMsg.text}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          disabled={!isDirty || isSubmitting}
          onClick={() => reset({ phone: profile.phone ?? "", avatarUrl: profile.avatarUrl ?? "" })}
          className="h-9 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 hover:border-primary-300 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="h-9 rounded-md bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function ProInfoCard({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-ink">Informations professionnelles</h2>
        <p className="text-[11.5px] text-ink-3">Lecture seule — gestion par les RH.</p>
      </header>
      <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
        <Row label="Matricule">{profile.employeeId ?? "—"}</Row>
        <Row label="Rôle">{profile.role}</Row>
        <Row label="Catégorie">{profile.category ?? "—"}</Row>
        <Row label="Type contrat">{profile.contractType ?? "—"}</Row>
        <Row label="Date d'embauche">{profile.hireDate ? formatDate(profile.hireDate) : "—"}</Row>
        <Row label="N° CNPS">{profile.cnpsNumber ?? "—"}</Row>
      </dl>
    </div>
  );
}

function DocumentsCard() {
  return (
    <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-6 text-center text-sm text-primary-800">
      La GED personnelle (contrats, certificats, attestations) est livrée avec le module documents.
    </div>
  );
}

function ActivityCard({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">Activité récente</h2>
      <ul className="divide-y divide-line text-[12.5px]">
        <li className="flex items-center justify-between py-2">
          <span className="text-ink-2">Connexion réussie</span>
          <span className="text-ink-3">
            {profile.lastLoginAt ? formatRelativeDate(profile.lastLoginAt) : "—"}
          </span>
        </li>
        <li className="flex items-center justify-between py-2">
          <span className="text-ink-2">Email vérifié</span>
          <span className={profile.emailVerified ? "text-success" : "text-warning"}>
            {profile.emailVerified ? "Oui" : "À vérifier"}
          </span>
        </li>
      </ul>
    </div>
  );
}

function SecurityCard({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  const change = useChangePassword();
  const [serverMsg, setServerMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerMsg(null);
    try {
      await change.mutateAsync(data);
      setServerMsg({ tone: "ok", text: "Mot de passe mis à jour." });
      reset();
    } catch (err) {
      setServerMsg({
        tone: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Sécurité du compte</h2>
        <ul className="divide-y divide-line text-[12.5px]">
          <li className="flex items-center justify-between py-2">
            <span>Authentification à 2 facteurs</span>
            <span className={profile.twoFactorEnabled ? "text-success" : "text-ink-3"}>
              {profile.twoFactorEnabled ? "Activée" : "Désactivée"}
            </span>
          </li>
          <li className="flex items-center justify-between py-2">
            <span>Email vérifié</span>
            <span className={profile.emailVerified ? "text-success" : "text-warning"}>
              {profile.emailVerified ? "Oui" : "Non"}
            </span>
          </li>
        </ul>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-line bg-white p-5 shadow-card"
      >
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-ink">Changer mon mot de passe</h2>
          <p className="text-[11.5px] text-ink-3">8 caractères minimum recommandés.</p>
        </header>
        <div className="space-y-3.5">
          <Field label="Mot de passe actuel" required error={errors.currentPassword?.message}>
            <input
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
              className={inputClass(Boolean(errors.currentPassword))}
            />
          </Field>
          <Field label="Nouveau mot de passe" required error={errors.newPassword?.message}>
            <input
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
              className={inputClass(Boolean(errors.newPassword))}
            />
          </Field>
          <Field label="Confirmation" required error={errors.confirmPassword?.message}>
            <input
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={inputClass(Boolean(errors.confirmPassword))}
            />
          </Field>
        </div>

        {serverMsg && (
          <p
            className={clsx(
              "mt-3 rounded-md px-3 py-2 text-sm ring-1",
              serverMsg.tone === "ok"
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-rose-50 text-rose-700 ring-rose-200"
            )}
          >
            {serverMsg.text}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 rounded-md bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {isSubmitting ? "Mise à jour…" : "Changer le mot de passe"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PreferencesCard() {
  return (
    <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-6 text-center text-sm text-primary-800">
      Préférences (notifications email, langue, thème) prévues dans une session ultérieure.
    </div>
  );
}

function SidePanel({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> }) {
  return (
    <>
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Tenant</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {profile.tenant?.name ?? "Aucun tenant rattaché"}
          {profile.tenant?.slug && (
            <>
              <br />
              <span className="font-mono text-[11.5px]">{profile.tenant.slug}.terp.cm</span>
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Aide</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Pour modifier votre poste, salaire ou matricule, contactez votre RH.
        </p>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
    </div>
  );
}
