"use client";

import { useState } from "react";
import { Shield, Users, ScrollText, Activity, Lock } from "lucide-react";
import { clsx } from "clsx";
import { UsersTable } from "@/components/security/UsersTable";
import { AuditLogTable } from "@/components/security/AuditLogTable";
import { SessionsTable } from "@/components/security/SessionsTable";
import { RolesPanel } from "@/components/security/RolesPanel";

type Tab = "roles" | "users" | "audit" | "sessions" | "auth";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "roles", label: "Rôles", icon: <Shield className="h-3.5 w-3.5" /> },
  { key: "users", label: "Utilisateurs", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "audit", label: "Audit", icon: <ScrollText className="h-3.5 w-3.5" /> },
  { key: "sessions", label: "Sessions", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "auth", label: "Authentification", icon: <Lock className="h-3.5 w-3.5" /> },
];

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">Sécurité & rôles</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Utilisateurs, rôles, journal d'audit, sessions actives, politique d'authentification.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "roles" && <RolesPanel />}
      {tab === "users" && <UsersTable />}
      {tab === "audit" && <AuditLogTable />}
      {tab === "sessions" && <SessionsTable />}
      {tab === "auth" && <AuthPolicySection />}
    </>
  );
}

function AuthPolicySection() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Politique de mots de passe
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Stat label="Longueur minimale">10 caractères</Stat>
          <Stat label="Complexité">Majuscule + minuscule + chiffre + spécial</Stat>
          <Stat label="Expiration">90 jours</Stat>
          <Stat label="Historique">5 derniers mots de passe interdits</Stat>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          2FA obligatoire
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          <li className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-[12.5px] font-medium text-success">
            DG / DAF / Tenant Admin (obligatoire)
          </li>
          <li className="rounded-md border border-line bg-surface-alt px-3 py-2 text-[12.5px] text-ink-3">
            Cadres production (recommandé)
          </li>
          <li className="rounded-md border border-line bg-surface-alt px-3 py-2 text-[12.5px] text-ink-3">
            Autres rôles (optionnel)
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-dashed border-line bg-surface-alt p-5 text-center">
        <h2 className="text-[14px] font-semibold text-ink">SSO et appareils de confiance — V2</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Google Workspace, Microsoft 365, gestion des appareils de confiance par utilisateur.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  );
}
