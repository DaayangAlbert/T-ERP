import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

// Historique des avis rendus par le PCA (accords / refus).
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const items = await prisma.validation.findMany({
    where: { tenantId: { in: scopeIds }, ownerDecision: { in: ["APPROVED", "REJECTED"] } },
    include: { initiator: { select: { firstName: true, lastName: true } } },
    orderBy: { ownerDecisionAt: "desc" },
    take: 100,
  });

  let approuves = 0;
  let rejetes = 0;
  for (const v of items) {
    if (v.ownerDecision === "APPROVED") approuves++;
    else rejetes++;
  }

  return NextResponse.json({
    resume: { total: items.length, approuves, rejetes },
    items: items.map((v) => ({
      id: v.id,
      reference: v.reference,
      title: v.title,
      type: v.type,
      amount: v.amount?.toString() ?? null,
      decision: v.ownerDecision, // APPROVED | REJECTED
      motif: v.ownerDecisionReason,
      decidedAt: v.ownerDecisionAt?.toISOString() ?? null,
      initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
    })),
  });
}
