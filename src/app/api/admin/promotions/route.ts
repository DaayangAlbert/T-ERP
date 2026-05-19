import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, PromotionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Mapping rôle cible → rôles validateurs (ordre indicatif)
const VALIDATOR_MAP: Partial<Record<Role, Role[]>> = {
  ACCOUNTANT: [Role.DAF],
  WORKS_DIRECTOR: [Role.DAF, Role.TECH_DIRECTOR],
  WORKS_MANAGER: [Role.TECH_DIRECTOR],
  SITE_MANAGER: [Role.TECH_DIRECTOR],
  HR: [Role.DG],
  DAF: [Role.DG],
  TECH_DIRECTOR: [Role.DG],
};

const requestSchema = z.object({
  targetUserId: z.string(),
  toRole: z.nativeEnum(Role),
  requestedSiteIds: z.array(z.string()).default([]),
  justification: z.string().min(10),
});

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const validatorRole = url.searchParams.get("validatorRole") as Role | null;
  const status = (url.searchParams.get("status") as PromotionStatus) ?? "PENDING";

  const where: Record<string, unknown> = { tenantId: session.tenantId, status };
  if (validatorRole) where.validatorRoles = { has: validatorRole };

  const items = await prisma.rolePromotionRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      targetUser: { select: { firstName: true, lastName: true, email: true, role: true } },
      requestedBy: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  return NextResponse.json({
    items: items.map((p) => ({
      ...p,
      requestedAt: p.requestedAt.toISOString(),
      resolvedAt: p.resolvedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!([Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN] as Role[]).includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.targetUserId, tenantId: session.tenantId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const validatorRoles = VALIDATOR_MAP[parsed.data.toRole] ?? [Role.DG];

  const created = await prisma.rolePromotionRequest.create({
    data: {
      tenantId: session.tenantId,
      targetUserId: target.id,
      fromRole: target.role,
      toRole: parsed.data.toRole,
      requestedSiteIds: parsed.data.requestedSiteIds,
      justification: parsed.data.justification,
      requestedById: session.sub,
      validatorRoles,
      validations: [],
      status: PromotionStatus.PENDING,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "promotion.requested",
      entityType: "RolePromotionRequest",
      entityId: created.id,
      metadata: {
        targetUserId: target.id,
        fromRole: target.role,
        toRole: parsed.data.toRole,
        sites: parsed.data.requestedSiteIds,
      },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
