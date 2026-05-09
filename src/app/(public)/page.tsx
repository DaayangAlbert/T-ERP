"use client";

import { useState } from "react";
import { PortalHeader } from "@/components/public/PortalHeader";
import { PortalHero } from "@/components/public/PortalHero";
import { JobsGrid } from "@/components/public/JobsGrid";
import { PortalFooter } from "@/components/public/PortalFooter";
import { AuthModal, type AuthTab, type SignupPick } from "@/components/auth/AuthModal";
import { useJobs, type PublicJob } from "@/hooks/useJobs";
import Link from "next/link";

export default function PortalPage() {
  const [filters, setFilters] = useState<{ q?: string; region?: string }>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [authPick, setAuthPick] = useState<SignupPick>("candidate");

  const { data, isLoading } = useJobs({ ...filters, limit: 6 });
  const jobs: PublicJob[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const openAuth = (tab: AuthTab, pick: SignupPick = "candidate") => {
    setAuthTab(tab);
    setAuthPick(pick);
    setAuthOpen(true);
  };

  return (
    <>
      <PortalHeader
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup", "candidate")}
      />

      <PortalHero
        totalJobs={total}
        onSearch={(q, region) => setFilters({ q: q || undefined, region: region || undefined })}
      />

      <main className="mx-auto -mt-8 max-w-[1280px] px-6 pb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">Offres en vedette</h2>
            <p className="text-sm text-ink-3">
              Sélection des 6 offres les plus récentes
              {total > 6 && ` — voir les ${total} offres ouvertes`}
            </p>
          </div>
          <Link
            href="/jobs"
            className="rounded-md border border-line-2 bg-white px-3 py-1.5 text-sm text-ink-2 hover:border-primary-300"
          >
            Voir toutes les offres →
          </Link>
        </div>

        <JobsGrid
          jobs={jobs}
          loading={isLoading}
          onApply={() => openAuth("login")}
        />

        <section
          className="mt-9 grid items-center gap-8 rounded-xl border border-primary-200 bg-primary-50 p-9 sm:grid-cols-2"
        >
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary-700">
              Vous êtes une entreprise BTP ?
            </div>
            <h2 className="mb-2.5 text-2xl font-bold tracking-tight text-ink">
              Digitalisez la gestion de votre entreprise avec T-ERP
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-2">
              Pilotage des chantiers, paie conforme CNPS/IRPP, comptabilité SYSCOHADA, RH,
              stocks, GED. Tout en un, accessible depuis n'importe quel appareil, avec un mode
              hors-ligne pour les chantiers.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openAuth("signup", "company")}
                className="h-10 rounded-md bg-primary-500 px-4 text-sm font-medium text-white transition hover:bg-primary-600 hover:shadow-brand"
              >
                Inscrire mon entreprise
              </button>
              <button
                disabled
                className="h-10 rounded-md border border-line-2 bg-white px-4 text-sm font-medium text-ink-3"
              >
                Demander une démo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { num: "42", label: "Entreprises clientes" },
              { num: "1 287", label: "Utilisateurs actifs" },
              { num: "86", label: "Chantiers gérés" },
              { num: "99,7 %", label: "Disponibilité SLA" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-line bg-white p-3.5">
                <div className="font-mono text-sm font-bold tabular-nums text-ink-3">{s.num}</div>
                <div className="text-sm text-ink-2">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PortalFooter />

      <AuthModal
        open={authOpen}
        defaultTab={authTab}
        defaultPick={authPick}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
