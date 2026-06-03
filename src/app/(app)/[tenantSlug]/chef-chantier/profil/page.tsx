"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  HardHat,
  Mail,
  Package,
  Shield,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { clsx } from "clsx";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { PageHelp } from "@/components/help/PageHelp";
import { CcProfilTutorial } from "@/components/help/tutorials/CcProfilTutorial";

interface ProfileData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    matricule: string | null;
    position: string | null;
    professionalCategory: string | null;
    category: string | null;
    department: string | null;
    hireDate: string | null;
    contractType: string | null;
    phoneMobile: string | null;
    bankName: string | null;
    bankAgency: string | null;
  };
  sites: Array<{
    id: string;
    code: string;
    name: string;
    client: string;
    progress: number;
    status: string;
    startDate: string;
    plannedEndDate: string;
    region: string | null;
    manager: { fullName: string; role: string } | null;
    workersCount: number;
  }>;
  workforce: Array<{
    siteId: string;
    user: { id: string; fullName: string; avatarUrl: string | null; qualification: string | null };
  }>;
  stats: {
    sitesCount: number;
    workersCount: number;
    pendingLeavesCount: number;
    pendingMaterialCount: number;
    openHseCount: number;
  };
}

export default function CcProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cc", "profile"],
    queryFn: async (): Promise<ProfileData> => {
      const res = await fetch("/api/cc/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Mon espace Chef de Chantier
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data?.user
              ? `${data.user.firstName} ${data.user.lastName} · ${data.user.position ?? "Chef de chantier"}`
              : ""}
            {data?.user.matricule ? ` · ${data.user.matricule}` : ""}
          </p>
        </div>
        <PageHelp title="Aide — Mon espace CC"><CcProfilTutorial /></PageHelp>
      </header>

      <AvatarUploader />

      {/* KPIs activité */}
      {data && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Chantiers"
            value={data.stats.sitesCount.toString()}
            tone="primary"
          />
          <KpiCard
            icon={<HardHat className="h-4 w-4" />}
            label="Ouvriers"
            value={data.stats.workersCount.toString()}
          />
          <KpiCard
            icon={<Calendar className="h-4 w-4" />}
            label="Congés à valider"
            value={data.stats.pendingLeavesCount.toString()}
            tone={data.stats.pendingLeavesCount > 0 ? "warning" : "default"}
            link="/chef-chantier/validations"
          />
          <KpiCard
            icon={<Package className="h-4 w-4" />}
            label="Demandes matériel"
            value={data.stats.pendingMaterialCount.toString()}
            tone={data.stats.pendingMaterialCount > 0 ? "info" : "default"}
            link="/chef-chantier/demandes-materiel"
          />
          <KpiCard
            icon={<ShieldAlert className="h-4 w-4" />}
            label="HSE en cours"
            value={data.stats.openHseCount.toString()}
            tone={data.stats.openHseCount > 0 ? "danger" : "ok"}
            link="/chef-chantier/hse"
          />
        </section>
      )}

      {isLoading && <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && data && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Chantiers assignés */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Building2 className="h-3.5 w-3.5" /> Mes chantiers
              <span className="ml-auto rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                {data.sites.length}
              </span>
            </h2>
            {data.sites.length === 0 ? (
              <p className="mt-2 text-[12.5px] italic text-ink-3">
                Aucun chantier assigné. Contactez le Directeur de Travaux.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {data.sites.map((s) => (
                  <li
                    key={s.id}
                    style={{ minHeight: 56 }}
                    className="flex items-start justify-between gap-2 rounded-md border border-line bg-surface-alt px-3 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">
                        {s.code}{" "}
                        <span className="font-normal text-ink-3">· {s.name}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-ink-3">
                        Client : {s.client}
                        {s.region && ` · ${s.region}`}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-ink-3">
                        Livraison{" "}
                        {new Date(s.plannedEndDate).toLocaleDateString("fr-FR")}
                        {s.manager && ` · DTrav ${s.manager.fullName}`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={clsx(
                          "rounded px-2 py-0.5 text-[11px] font-semibold",
                          s.progress >= 80
                            ? "bg-emerald-50 text-emerald-700"
                            : s.progress >= 40
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700",
                        )}
                      >
                        {s.progress}%
                      </span>
                      <span className="text-[10px] text-ink-3">
                        {s.workersCount} ouvrier{s.workersCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Identité & affiliation */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Briefcase className="h-3.5 w-3.5" /> Identité professionnelle
            </h2>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-2">
              <KV label="Fonction">{data.user.position ?? "—"}</KV>
              <KV label="Catégorie pro">{data.user.professionalCategory ?? data.user.category ?? "—"}</KV>
              <KV label="Contrat">{data.user.contractType ?? "—"}</KV>
              <KV label="Embauche">
                {data.user.hireDate
                  ? new Date(data.user.hireDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
                  : "—"}
              </KV>
              <KV label="Téléphone">{data.user.phoneMobile ?? "—"}</KV>
              <KV label="Email pro">{data.user.email}</KV>
              <KV label="Banque">
                {data.user.bankName ? (
                  <>
                    {data.user.bankName}
                    {data.user.bankAgency && (
                      <span className="text-[11px] text-ink-3"> · {data.user.bankAgency}</span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </KV>
              <KV label="Matricule">{data.user.matricule ?? "—"}</KV>
            </dl>
          </section>

          {/* Équipes — ouvriers par chantier */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Users className="h-3.5 w-3.5" /> Mes équipes
              <span className="ml-auto rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                {data.stats.workersCount}
              </span>
            </h2>
            {data.workforce.length === 0 ? (
              <p className="mt-2 text-[12.5px] italic text-ink-3">Aucun ouvrier rattaché.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {data.sites.map((s) => {
                  const workers = data.workforce.filter((w) => w.siteId === s.id);
                  if (workers.length === 0) return null;
                  return (
                    <div key={s.id}>
                      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                        {s.code} ({workers.length})
                      </div>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {workers.slice(0, 8).map((w) => (
                          <li
                            key={`${s.id}-${w.user.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-alt px-2 py-0.5 text-[11px] text-ink-2"
                            title={w.user.qualification ?? undefined}
                          >
                            <MiniAvatar fullName={w.user.fullName} url={w.user.avatarUrl} />
                            <span>{w.user.fullName}</span>
                          </li>
                        ))}
                        {workers.length > 8 && (
                          <span className="text-[11px] text-ink-3">
                            +{workers.length - 8}
                          </span>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/chef-chantier/equipes"
              className="mt-3 inline-block text-[11.5px] font-semibold text-primary-700 hover:text-primary-800"
            >
              Voir toute l'équipe →
            </Link>
          </section>

          {/* Habilitations */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Shield className="h-3.5 w-3.5" /> Mes habilitations
            </h2>
            <dl className="mt-2 grid gap-2 text-[12.5px] sm:grid-cols-2">
              <KV label="Pointage équipe">Quotidien</KV>
              <KV label="Validation congés">N1 (validateur direct)</KV>
              <KV label="Signalement HSE">Création + traitement</KV>
              <KV label="Demande matériel">Magasin chantier</KV>
              <KV label="Rapport journalier">Production + livraisons</KV>
              <KV label="Magasin">Scope chantier</KV>
            </dl>
            <p className="mt-3 text-[11.5px] text-ink-3">
              Périmètre limité à vos chantiers actifs. Toute extension doit être
              validée par le Directeur de Travaux ou le DRH.
            </p>
          </section>

          {/* Préférences alertes */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Bell className="h-3.5 w-3.5" /> Préférences alertes
            </h2>
            <ul className="mt-2 space-y-1.5 text-[12.5px]">
              <Pref label="Demande de congé équipe" enabled />
              <Pref label="Signalement HSE chantier" enabled mandatory />
              <Pref label="Avance ouvrier (info)" enabled />
              <Pref label="Réception livraison" enabled />
              <Pref label="Rupture stock chantier" enabled />
              <Pref label="Canal préféré" valueText="Push + SMS" />
            </ul>
          </section>

          {/* Messagerie / contacts */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Mail className="h-3.5 w-3.5" /> Groupes chantier
            </h2>
            <ul className="mt-2 space-y-1 text-[12.5px]">
              {data.sites.slice(0, 4).map((s) => (
                <li key={`team-${s.id}`} className="rounded-md bg-surface-alt px-3 py-1.5">
                  📌 Équipe {s.code} (CC + ouvriers)
                </li>
              ))}
              {data.sites.slice(0, 4).map((s) => (
                <li key={`mgr-${s.id}`} className="rounded-md bg-surface-alt px-3 py-1.5">
                  📌 Pilotage {s.code} (DTrav + CC)
                </li>
              ))}
            </ul>
            <Link
              href="/messagerie"
              style={{ minHeight: 40 }}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-surface-alt"
            >
              Ouvrir messagerie →
            </Link>
          </section>
        </div>
      )}

      {/* Lien paie perso */}
      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          <Wallet className="h-3.5 w-3.5" /> Espace personnel
        </h2>
        <p className="mt-2 text-[12.5px] text-ink-3">
          Consultez vos bulletins de paie, soldes de congés et infos personnelles
          dans votre espace cadre.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/employe/paie"
            className="inline-flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary-600"
          >
            <Wallet className="h-3.5 w-3.5" /> Ma paie
          </Link>
          <Link
            href="/employe/conges"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-surface-alt"
          >
            <Calendar className="h-3.5 w-3.5" /> Mes congés
          </Link>
          <Link
            href="/employe/profil"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-surface-alt"
          >
            Infos perso →
          </Link>
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Sous-composants
// ════════════════════════════════════════════════════════════════════════

function KpiCard({
  icon,
  label,
  value,
  tone = "default",
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "primary" | "ok" | "warning" | "danger" | "info";
  link?: string;
}) {
  const toneCls = {
    default: "bg-surface-alt text-ink-2",
    primary: "bg-primary-50 text-primary-700",
    ok: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-danger/10 text-danger",
    info: "bg-blue-50 text-blue-700",
  }[tone];
  const inner = (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-7 w-7 place-items-center rounded-full", toneCls)}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
      <div className="mt-1.5 font-mono text-[18px] font-bold tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
  return link ? (
    <Link href={link} className="block transition hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}

function Pref({
  label,
  enabled,
  valueText,
  mandatory,
}: {
  label: string;
  enabled?: boolean;
  valueText?: string;
  mandatory?: boolean;
}) {
  return (
    <li style={{ minHeight: 36 }} className="flex items-center justify-between rounded-md border border-line px-3 py-1.5">
      <span className="text-ink-2">{label}</span>
      {valueText ? (
        <span className="text-[11.5px] font-medium text-primary-700">{valueText}</span>
      ) : (
        <span
          className={clsx(
            "rounded px-2 py-0.5 text-[11px] font-medium",
            enabled
              ? mandatory
                ? "bg-danger/10 text-danger"
                : "bg-emerald-50 text-emerald-700"
              : "bg-surface-alt text-ink-3",
          )}
        >
          {enabled ? (mandatory ? "Obligatoire" : "Activé") : "—"}
        </span>
      )}
    </li>
  );
}

function MiniAvatar({ fullName, url }: { fullName: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-5 w-5 flex-shrink-0 rounded-full object-cover" />;
  }
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join("")
    .toUpperCase();
  return (
    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-primary-100 text-[8.5px] font-semibold text-primary-700">
      {initials}
    </span>
  );
}
