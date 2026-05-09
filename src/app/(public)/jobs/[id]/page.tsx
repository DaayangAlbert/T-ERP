"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, Users, Calendar } from "lucide-react";
import { PortalHeader } from "@/components/public/PortalHeader";
import { PortalFooter } from "@/components/public/PortalFooter";
import { AuthModal, type AuthTab, type SignupPick } from "@/components/auth/AuthModal";
import { useJob } from "@/hooks/useJobs";
import { formatDate, formatFCFA } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";

interface Props {
  params: { id: string };
}

const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  JOURNALIER: "Journalier",
  PRESTATAIRE: "Prestataire",
};

function salary(min: string | null, max: string | null) {
  if (!min && !max) return "Salaire négociable";
  if (min && max) return `${formatFCFA(BigInt(min))} – ${formatFCFA(BigInt(max))}`;
  return formatFCFA(BigInt(min ?? max!));
}

export default function JobDetailPage({ params }: Props) {
  const { id } = params;
  const { data: job, isLoading, isError } = useJob(id);
  const user = useAuthStore((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [authPick, setAuthPick] = useState<SignupPick>("candidate");

  const openAuth = (tab: AuthTab, pick: SignupPick = "candidate") => {
    setAuthTab(tab);
    setAuthPick(pick);
    setAuthOpen(true);
  };

  const onApply = () => {
    if (!user) {
      openAuth("signup", "candidate");
    } else {
      // J1 stops at the form open / login — actual application flow ships in a later sprint.
      alert("Candidature : flux complet en J3 (formulaire + upload CV).");
    }
  };

  return (
    <>
      <PortalHeader
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup", "candidate")}
      />

      <main className="mx-auto max-w-[920px] px-6 py-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux offres
        </Link>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-8 w-2/3 animate-pulse rounded bg-surface-alt" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-alt" />
            <div className="h-32 w-full animate-pulse rounded bg-surface-alt" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Cette offre est introuvable ou a été retirée.
          </div>
        )}

        {job && (
          <article className="overflow-hidden rounded-xl border border-line bg-white">
            <header
              className="flex items-start gap-3 border-b border-line p-5"
              style={{ background: `${job.tenant.primaryColor || "#A855F7"}10` }}
            >
              <div
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-md text-base font-bold text-white"
                style={{ background: job.tenant.primaryColor || "#A855F7" }}
              >
                {job.tenant.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink">
                  {job.title}
                </h1>
                <div className="mt-1 text-sm text-ink-2">{job.tenant.name}</div>
              </div>
            </header>

            <div className="grid gap-3 border-b border-line bg-surface-alt p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<Briefcase className="h-4 w-4" />} label="Type" value={CONTRACT_LABELS[job.contractType]} />
              <Stat icon={<Users className="h-4 w-4" />} label="Postes" value={String(job.positions)} />
              <Stat icon={<MapPin className="h-4 w-4" />} label="Région" value={job.region ?? "—"} />
              <Stat
                icon={<Calendar className="h-4 w-4" />}
                label="Limite"
                value={job.expiresAt ? formatDate(job.expiresAt) : "—"}
              />
            </div>

            <div className="space-y-5 p-5">
              <Section title="Description du poste">
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                  {job.description}
                </p>
              </Section>

              <Section title="Profil recherché">
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                  {job.requirements}
                </p>
              </Section>

              <Section title="Rémunération">
                <p className="font-mono text-base font-medium tabular-nums text-ink">
                  {salary(job.salaryMin, job.salaryMax)}
                </p>
                <p className="text-xs text-ink-3">
                  Catégorie {job.category} · Réf. {job.reference}
                </p>
              </Section>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white p-5">
              <p className="text-xs text-ink-3">
                Publiée le {job.publishedAt ? formatDate(job.publishedAt) : "—"}
              </p>
              <button
                onClick={onApply}
                className="h-10 rounded-md bg-primary-500 px-5 text-sm font-medium text-white transition hover:bg-primary-600 hover:shadow-brand"
              >
                {user ? "Postuler maintenant" : "Postuler — créer mon compte"}
              </button>
            </footer>
          </article>
        )}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-primary-600 ring-1 ring-line">
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
        <div className="text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-3">{title}</h2>
      {children}
    </section>
  );
}
