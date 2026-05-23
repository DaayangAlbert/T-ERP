import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Seul le DG peut demander l'autorisation du Propriétaire / PCA.
const ALLOWED: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au DG" }, { status: 403 });
  }

  const validation = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, status: true, ownerDecision: true, reference: true, title: true },
  });
  if (!validation) return NextResponse.json({ error: "Validation introuvable" }, { status: 404 });
  if (validation.status !== ValidationStatus.PENDING) {
    return NextResponse.json({ error: "Cette validation est déjà tranchée" }, { status: 409 });
  }
  if (validation.ownerDecision) {
    return NextResponse.json({ error: "Déjà transmise au Propriétaire / PCA" }, { status: 409 });
  }

  await prisma.validation.update({
    where: { id: validation.id },
    data: { ownerEscalatedAt: new Date(), ownerEscalatedById: session.sub, ownerDecision: "PENDING" },
  });

  // Notifie le ou les Propriétaire / PCA du tenant.
  const owners = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: Role.OWNER, status: "ACTIVE" },
    select: { id: true },
  });
  if (owners.length) {
    await prisma.notification.createMany({
      data: owners.map((o) => ({
        userId: o.id,
        type: "owner_decision_requested",
        title: "Le DG demande votre autorisation",
        body: `${validation.reference} — ${validation.title}`,
        link: "/proprietaire/decisions",
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "dg.validation.escalate_owner",
      entityType: "Validation",
      entityId: validation.id,
      metadata: { reference: validation.reference },
    },
  });

  return NextResponse.json({ ok: true });
}
