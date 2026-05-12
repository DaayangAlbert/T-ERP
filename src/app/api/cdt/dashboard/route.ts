import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  // Pont Mfoundi est le chantier de Samuel MBARGA
  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const [plan, qcOpen, externalVisits, presences, milestones, openNc] = await Promise.all([
    prisma.dailyPlan.findUnique({
      where: { siteId_planDate: { siteId: site.id, planDate: todayMidnight } },
      include: { teams: { include: { team: true } } },
    }),
    prisma.qualityControl.count({ where: { siteId: site.id, performedAt: { gte: todayMidnight } } }),
    prisma.externalVisit.findMany({
      where: { siteId: site.id, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 3,
    }),
    prisma.subcontractorPresence.findMany({
      where: { siteId: site.id, date: todayMidnight },
      include: { subcontractor: true },
    }),
    prisma.cdtMilestone.findMany({ where: { siteId: site.id }, orderBy: { contractDate: "asc" } }),
    prisma.qualityControl.count({ where: { siteId: site.id, overallConform: false } }),
  ]);

  const teamsCount = plan?.teams.length ?? 0;
  const tasksToday = teamsCount;
  const tasksActive = plan?.teams.filter((t) => t.status === "IN_PROGRESS").length ?? 0;
  const qcTodoCount = 3;
  const nextMilestone = milestones.find((m) => m.status !== "REACHED");
  const daysToNext = nextMilestone ? Math.ceil((nextMilestone.contractDate.getTime() - Date.now()) / 86_400_000) : null;

  const alerts = [
    {
      key: "nc-z3",
      level: "critical" as const,
      title: "Réserve BCT Z3 — recouvrement aciers",
      detail: "NC-2026-005 ouverte · à lever sous 7 jours",
      link: "/cdt/qualite",
    },
    {
      key: "betonnage-9m3",
      level: "warning" as const,
      title: "Bétonnage 9 m³ aujourd'hui — culée Nord",
      detail: "Toupie programmée 9h00 · vérifier ressources matières",
      link: "/cdt/plan",
    },
    {
      key: "essais-j7",
      level: "warning" as const,
      title: "3 essais béton J+7 attendus aujourd'hui",
      detail: "LABOGENIE · résultats à saisir",
      link: "/cdt/qualite",
    },
    {
      key: "visite-geometre",
      level: "info" as const,
      title: "Visite géomètre demain 10h",
      detail: "TopoCAM · implantation pile 4 · préparer plans",
      link: "/cdt/visites",
    },
  ];

  return NextResponse.json({
    site: {
      id: site.id,
      name: site.name,
      code: site.code,
      progress: site.progress,
      physicalProgress: site.physicalProgress,
    },
    today: new Date().toISOString(),
    weather: "26°C ☀",
    kpis: {
      teamsAtWork: teamsCount,
      teamsTotal: teamsCount,
      tasksToday,
      tasksActive,
      qcTodo: qcTodoCount,
      openReserves: openNc > 0 ? 1 : 0,
    },
    activePhase: {
      label: "Gros œuvre superstructure",
      progress: 82,
      nextMilestone: nextMilestone ? {
        code: nextMilestone.code,
        designation: nextMilestone.designation,
        daysToNext: daysToNext ?? 0,
      } : null,
    },
    planTodayPending: !plan || plan.status === "DRAFT",
    planTeamsToAssign: teamsCount,
    alerts,
    upcomingVisits: externalVisits.map((v) => ({
      id: v.id,
      visitorName: v.visitorName,
      organization: v.organization,
      scheduledAt: v.scheduledAt.toISOString(),
      visitorType: v.visitorType,
    })),
    subcontractorsOnSite: presences.map((p) => ({
      id: p.id,
      name: p.subcontractor.name,
      workerCount: p.workerCount,
      supervisor: p.supervisorOnSite,
    })),
  });
}
