import { prisma } from "@/lib/prisma";
import { requireCandidateSession } from "@/lib/cand-session";

export const dynamic = "force-dynamic";

export default async function CandidateDashboardPage() {
  const session = requireCandidateSession();

  const apps = await prisma.application.findMany({
    where: { userId: session.sub },
    select: {
      id: true,
      stage: true,
      jobOffer: { select: { title: true } },
    },
  });
  const applicationsCount = apps.length;
  const inInterview = apps.filter((a) => a.stage === "INTERVIEW").length;

  const upcomingInterviewRow =
    apps.length > 0
      ? await prisma.interview.findFirst({
          where: {
            applicationId: { in: apps.map((a) => a.id) },
            scheduledAt: { gte: new Date() },
            completed: false,
          },
          orderBy: { scheduledAt: "asc" },
          select: {
            id: true,
            scheduledAt: true,
            mode: true,
            duration: true,
            location: true,
            applicationId: true,
          },
        })
      : null;

  const upcomingInterview = upcomingInterviewRow
    ? {
        ...upcomingInterviewRow,
        offerTitle:
          apps.find((a) => a.id === upcomingInterviewRow.applicationId)?.jobOffer
            ?.title ?? null,
      }
    : null;

  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFmt = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-3">
          Bootstrap · PROMPT 0
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Le tableau de bord complet (KPIs colorés, pipeline 5 étapes,
          recommandations matching) sera livré en{" "}
          <span className="font-medium text-primary-700">fonction 1.1</span>.
        </p>
      </div>

      {/* KPI Row — proto style */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Candidatures actives"
          value={String(applicationsCount)}
          meta={`${inInterview} en entretien · ${applicationsCount - inInterview} en attente`}
        />
        <KpiCard
          label="Prochains entretiens"
          value={upcomingInterview ? "1" : "0"}
          meta={
            upcomingInterview
              ? `${dateFmt.format(upcomingInterview.scheduledAt)} · ${timeFmt.format(upcomingInterview.scheduledAt)}`
              : "Aucun à venir"
          }
          accent={upcomingInterview ? "warning" : undefined}
        />
        <KpiCard
          label="Offres pour vous"
          value="—"
          meta="Matching auto · fn 1.5"
        />
        <KpiCard
          label="Profil complété"
          value="—"
          meta="Édition · fn 1.2"
        />
      </div>

      {/* Card focus prochain entretien */}
      {upcomingInterview ? (
        <article className="overflow-hidden rounded-lg border border-line bg-gradient-to-br from-primary-50 to-white shadow-card">
          <div className="border-l-4 border-primary p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                  ⏰ Prochain entretien
                </div>
                <h3 className="mt-1 text-base font-semibold text-ink md:text-lg">
                  {upcomingInterview.offerTitle ?? "Entretien programmé"}
                </h3>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {timeFmt.format(upcomingInterview.scheduledAt)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Field
                label="Date"
                value={dateFmt.format(upcomingInterview.scheduledAt)}
              />
              <Field label="Durée" value={`${upcomingInterview.duration} min`} />
              <Field
                label="Lieu"
                value={upcomingInterview.location ?? "À préciser"}
              />
              <Field label="Mode" value={upcomingInterview.mode} />
            </div>
            <p className="mt-4 text-xs text-ink-3">
              Les boutons d&apos;action (confirmer, itinéraire, préparation)
              arriveront en fonction 1.4.
            </p>
          </div>
        </article>
      ) : null}

      {/* Mes candidatures placeholder */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          Mes candidatures en cours
        </h3>
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          {apps.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-3">
              Aucune candidature pour le moment.
            </div>
          ) : (
            apps.map((app, idx) => (
              <div
                key={app.id}
                className={
                  "flex flex-wrap items-center gap-3 px-4 py-3 " +
                  (idx < apps.length - 1 ? "border-b border-line" : "")
                }
              >
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-primary-50 text-xl text-primary-700">
                  👷
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {app.jobOffer.title}
                  </div>
                  <div className="text-xs text-ink-3">BatimCAM</div>
                </div>
                <StageBadge stage={app.stage} />
              </div>
            ))
          )}
        </div>
      </section>

      <p className="rounded-md border border-dashed border-line bg-white p-4 text-xs text-ink-3">
        Prochaines fonctions à brancher : profil/CV, candidatures avec pipeline
        5 étapes, entretiens, offres recommandées.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  accent?: "warning" | "success";
}) {
  const valueColor =
    accent === "warning"
      ? "text-amber-700"
      : accent === "success"
        ? "text-success"
        : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold ${valueColor}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-3">{meta}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; cls: string; step: string }> = {
    RECEIVED: {
      label: "Reçue",
      cls: "bg-ink-3/10 text-ink-2",
      step: "Étape 1/5",
    },
    SHORTLISTED: {
      label: "Présélection",
      cls: "bg-emerald-100 text-emerald-700",
      step: "Étape 2/5",
    },
    INTERVIEW: {
      label: "En entretien",
      cls: "bg-amber-100 text-amber-800",
      step: "Étape 3/5",
    },
    TECHNICAL_TEST: {
      label: "Test technique",
      cls: "bg-blue-100 text-blue-700",
      step: "Étape 4/5",
    },
    OFFER: {
      label: "Offre",
      cls: "bg-primary-100 text-primary-700",
      step: "Étape 5/5",
    },
    HIRED: {
      label: "Embauché",
      cls: "bg-emerald-200 text-emerald-800",
      step: "Succès",
    },
    REJECTED: {
      label: "Refusée",
      cls: "bg-rose-100 text-rose-700",
      step: "—",
    },
  };
  const cfg = map[stage] ?? map.RECEIVED;
  return (
    <div className="text-right">
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
      >
        {cfg.label}
      </span>
      <div className="mt-1 text-[10px] text-ink-3">{cfg.step}</div>
    </div>
  );
}
