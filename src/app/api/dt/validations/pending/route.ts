import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [pending, monthValidated] = await Promise.all([
    prisma.validation.findMany({
      where: {
        tenantId: session.tenantId,
        status: ValidationStatus.PENDING,
        dtValidationRequired: true,
        currentStep: "DT",
      },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.validation.findMany({
      where: {
        tenantId: session.tenantId,
        dtValidationRequired: true,
        dtValidatedAt: { gte: monthStart },
      },
      select: { dtValidatedAt: true, createdAt: true },
    }),
  ]);

  // Délai moyen DT (entre createdAt et dtValidatedAt) en heures
  const delays = monthValidated
    .map((v) =>
      v.dtValidatedAt
        ? (v.dtValidatedAt.getTime() - v.createdAt.getTime()) / 3600_000
        : null
    )
    .filter((x): x is number => x !== null && x >= 0);
  const avgDelay = delays.length ? delays.reduce((s, x) => s + x, 0) / delays.length : 0;

  return NextResponse.json({
    items: pending.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      amount: v.amount ? Number(v.amount) : null,
      priority: v.priority,
      createdAt: v.createdAt.toISOString(),
      initiator: v.initiator
        ? `${v.initiator.firstName.charAt(0)}. ${v.initiator.lastName}`
        : null,
      ageHours: Math.round((Date.now() - v.createdAt.getTime()) / 3600_000),
      workflow: v.workflow,
    })),
    kpis: {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, v) => s + (v.amount ? Number(v.amount) : 0), 0),
      avgDelayHours: Number(avgDelay.toFixed(1)),
      monthValidatedCount: monthValidated.length,
    },
  });
}
