"use client";

import Link from "next/link";
import { Briefcase, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { AlertPreferencesCard } from "@/components/daf/profile/AlertPreferencesCard";
import { SignaturePowerCard } from "@/components/daf/profile/SignaturePowerCard";
import { ProxiesCard } from "@/components/daf/profile/ProxiesCard";
import { DafAgendaCard } from "@/components/daf/profile/DafAgendaCard";

const FINANCE_GROUPS = [
  "Comité financier (DAF + DG + comptable + auditeur externe)",
  "Cellule recouvrement (DAF + comptable + commercial)",
  "Cellule budget (DAF + DT + RH + DG)",
  "Réunion clôture mensuelle (DAF + comptable)",
];

const FINANCE_CONTACTS = [
  "Inspecteur fiscal référent DGI",
  "Auditeur CNPS (cotisations sociales)",
  "Commissaire aux comptes",
  "Conseillers bancaires (SGCB, BICEC, Afriland, Ecobank)",
  "Expert-comptable conseil",
];

export default function DafProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Mon espace Direction Financière
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {user ? `${user.firstName} ${user.lastName} · ` : ""}
          Préférences alertes, habilitations de signature, mandats actifs, agenda financier.
        </p>
      </header>

      <AvatarUploader />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AlertPreferencesCard />
        <SignaturePowerCard />
      </div>

      <ProxiesCard />

      <DafAgendaCard />

      {/* Messagerie financière */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          <MessageSquare className="h-4 w-4 text-emerald-600" /> Messagerie financière DAF
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Groupes financiers épinglés
            </h3>
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {FINANCE_GROUPS.map((g) => (
                <li key={g} className="rounded border border-line px-2 py-1.5">
                  <span className="text-ink">📌 {g}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Contacts externes
            </h3>
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {FINANCE_CONTACTS.map((c) => (
                <li key={c} className="rounded border border-line px-2 py-1.5">
                  <span className="text-ink">📞 {c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Avantages cadre 12 */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          <Briefcase className="h-4 w-4 text-violet-600" /> Statut & avantages cadre 12
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Bonus performance</dt>
            <dd className="mt-0.5 font-semibold text-ink">0,5 % marge brute annuelle</dd>
            <dd className="text-[11px] text-ink-3">Si marge &gt; seuil DG</dd>
          </div>
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Recouvrement DSO</dt>
            <dd className="mt-0.5 font-semibold text-ink">Prime trimestrielle</dd>
            <dd className="text-[11px] text-ink-3">Si DSO &lt; 60 j</dd>
          </div>
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Zéro pénalité fiscale</dt>
            <dd className="mt-0.5 font-semibold text-ink">Prime annuelle</dd>
            <dd className="text-[11px] text-ink-3">Si aucune amende DGI/CNPS</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11.5px] text-ink-3">
          Avantages cadre 12 : voiture de fonction, téléphone, mutuelle, plan d&apos;épargne.
        </p>
        <Link
          href="/direction-financiere/validations?tab=delegations"
          className="mt-3 inline-block text-[11.5px] font-semibold text-primary-700 hover:text-primary-800"
        >
          Gérer mes délégations →
        </Link>
      </section>
    </div>
  );
}
