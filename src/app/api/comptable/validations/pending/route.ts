import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

// Types de validations N1 du Comptable
const N1_TYPES: ValidationType[] = [ValidationType.PURCHASE, ValidationType.EXPENSE];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // En l'état du modèle Validation, il n'y a pas de siteId direct ; on retourne tout pour le MVP.
  const items = await prisma.validation.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      type: { in: N1_TYPES },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      initiator: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      amount: v.amount ? Number(v.amount) : null,
      initiator: v.initiator,
      currentStep: v.currentStep,
      priority: v.priority,
      dueDate: v.dueDate?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}
