import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, RhAlertType, AlertSeverity, AppStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const TYPE_TITLE: Record<RhAlertType, string> = {
  MEDICAL_VISIT_DUE: "5 visites médicales urgentes",
  TRAINING_RECYCLE_DUE: "8 recyclages CACES expirent dans 60 jours",
  CDD_ENDING: "3 CDD à décider ce mois",
  LEAVE_REQUEST_PENDING: "7 demandes de congés en attente",
  PAYROLL_INPUT_DEADLINE: "Saisie paie à finaliser avant échéance",
};

async function ensureSeedAlerts(tenantId: string) {
  const existing = await prisma.rhAlert.count({ where: { tenantId, resolved: false } });
  if (existing > 0) return;

  const today = new Date();
  await prisma.rhAlert.createMany({
    data: [
      {
        tenantId,
        type: "MEDICAL_VISIT_DUE",
        severity: "HIGH",
        title: TYPE_TITLE.MEDICAL_VISIT_DUE,
        details: "Visites de reprise et périodiques en retard.",
        link: "/rh/medical",
      },
      {
        tenantId,
        type: "TRAINING_RECYCLE_DUE",
        severity: "HIGH",
        title: TYPE_TITLE.TRAINING_RECYCLE_DUE,
        details: "CACES R482 cat B1, R489 et R486 nacelle.",
        link: "/rh/formations",
      },
      {
        tenantId,
        type: "CDD_ENDING",
        severity: "MEDIUM",
        title: TYPE_TITLE.CDD_ENDING,
        details: "P. ABEGA, J. NDONGO, F. MBALLA — décider renouvellement / CDI.",
        link: "/rh/personnel?contract=CDD",
      },
      {
        tenantId,
        type: "LEAVE_REQUEST_PENDING",
        severity: "MEDIUM",
        title: TYPE_TITLE.LEAVE_REQUEST_PENDING,
        details: "Cumul 38 jours à valider sur Mai 2026.",
        link: "/rh/conges",
      },
      {
        tenantId,
        type: "PAYROLL_INPUT_DEADLINE",
        severity: "LOW",
        title: `Saisie paie à finaliser avant ${new Date(today.getFullYear(), today.getMonth(), 28).toLocaleDateString("fr-FR")} 18h`,
        details: "142 / 175 saisies journaliers terminées (81 %).",
        link: "/rh/paie",
      },
    ],
  });
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  await ensureSeedAlerts(session.tenantId);

  const [activeUserCount, applications, alerts, hiringPipelineRaw] = await Promise.all([
    prisma.user.count({ where: { tenantId: { in: scopeIds }, status: "ACTIVE" } }),
    prisma.application.count({
      where: { stage: { in: [AppStage.OFFER, AppStage.HIRED, AppStage.INTERVIEW, AppStage.TECHNICAL_TEST] } },
    }),
    prisma.rhAlert.findMany({
      where: { tenantId: session.tenantId, resolved: false },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.application.findMany({
      where: { stage: { in: [AppStage.OFFER, AppStage.HIRED] } },
      include: {
        jobOffer: { select: { title: true, region: true, tenantId: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      take: 5,
      orderBy: { appliedAt: "desc" },
    }),
  ]);

  // Effectif synthétique : la base User démo ne contient qu'une douzaine de comptes de test ;
  // pour la démo BatimCAM, on aligne avec le narratif (487 effectif total, dont journaliers
  // qui ne sont pas matérialisés en User).
  const totalHeadcount = activeUserCount < 100 ? 487 : activeUserCount;
  const presentRate = 0.887;
  const presentToday = Math.round(totalHeadcount * presentRate);

  // Validations RH en attente (compteur indicatif, fallback 9 si vide)
  const pendingValidationsRaw = await prisma.validation
    .count({ where: { tenantId: session.tenantId, status: "PENDING", currentStep: "RH" } })
    .catch(() => 0);
  const pendingValidations = pendingValidationsRaw === 0 ? 9 : pendingValidationsRaw;
  const hiringInProgressDisplay = applications === 0 ? 12 : applications;

  // Évolution effectifs 12 mois (synthèse 380 → totalHeadcount)
  const headcountEvolution12m = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const period = d.toISOString().slice(0, 7);
    const start = 380;
    const target = Math.max(start, totalHeadcount);
    const value = Math.round(start + ((target - start) * (i + 1)) / 12);
    return { period, headcount: value };
  });

  // Répartition par catégorie (déterministe : approxs cohérents avec le proto)
  const categoryBreakdown = [
    { category: "Cadres & ETAM", count: Math.round(totalHeadcount * 0.226), color: "#A855F7" },
    { category: "Ouvriers qualifiés", count: Math.round(totalHeadcount * 0.16), color: "#22C55E" },
    { category: "Ouvriers spécialisés", count: Math.round(totalHeadcount * 0.302), color: "#F59E0B" },
    { category: "Journaliers", count: Math.round(totalHeadcount * 0.312), color: "#3B82F6" },
  ];

  // Embauches en cours — synthétiser si pas d'Application réelle disponible
  const fallbackPipeline = [
    { candidateName: "Hervé MOUKAM", position: "Conducteur travaux", site: "Bastos R+8", stage: "Contrat signé", expectedStartDate: "2026-05-15" },
    { candidateName: "Sylvie ATANGANA", position: "Comptable senior", site: "Siège Yaoundé", stage: "Visite médicale", expectedStartDate: "2026-05-20" },
    { candidateName: "Thierry NJOYA", position: "Chef chantier", site: "Pont Mfoundi", stage: "Offre acceptée", expectedStartDate: "2026-05-22" },
    { candidateName: "Achille BIYIK", position: "Magasinier", site: "Base logistique Douala", stage: "Référencement bancaire", expectedStartDate: "2026-06-01" },
    { candidateName: "Aïssatou BOUBA", position: "Conducteur engins", site: "Lotissement Odza", stage: "Vérif diplômes", expectedStartDate: "2026-06-05" },
  ];

  const hiringPipeline = hiringPipelineRaw.length > 0
    ? hiringPipelineRaw.map((a) => ({
        candidateName: `${a.user.firstName} ${a.user.lastName}`,
        position: a.jobOffer?.title ?? "—",
        site: a.jobOffer?.region ?? "—",
        stage: a.stage,
        expectedStartDate: a.appliedAt.toISOString().slice(0, 10),
      }))
    : fallbackPipeline;

  return NextResponse.json({
    kpis: {
      totalHeadcount,
      presentToday,
      presentRate: Math.round(presentRate * 1000) / 10,
      hiringInProgress: hiringInProgressDisplay,
      pendingValidations,
    },
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      details: a.details,
      link: a.link,
      createdAt: a.createdAt.toISOString(),
    })),
    headcountEvolution12m,
    categoryBreakdown,
    hiringPipeline,
  });
}
