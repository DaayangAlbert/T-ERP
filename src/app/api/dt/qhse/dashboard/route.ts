import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// QHSE_MANAGER est propriétaire du QHSE (FULL). DT/DG/OWNER/DAF/SUPER_ADMIN gardent une vue READ.
const ALLOWED: Role[] = [Role.QHSE_MANAGER, Role.TECH_DIRECTOR, Role.WORKS_DIRECTOR, Role.DG, Role.OWNER, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [incidents, audits, ncs, certs, sites, staff] = await Promise.all([
    prisma.hseIncident.findMany({
      where: { site: { tenantId: { in: scopeIds } } },
      include: { site: { select: { code: true, name: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.siteAudit.findMany({
      where: { site: { tenantId: { in: scopeIds } } },
      include: { site: { select: { code: true, name: true } } },
      orderBy: { scheduledAt: "desc" },
    }),
    prisma.nonConformity.findMany({
      where: { site: { tenantId: { in: scopeIds } } },
      include: {
        site: { select: { code: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.certification.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { standard: "asc" },
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findMany({
      where: {
        tenantId: { in: scopeIds },
        status: "ACTIVE",
        role: {
          in: [
            Role.TECH_DIRECTOR,
            Role.WORKS_DIRECTOR,
            Role.WORKS_MANAGER,
            Role.SITE_MANAGER,
          ],
        },
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const ytdIncidents = incidents.filter((i) => i.occurredAt >= yearStart);
  const fatalCount = incidents.filter((i) => i.type === "FATAL_ACCIDENT").length;
  const lastIncident = incidents[0]?.occurredAt;
  const daysSinceLast = lastIncident
    ? Math.floor((Date.now() - lastIncident.getTime()) / 86400_000)
    : 999;
  // TF1 = nombre AT × 1 000 000 / heures travaillées ; pour la démo on simplifie
  const tf1 = ytdIncidents.length > 0 ? Math.round((ytdIncidents.length / 12) * 10) : 0;

  const auditsThisMonth = audits.filter((a) => a.scheduledAt >= monthStart);

  return NextResponse.json({
    banner: {
      daysSinceMajorAccident: daysSinceLast,
      fatalYtd: fatalCount,
      tf1: tf1,
      tf1Target: 15,
    },
    kpis: {
      incidentsYtd: ytdIncidents.length,
      tf1,
      auditsThisMonth: auditsThisMonth.length,
      openNcCount: ncs.filter((n) => n.status !== "CLOSED").length,
    },
    incidents: incidents.slice(0, 12).map((i) => ({
      id: i.id,
      occurredAt: i.occurredAt.toISOString(),
      site: i.site.code,
      siteName: i.site.name,
      type: i.type,
      severity: i.severity,
      victimsCount: i.victimsCount,
      workdaysLost: i.workdaysLost,
      description: i.description,
      status: i.status,
    })),
    audits: audits.map((a) => ({
      id: a.id,
      site: a.site.code,
      siteName: a.site.name,
      auditType: a.auditType,
      scheduledAt: a.scheduledAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      score: a.score,
    })),
    ncs: ncs.map((n) => ({
      id: n.id,
      siteId: n.siteId,
      site: n.site?.code ?? "—",
      siteName: n.site?.name ?? "—",
      category: n.category,
      criticality: n.criticality,
      description: n.description,
      correctiveAction: n.correctiveAction,
      dueDate: n.dueDate?.toISOString() ?? null,
      status: n.status,
      owner: n.owner ? `${n.owner.firstName} ${n.owner.lastName}` : null,
      ownerId: n.ownerId,
      createdAt: n.createdAt.toISOString(),
      closedAt: n.closedAt?.toISOString() ?? null,
    })),
    sites,
    staff: staff.map((u) => ({
      id: u.id,
      fullName: `${u.firstName} ${u.lastName}`,
      role: u.role,
    })),
    certifications: certs.map((c) => ({
      id: c.id,
      standard: c.standard,
      scope: c.scope,
      issuedBy: c.issuedBy,
      validUntil: c.validUntil.toISOString(),
      surveillanceAuditDate: c.surveillanceAuditDate?.toISOString() ?? null,
      openNcCount: c.openNcCount,
    })),
  });
}
