"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Mail, Building2, Bell, Shield } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { PageHelp } from "@/components/help/PageHelp";
import { ProfilTutorial } from "@/components/help/tutorials/ProfilTutorial";

interface AssignedData {
  isDirection: boolean;
  sites: Array<{ id: string; code: string; name: string; client: string }>;
  role: string;
}

export default function ComptableProfilePage() {
  const { data } = useQuery({
    queryKey: ["comptable", "profile-sites"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/profile/assigned-sites", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AssignedData>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-profil">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Mon espace comptable</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">Profil, paie, messagerie comptable, préférences alertes.</p>
        </div>
        <PageHelp title="Aide — Mon espace comptable"><ProfilTutorial /></PageHelp>
      </header>

      <AvatarUploader />

      <div className="grid gap-3 lg:grid-cols-2">
        {!data?.isDirection && (
          <section className="rounded-xl border border-line bg-white p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Building2 className="h-3.5 w-3.5" /> Mes chantiers assignés
            </h2>
            {data?.sites.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink-3">Aucun chantier assigné.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {data?.sites.map((s) => (
                  <li key={s.id} className="rounded-md border border-line bg-surface-alt px-3 py-2 text-[12.5px]">
                    <strong>{s.code}</strong> · {s.name}
                    <span className="ml-2 text-ink-3">— {s.client}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11.5px] text-ink-3">
              Pour modifier votre périmètre, contactez le DAF.
            </p>
          </section>
        )}

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Bell className="h-3.5 w-3.5" /> Préférences alertes comptables
          </h2>
          <ul className="mt-2 space-y-1.5 text-[12.5px]">
            <Pref label="Alerte écriture en brouillard > 48 h" enabled />
            <Pref label="Alerte facture échéant J-3" enabled />
            <Pref label="Rapprochement bancaire mensuel" enabled={data?.isDirection} />
            <Pref label="Canal préféré" valueText="Email + In-app" />
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Shield className="h-3.5 w-3.5" /> Mes habilitations
          </h2>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 text-[12.5px]">
            <KV label="Plafond validation BC">5 M FCFA</KV>
            <KV label="Journaux accessibles">
              {data?.isDirection ? "ACH, VTE, BQ, OD, PAIE, CAI" : "ACH, VTE, CAI"}
            </KV>
            <KV label="Périmètre">
              {data?.isDirection ? "Vue globale" : `${data?.sites.length ?? 0} chantier(s)`}
            </KV>
            <KV label="Rôle">{data?.role}</KV>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Mail className="h-3.5 w-3.5" /> Groupes comptables épinglés
          </h2>
          <ul className="mt-2 space-y-1 text-[12.5px]">
            <li className="rounded-md bg-surface-alt px-2 py-1.5">Cellule comptable Direction</li>
            <li className="rounded-md bg-surface-alt px-2 py-1.5">Cellule paie</li>
            {!data?.isDirection &&
              data?.sites.map((s) => (
                <li key={s.id} className="rounded-md bg-surface-alt px-2 py-1.5">
                  Cellule chantier {s.code}
                </li>
              ))}
          </ul>
          <Link
            href="/messagerie"
            className="mt-2 inline-block text-[11.5px] font-medium text-primary-700 hover:underline"
          >
            Ouvrir messagerie →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Pref({ label, enabled, valueText }: { label: string; enabled?: boolean; valueText?: string }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-line px-3 py-1.5">
      <span className="text-ink-2">{label}</span>
      {valueText ? (
        <span className="text-[11.5px] font-medium text-primary-700">{valueText}</span>
      ) : (
        <span
          className={
            enabled
              ? "rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
              : "rounded bg-ink-3/10 px-2 py-0.5 text-[11px] font-medium text-ink-3"
          }
        >
          {enabled ? "Activé" : "—"}
        </span>
      )}
    </li>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}
