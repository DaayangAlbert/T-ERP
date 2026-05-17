"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Bell, Shield, Calendar, Mail } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";

interface ProfileData {
  user: { firstName: string; lastName: string; role: string; position: string | null; category: string | null };
  sites: Array<{ id: string; code: string; name: string; client: string; progress: number; plannedEndDate: string }>;
  upcomingMilestones: Array<{ id: string; code: string; description: string; contractDueDate: string; siteCode: string; siteName: string }>;
}

export default function DtravProfilePage() {
  const { data } = useQuery({
    queryKey: ["dtrav", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/dtrav/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ProfileData>;
    },
  });

  return (
    <div id="screen-dtrav-profil" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Mon espace DTrav</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Profil, chantiers assignés, préférences alertes, agenda chantier.
        </p>
      </header>

      <AvatarUploader />

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Building2 className="h-3.5 w-3.5" /> Mes chantiers assignés
          </h2>
          {data?.sites.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-3">Aucun chantier assigné.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {data?.sites.map((s) => (
                <li
                  key={s.id}
                  style={{ minHeight: 56 }}
                  className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2 text-[12.5px]"
                >
                  <div>
                    <strong>{s.code}</strong> · {s.name}
                    <div className="text-[11px] text-ink-3">
                      {s.client} · livraison {new Date(s.plannedEndDate).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    {s.progress}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] text-ink-3">
            Pour modifier votre périmètre, contactez le Directeur Technique.
          </p>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Bell className="h-3.5 w-3.5" /> Préférences alertes
          </h2>
          <ul className="mt-2 space-y-1.5 text-[12.5px]">
            <Pref label="Alerte rupture stock J-3" enabled />
            <Pref label="Écart production > 10%" enabled />
            <Pref label="Retard jalon MOA J-7" enabled />
            <Pref label="Incident HSE" enabled mandatory />
            <Pref label="Canal préféré" valueText="Push + SMS prioritaire" />
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Shield className="h-3.5 w-3.5" /> Mes habilitations
          </h2>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 text-[12.5px]">
            <KV label="Validation BC chantier">&lt; 5 M FCFA</KV>
            <KV label="Validation rapports">Journaliers</KV>
            <KV label="Initiation avenants">DT N2</KV>
            <KV label="Demande renforts">DT N2 + RH</KV>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Calendar className="h-3.5 w-3.5" /> Agenda chantier
          </h2>
          {data?.upcomingMilestones.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-3">Aucune échéance proche.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-[12.5px]">
              {data?.upcomingMilestones.slice(0, 6).map((m) => (
                <li
                  key={m.id}
                  style={{ minHeight: 44 }}
                  className="flex items-center justify-between rounded-md bg-surface-alt px-2 py-1.5"
                >
                  <div>
                    <span className="font-medium text-ink">
                      {m.siteCode} · {m.code}
                    </span>
                    <div className="text-[11px] text-ink-3">{m.description}</div>
                  </div>
                  <span className="text-[11.5px] font-medium text-primary-700">
                    {new Date(m.contractDueDate).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card lg:col-span-2">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Mail className="h-3.5 w-3.5" /> Groupes chantier épinglés
          </h2>
          <ul className="mt-2 grid gap-1 text-[12.5px] sm:grid-cols-2">
            {data?.sites.map((s) => (
              <li key={`team-${s.id}`} className="rounded-md bg-surface-alt px-3 py-1.5">
                Équipe {s.code} (DTrav + Conducteur + Chef chantier)
              </li>
            ))}
            {data?.sites.map((s) => (
              <li key={`moa-${s.id}`} className="rounded-md bg-surface-alt px-3 py-1.5">
                MOA {s.code} ({s.client})
              </li>
            ))}
          </ul>
          <Link
            href="/messagerie"
            style={{ minHeight: 40 }}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink-2"
          >
            Ouvrir messagerie →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Pref({ label, enabled, valueText, mandatory }: { label: string; enabled?: boolean; valueText?: string; mandatory?: boolean }) {
  return (
    <li style={{ minHeight: 44 }} className="flex items-center justify-between rounded-md border border-line px-3 py-1.5">
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
          {enabled ? (mandatory ? "Obligatoire" : "Activé") : "—"}
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
