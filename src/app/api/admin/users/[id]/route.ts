import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.DG, Role.DAF, Role.HR, Role.TENANT_ADMIN];

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.nativeEnum(UserStatus).optional(),
  assignedSiteIds: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: {
      id: true,
      employeeId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      position: true,
      category: true,
      hireDate: true,
      contractType: true,
      twoFactorEnabled: true,
      assignedSiteIds: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const sites = user.assignedSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: user.assignedSiteIds } },
        select: { id: true, code: true, name: true },
      })
    : [];

  const recentAudit = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, metadata: true },
  });

  return NextResponse.json({
    user: {
      ...user,
      hireDate: user.hireDate?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    assignedSites: sites,
    recentAudit: recentAudit.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const before = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      position: true,
      category: true,
      status: true,
      assignedSiteIds: true,
    },
  });
  if (!before) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignedSiteIds: true,
      status: true,
    },
  });

  // Audit log : USER_UPDATED ou SITES_ASSIGNED si le périmètre change
  const sitesChanged =
    parsed.data.assignedSiteIds !== undefined &&
    JSON.stringify(parsed.data.assignedSiteIds) !== JSON.stringify(before.assignedSiteIds);
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: sitesChanged ? "user.sites.assigned" : "user.update",
      entityType: "User",
      entityId: params.id,
      metadata: { before, after: parsed.data },
    },
  });

  return NextResponse.json(updated);
}
