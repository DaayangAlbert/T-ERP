import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const APPROVER_ROLES: Role[] = [Role.DAF, Role.HR, Role.TECH_DIRECTOR, Role.WORKS_DIRECTOR, Role.SG];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: { in: APPROVER_ROLES }, status: "ACTIVE" },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true, position: true },
  });

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      position: u.position,
    })),
  });
}
