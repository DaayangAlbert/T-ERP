import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Solde de congés pour l'année courante (ou ?year=YYYY). Si la ligne
 * n'existe pas encore, renvoie un solde "vide" 30 j acquis sans avoir
 * besoin de créer la ligne — la création se fait au premier congé pris.
 */
export async function GET(req: Request) {
  const guard = guardEmp();
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
