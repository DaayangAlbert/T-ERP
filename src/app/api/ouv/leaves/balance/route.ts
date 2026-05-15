import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/leaves/balance?year=YYYY
// Renvoie le solde de congés payés + jours pris + compensatoires + maladie.
// Défaut 30 j acquis si pas de ligne LeaveBalance encore.
export async function GET(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());

  const balance = await prisma.leaveBalance.findFirst({
    where: { userId: session.sub, year },
    select: {
      paidLeaveAcquired: true,
      paidLeaveTaken: true,
      paidLeaveRemaining: true,
      compensatoryDays: true,
      sickDaysUsed: true,
      unpaidLeaveUsed: true,
      year: true,
    },
  });

  return NextResponse.json({
    year,
    balance: balance ?? {
      year,
      paidLeaveAcquired: 30,
      paidLeaveTaken: 0,
      paidLeaveRemaining: 30,
      compensatoryDays: 0,
      sickDaysUsed: 0,
      unpaidLeaveUsed: 0,
    },
  });
}
