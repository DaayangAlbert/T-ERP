/**
 * Recalcule le score d'une candidature (RH) à partir du profil actuel du
 * candidat et de l'offre. Met à jour Application.score.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { computeApplicationMatch } from "@/lib/application-score";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  const app = await prisma.application.findFirst({
    where: { id: params.id, jobOffer: { tenantId: session.tenantId } },
    select: { id: true, userId: true, jobOfferId: true },
  });
  if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

  const match = await computeApplicationMatch(app.userId, app.jobOfferId);
  if (!match) return NextResponse.json({ error: "Calcul impossible" }, { status: 422 });

  await prisma.application.update({
    where: { id: app.id },
    data: { score: match.score },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "application.rescore",
      entityType: "Application",
      entityId: app.id,
      metadata: { score: match.score },
    },
  });

  return NextResponse.json({ ok: true, score: match.score, breakdown: match.breakdown });
}
