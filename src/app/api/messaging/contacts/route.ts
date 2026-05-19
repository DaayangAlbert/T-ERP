import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAllowedDmTargetIds, isCadre } from "@/lib/rbac/messaging-access";

export const dynamic = "force-dynamic";

/**
 * Liste les contacts avec qui l'utilisateur peut initier un DM.
 *
 * - Cadres : tous les utilisateurs actifs du tenant (sauf CANDIDATE / SUPER_ADMIN).
 * - Non-cadres : uniquement les "chefs hiérarchiques" calculés par
 *   getAllowedDmTargetIds (managers de sites + DRH + teamLeaders dépt).
 *
 * Cette route est utilisée par NewChatModal pour la liste de sélection.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [] });

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const baseWhere = {
    tenantId: session.tenantId,
    id: { not: session.sub },
    role: { notIn: [Role.CANDIDATE, Role.SUPER_ADMIN] },
    status: "ACTIVE" as const,
  };

  // Cadre → tous les contacts du tenant. Non-cadre → seulement les autorisés.
  let where: typeof baseWhere | (typeof baseWhere & { id: { in: string[]; not: string } });
  if (isCadre(me.role)) {
    where = baseWhere;
  } else {
    const allowed = await getAllowedDmTargetIds(session.sub);
    where = {
      ...baseWhere,
      id: { not: session.sub, in: Array.from(allowed) },
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      position: true,
      department: true,
      teamLeader: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ items: users });
}
