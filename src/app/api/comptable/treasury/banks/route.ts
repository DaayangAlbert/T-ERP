import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DIRECTION_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DIRECTION_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Comptable Chantier (assignedSiteIds non vide) : exclu
  if (session.role === Role.ACCOUNTANT) {
    const u = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (u && u.assignedSiteIds.length > 0) {
      return NextResponse.json({ error: "Banques réservées au Comptable Direction" }, { status: 403 });
    }
  }

  const banks = await prisma.bankAccount.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { bank: "asc" },
  });

  return NextResponse.json({
    items: banks.map((b) => ({
      id: b.id,
      bankName: b.bank,
      accountNumber: b.accountNumber,
      currency: b.currency,
      balance: Number(b.balance),
      accountType: b.accountType,
    })),
  });
}
