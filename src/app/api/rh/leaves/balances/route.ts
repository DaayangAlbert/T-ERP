/**
 * Soldes de congés — 100 % BDD (LeaveBalance).
 * Renvoie les 30 collaborateurs ayant le plus de jours pris en priorité.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const balances = await prisma.leaveBalance.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { paidLeaveTaken: "desc" },
    take: 30,
  });

  return NextResponse.json({
    items: balances.map((b) => ({
      employeeKey: b.employeeKey,
      employeeName: b.employeeName,
      paidLeaveAcquired: b.paidLeaveAcquired,
      paidLeaveTaken: b.paidLeaveTaken,
      rttBalance: b.rttBalance,
      lastTakenAt: b.lastTakenAt?.toISOString() ?? null,
    })),
  });
}
