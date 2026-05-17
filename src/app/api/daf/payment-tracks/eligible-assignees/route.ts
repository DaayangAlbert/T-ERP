import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.TENANT_ADMIN];

/**
 * Liste des utilisateurs éligibles comme responsable du suivi d'un
 * circuit de paiement. Plus large que /validations/eligible-approvers
 * car inclut le comptable (qui est le suivi par défaut).
 */
const ELIGIBLE_ROLES: Role[] = [
  Role.DAF,
  Role.ACCOUNTANT,
  Role.SECRETARY_GENERAL,
  Role.HR,
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.TENANT_ADMIN,
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: { in: ELIGIBLE_ROLES }, status: "ACTIVE" },
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
