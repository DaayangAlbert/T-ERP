import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanHorizon, OperationalPlanStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";

export const dynamic = "force-dynamic";

const READ_ROLES: Role[] = [
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.DG,
  Role.DAF,
  Role.TECH_DIRECTOR,
  Role.SUPER_ADMIN,
];
const WRITE_ROLES: Role[] = [Role.WORKS_DIRECTOR, Role.WORKS_MANAGER];

const createSchema = z.object({
  siteId: z.string().min(1),
  horizon: z.nativeEnum(PlanHorizon),
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
  title: z.string().max(160).optional(),
  objective: z.string().max(4000).optional(),
});

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!READ_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  const horizon = url.searchParams.get("horizon") as PlanHorizon | null;
  if (!siteId) return NextResponse.json({ error: "siteId requis" }, { status: 400 });

  const allowed = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowed, siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  const plans = await prisma.operationalPlan.findMany({
    where: { siteId, ...(horizon ? { horizon } : {}) },
    orderBy: { periodStart: "desc" },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({
    items: plans.map((p) => ({
      id: p.id,
      horizon: p.horizon,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      title: p.title,
      objective: p.objective,
      status: p.status,
      tasksCount: p._count.tasks,
      author: `${p.author.firstName} ${p.author.lastName}`.trim(),
      authorRole: p.author.role,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!WRITE_ROLES.includes(session.role as Role)) {
    return NextResponse.json(
      { error: "Lecture seule (réservé Conducteur / Directeur des travaux)" },
      { status: 403 },
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const allowed = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowed, data.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  const start = new Date(data.periodStart);
  const end = new Date(data.periodEnd);
  if (end <= start) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  const created = await prisma.operationalPlan.create({
    data: {
      tenantId: session.tenantId!,
      siteId: data.siteId,
      authorId: session.sub,
      horizon: data.horizon,
      periodStart: start,
      periodEnd: end,
      title: data.title?.trim() || null,
      objective: data.objective?.trim() || null,
      status: OperationalPlanStatus.DRAFT,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "operational-plan.create",
      entityType: "OperationalPlan",
      entityId: created.id,
      metadata: { siteId: data.siteId, horizon: data.horizon },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
