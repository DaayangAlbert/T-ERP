import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  // Lister tous les comptes bancaires + leurs rapprochements pour la période
  const banks = await prisma.bankAccount.findMany({
    where: { tenantId: session.tenantId },
    select: { id: true, bank: true, accountNumber: true, balance: true, primaryColor: true },
  });

  const recos = await prisma.bankReconciliation.findMany({
    where: { tenantId: session.tenantId, period },
  });
  const byBank = new Map(recos.map((r) => [r.bankAccountId, r]));

  return NextResponse.json({
    period,
    items: banks.map((b) => {
      const reco = byBank.get(b.id);
      return {
        bankAccountId: b.id,
        bank: b.bank,
        accountNumber: b.accountNumber,
        primaryColor: b.primaryColor,
        bookBalance: (reco?.bookBalance ?? b.balance).toString(),
        bankBalance: (reco?.bankBalance ?? b.balance).toString(),
        gap: (reco?.gap ?? 0n).toString(),
        status: reco?.status ?? "PENDING",
        completedAt: reco?.completedAt?.toISOString() ?? null,
        reconciliationId: reco?.id ?? null,
      };
    }),
  });
}
