import { Calendar, Download, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DgDashboard() {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const [user, tenant, sitesCount, headcount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true },
    }),
    session.tenantId
      ? prisma.tenant.findUnique({
          where: { id: session.tenantId },
          select: { name: true },
        })
      : Promise.resolve(null),
    session.tenantId
      ? prisma.site.count({ where: { tenantId: session.tenantId, status: { in: ["ACTIVE", "DRIFTING", "AT_RISK"] } } })
      : Promise.resolve(0),
    session.tenantId
      ? prisma.user.count({ where: { tenantId: session.tenantId, status: "ACTIVE" } })
      : Promise.resolve(0),
  ]);

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Vue consolidée — Direction Générale
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {tenant ? `${tenant.name} · ` : ""}
            Période en cours · {sitesCount} chantiers actifs · {headcount} employés
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stub icon={<Calendar className="h-3.5 w-3.5" />}>Mai 2026</Stub>
          <Stub icon={<Download className="h-3.5 w-3.5" />}>Exporter</Stub>
          <Stub icon={<Plus className="h-3.5 w-3.5" />} primary>
            Nouveau chantier
          </Stub>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSkeleton label="Chiffre d'affaires (YTD)" />
        <KpiSkeleton label="Marge globale" />
        <KpiSkeleton label="Trésorerie nette" />
        <KpiSkeleton label="Effectif total" />
      </div>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <ChartSkeleton title="Chiffre d'affaires & marge — 12 mois" />
        <ChartSkeleton title="Répartition par type de chantier" />
      </div>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <ListSkeleton title="Alertes actives" />
        <ListSkeleton title="Mes validations en attente" />
      </div>

      <div className="mt-4">
        <ListSkeleton title="Top chantiers en cours" full />
      </div>

      <div className="mt-6 rounded-md border border-dashed border-primary-200 bg-primary-50/40 px-4 py-3 text-[12.5px] text-primary-800">
        Squelette J2 — bonjour {user?.firstName}. Le contenu réel (KPIs calculés depuis Prisma,
        graphes Recharts, alertes, top chantiers) arrive en J3.
      </div>
    </>
  );
}

function Stub({
  icon,
  children,
  primary,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      className={
        primary
          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          : "inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function KpiSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="h-7 w-20 animate-pulse rounded bg-surface-alt" />
        <div className="h-5 w-14 animate-pulse rounded bg-surface-alt" />
      </div>
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-alt" />
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-3 h-48 animate-pulse rounded bg-surface-alt" />
    </div>
  );
}

function ListSkeleton({ title, full }: { title: string; full?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">
        {Array.from({ length: full ? 5 : 3 }).map((_, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-surface-alt" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-alt" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-alt" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
