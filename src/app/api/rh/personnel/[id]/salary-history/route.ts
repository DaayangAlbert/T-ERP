/**
 * Historique salarial d'un collaborateur — lecture seule.
 * Renvoie la liste des révisions ordonnée du plus récent au plus ancien.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const READ_ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const REASON_LABEL: Record<string, string> = {
  HIRING: "Embauche",
  ANNUAL_REVIEW: "Révision annuelle",
  PROMOTION: "Promotion",
  NEGOTIATION: "Renégociation",
  CCM_ADJUSTMENT: "Ajustement CCM",
  CORRECTION: "Correction",
  OTHER: "Autre",
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!READ_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }
  if (params.id.startsWith("syn_")) {
    return NextResponse.json({ items: [] });
  }

  // Vérifie que l'user existe et appartient au tenant
  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const items = await prisma.salaryHistory.findMany({
    where: { userId: user.id },
    orderBy: { effectiveAt: "desc" },
  });

  // Pour décodage humain : joindre le nom du decidedBy
  const deciderIds = Array.from(
    new Set(items.map((i) => i.decidedById).filter((id): id is string => Boolean(id))),
  );
  const deciders = deciderIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: deciderIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const deciderById = new Map(deciders.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      effectiveAt: i.effectiveAt.toISOString().slice(0, 10),
      baseSalary: Number(i.baseSalary),
      previousBase: i.previousBase ? Number(i.previousBase) : null,
      variation: i.previousBase
        ? Math.round(((Number(i.baseSalary) - Number(i.previousBase)) / Number(i.previousBase)) * 1000) / 10
        : null,
      reason: i.reason,
      reasonLabel: REASON_LABEL[i.reason] ?? i.reason,
      notes: i.notes,
      decidedBy: i.decidedById ? deciderById.get(i.decidedById) ?? null : null,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
