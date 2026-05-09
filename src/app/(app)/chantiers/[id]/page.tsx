"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, Wallet } from "lucide-react";
import { useSite } from "@/hooks/useSites";
import { ProgressInline } from "@/components/sites/ProgressInline";
import { formatDate, formatFCFA, formatPercent } from "@/lib/format";
import { SiteStatus } from "@prisma/client";

const STATUS_LABELS: Record<SiteStatus, string> = {
  PLANNED: "Planifié",
  ACTIVE: "Actif",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "En dérive",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

export default function ChantierDetailPage({ params }: { params: { id: string } }) {
  const { data: site, isLoading, isError } = useSite(params.id);

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Chantier introuvable.
      </div>
    );
  }

  if (isLoading || !site) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-surface-alt" />
        <div className="h-32 w-full animate-pulse rounded bg-surface-alt" />
      </div>
    );
  }

  return (
    <>
      <Link
        href="/chantiers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </Link>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <span className="rounded bg-surface-alt px-2 py-0.5 font-mono text-[11.5px] text-ink-3">
            {site.code}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{site.name}</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Client : <span className="font-medium text-ink-2">{site.client}</span> ·{" "}
            {STATUS_LABELS[site.status]}
          </p>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-4 w-4" />} label="Budget">
          {formatFCFA(BigInt(site.budget))}
        </Stat>
        <Stat icon={<MapPin className="h-4 w-4" />} label="Région">
          {site.region ?? "—"}
        </Stat>
        <Stat icon={<Calendar className="h-4 w-4" />} label="Livraison prévue">
          {formatDate(site.plannedEndDate)}
        </Stat>
        <Stat icon={<Users className="h-4 w-4" />} label="Directeur travaux">
          {site.manager
            ? `${site.manager.firstName} ${site.manager.lastName}`
            : "Non assigné"}
        </Stat>
      </div>

      <section className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Avancement &amp; rentabilité</h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-ink-3">
                <span>Avancement physique</span>
                <span className="font-mono tabular-nums">{site.progress} %</span>
              </div>
              <ProgressInline progress={site.progress} status={site.status} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-ink-3">
                <span>Marge actuelle</span>
                <span
                  className={
                    site.margin < 10
                      ? "text-danger font-mono tabular-nums"
                      : site.margin < 15
                        ? "text-warning font-mono tabular-nums"
                        : "text-success font-mono tabular-nums"
                  }
                >
                  {formatPercent(site.margin)}
                </span>
              </div>
              <div className="text-[11px] text-ink-3">
                Source : valeur saisie sur le chantier (sera recalculée par le module Finance en J+).
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Informations</h2>
          <dl className="grid grid-cols-1 gap-2.5 text-[12.5px]">
            <Row label="Code">{site.code}</Row>
            <Row label="Type">{site.type}</Row>
            <Row label="Démarrage">{formatDate(site.startDate)}</Row>
            <Row label="Livraison réelle">
              {site.actualEndDate ? formatDate(site.actualEndDate) : "—"}
            </Row>
            <Row label="Créé le">{formatDate(site.createdAt, "dd/MM/yyyy 'à' HH:mm")}</Row>
            <Row label="Mis à jour">{formatDate(site.updatedAt, "dd/MM/yyyy 'à' HH:mm")}</Row>
          </dl>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-[12.5px] text-primary-800">
        Détail enrichi (planning, équipe, budget par lot, photos, documents…) prévu en phase 2 du
        roadmap.
      </section>
    </>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-semibold text-ink">{children}</div>
    </div>
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
