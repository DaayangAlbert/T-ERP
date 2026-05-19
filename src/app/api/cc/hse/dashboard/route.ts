import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { IncidentSeverity, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const ytdStart = new Date(new Date().getFullYear(), 0, 1);
  // Fenêtre TF1 : 12 derniers mois glissants (norme BTP).
  const tf1WindowStart = new Date();
  tf1WindowStart.setMonth(tf1WindowStart.getMonth() - 12);

  const [ytdIncidents, recentIncidents, lastSerious, tf1Incidents, workforceCount, site, ncs, staff] =
    await Promise.all([
      prisma.hseIncident.count({
        where: { siteId, occurredAt: { gte: ytdStart } },
      }),
      prisma.hseIncident.findMany({
        where: { siteId },
        orderBy: { occurredAt: "desc" },
        take: 5,
      }),
      prisma.hseIncident.findFirst({
        where: {
          siteId,
          severity: { in: [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL] },
        },
        orderBy: { occurredAt: "desc" },
      }),
      // Incidents "avec arrêt" sur les 12 derniers mois (numérateur TF1)
      prisma.hseIncident.count({
        where: {
          siteId,
          occurredAt: { gte: tf1WindowStart },
          OR: [
            { workdaysLost: { gt: 0 } },
            { severity: { in: [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL] } },
          ],
        },
      }),
      // Workforce courante du chantier (approximation pour le dénominateur TF1)
      prisma.siteWorkforceMember.count({
        where: { siteId, role: "WORKER", endedAt: null },
      }),
      prisma.site.findUnique({
        where: { id: siteId },
        select: { id: true, code: true, name: true, tenantId: true },
      }),
      // Non-conformités du chantier (pour permettre CC de déclarer/suivre)
      prisma.nonConformity.findMany({
        where: { siteId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
        include: {
          owner: { select: { firstName: true, lastName: true } },
        },
      }),
      // Personnel candidat owner (cadres du chantier ou du tenant)
      (async () => {
        if (!guard.session.tenantId) return [];
        return prisma.user.findMany({
          where: {
            tenantId: guard.session.tenantId,
            status: "ACTIVE",
            role: {
              in: [Role.TECH_DIRECTOR, Role.WORKS_DIRECTOR, Role.WORKS_MANAGER, Role.SITE_MANAGER],
            },
          },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: [{ role: "asc" }, { lastName: "asc" }],
          take: 50,
        });
      })(),
    ]);

  const daysSinceSerious = lastSerious
    ? Math.floor((Date.now() - lastSerious.occurredAt.getTime()) / 86_400_000)
    : 365;

  // TF1 = (incidents avec arrêt × 1 000 000) / (workforce × jours ouvrés × 8h)
  // 12 mois ouvrés ≈ 264 jours × 8h = 2 112 heures travaillées par ouvrier
  // Si aucune workforce déclarée → TF1 indéterminé (0 affiché).
  const HOURS_PER_WORKER_PER_YEAR = 264 * 8;
  const tf1 =
    workforceCount > 0
      ? Math.round(
          ((tf1Incidents * 1_000_000) / (workforceCount * HOURS_PER_WORKER_PER_YEAR)) * 10,
        ) / 10
      : 0;

  // Causerie sécurité semaine courante
  const now = new Date();
  const weekIso = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  let talk = await prisma.hseSafetyTalk.findUnique({
    where: { siteId_weekIso: { siteId, weekIso } },
  });
  if (!talk) {
    talk = await prisma.hseSafetyTalk.create({
      data: {
        siteId,
        weekIso,
        theme: "Travail en hauteur",
        description: "Vérification harnais, lignes de vie, garde-corps. Contrôle EPI individuel.",
      },
    });
  }

  return NextResponse.json({
    kpis: {
      daysSinceSerious,
      // TF1 calculé réellement (12 mois glissants × workforce courante)
      tf1,
      tf1Incidents,
      tf1WorkforceCount: workforceCount,
      ytdIncidents,
      // TODO : EPI à vérifier — nécessite une table EPIControl ou
      // Certification + suivi des dates de contrôle. Retourne 0 tant
      // que la table n'existe pas (plus honnête qu'une valeur fictive).
      epiToCheck: 0,
      // TODO : BCT (Bureau de Contrôle Technique) — nécessite une table
      // BctVisit ou ExternalVisit avec un type=BCT. Retourne null
      // pour que l'UI affiche "—" au lieu d'un chiffre fictif.
      bctVisitDays: null,
    },
    recentIncidents: recentIncidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      description: i.description.slice(0, 100),
      occurredAt: i.occurredAt.toISOString(),
    })),
    safetyTalk: {
      id: talk.id,
      theme: talk.theme,
      description: talk.description,
      completedAt: talk.completedAt?.toISOString() ?? null,
      attendeesCount: talk.attendeesCount,
    },
    site: site ? { id: site.id, code: site.code, name: site.name } : null,
    ncs: ncs.map((n) => ({
      id: n.id,
      category: n.category,
      criticality: n.criticality,
      description: n.description,
      correctiveAction: n.correctiveAction,
      dueDate: n.dueDate?.toISOString() ?? null,
      status: n.status,
      ownerId: n.ownerId,
      owner: n.owner ? `${n.owner.firstName} ${n.owner.lastName}` : null,
      createdAt: n.createdAt.toISOString(),
      closedAt: n.closedAt?.toISOString() ?? null,
    })),
    staff: staff.map((u) => ({
      id: u.id,
      fullName: `${u.firstName} ${u.lastName}`,
      role: u.role,
    })),
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
