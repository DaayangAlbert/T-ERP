import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const search = url.searchParams.get("q")?.trim();
  const userId = url.searchParams.get("userId");
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");
  const since = url.searchParams.get("since");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (entityType) where.entityType = entityType;
  if (since) where.createdAt = { gte: new Date(since) };
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      user: a.user ? `${a.user.firstName} ${a.user.lastName}` : "—",
      userEmail: a.user?.email ?? null,
      ipAddress: a.ipAddress,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
