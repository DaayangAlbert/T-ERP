import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  // Mix : soldes persistés + synthèse pour le reste
  const persisted = await prisma.leaveBalance.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { paidLeaveTaken: "desc" },
    take: 30,
  });
  const persistedKeys = new Set(persisted.map((p) => p.employeeKey));

  const synthetic = getSyntheticPersonnel(487).slice(0, 25 - persisted.length).map((p, i) => ({
    employeeKey: p.id,
    employeeName: `${p.firstName} ${p.lastName}`,
    paidLeaveAcquired: 30,
    paidLeaveTaken: 5 + ((i * 3) % 22),
    rttBalance: 4 + ((i * 2) % 8),
    lastTakenAt: new Date(Date.now() - (10 + i * 4) * 86_400_000).toISOString(),
  }));

  const items = [
    ...persisted.map((p) => ({
      employeeKey: p.employeeKey,
      employeeName: p.employeeName,
      paidLeaveAcquired: p.paidLeaveAcquired,
      paidLeaveTaken: p.paidLeaveTaken,
      rttBalance: p.rttBalance,
      lastTakenAt: p.lastTakenAt?.toISOString() ?? null,
    })),
    ...synthetic.filter((s) => !persistedKeys.has(s.employeeKey)),
  ];

  return NextResponse.json({ items });
}
