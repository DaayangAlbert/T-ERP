import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const items = await prisma.session.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { tenantId: session.tenantId },
    },
    orderBy: { lastActivityAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
  });

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      user: { id: s.user.id, name: `${s.user.firstName} ${s.user.lastName}`, email: s.user.email, role: s.user.role },
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      location: s.location,
      suspicious: s.suspicious,
      lastActivityAt: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
