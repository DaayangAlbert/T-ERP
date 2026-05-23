import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ProjectAccountEntryType, MovementDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [banks, bankMoves, projAccounts, debtRows, salary] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId: { in: scopeIds }, isActive: true },
      select: { bank: true, accountNumber: true, balance: true, creditLineGranted: true, creditLineUsed: true },
      orderBy: { bank: "asc" },
    }),
    prisma.bankMovement.findMany({
      where: { bankAccount: { tenantId: { in: scopeIds } }, occurredAt: { gte: monthStart } },
      select: { direction: true, amount: true },
    }),
    prisma.projectAccount.findMany({
      where: { tenantId: { in: scopeIds } },
      select: { id: true, balance: true, site: { select: { code: true, name: true } }, bankAccount: { select: { bank: true } } },
      orderBy: { site: { code: "asc" } },
    }),
    prisma.projectAccountMovement.groupBy({
      by: ["accountId", "type"],
      where: { account: { tenantId: { in: scopeIds } }, type: { in: [ProjectAccountEntryType.FUNDING, ProjectAccountEntryType.REPAYMENT] } },
      _sum: { amount: true },
    }),
    prisma.salaryAccount.findFirst({
      where: { tenantId: session.tenantId },
      select: { balance: true, bankAccount: { select: { bank: true, accountNumber: true } } },
    }),
  ]);

  const funded = new Map<string, bigint>();
  const repaid = new Map<string, bigint>();
  for (const r of debtRows) {
    (r.type === ProjectAccountEntryType.FUNDING ? funded : repaid).set(r.accountId, r._sum.amount ?? 0n);
  }

  const totalSolde = banks.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = banks.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = banks.reduce((s, b) => s + b.creditLineUsed, 0n);
  let entrees = 0n;
  let sorties = 0n;
  for (const m of bankMoves) {
    if (m.direction === MovementDirection.INBOUND) entrees += m.amount;
    else sorties += m.amount;
  }
  const totalDette = projAccounts.reduce((s, a) => s + ((funded.get(a.id) ?? 0n) - (repaid.get(a.id) ?? 0n)), 0n);

  return NextResponse.json({
    banques: {
      total: totalSolde.toString(),
      creditAccorde: totalGranted.toString(),
      creditUtilise: totalUsed.toString(),
      creditDisponible: (totalGranted - totalUsed).toString(),
      items: banks.map((b) => ({
        bank: b.bank,
        accountNumber: b.accountNumber,
        balance: b.balance.toString(),
        creditDisponible: (b.creditLineGranted - b.creditLineUsed).toString(),
      })),
    },
    mois: {
      entrees: entrees.toString(),
      sorties: sorties.toString(),
      net: (entrees - sorties).toString(),
    },
    comptesProjet: {
      detteTotale: totalDette.toString(),
      items: projAccounts.map((a) => ({
        siteCode: a.site.code,
        siteName: a.site.name,
        balance: a.balance.toString(),
        debt: ((funded.get(a.id) ?? 0n) - (repaid.get(a.id) ?? 0n)).toString(),
        banque: a.bankAccount?.bank ?? null,
      })),
    },
    compteSalaire: salary
      ? { balance: salary.balance.toString(), banque: salary.bankAccount ? `${salary.bankAccount.bank} · ${salary.bankAccount.accountNumber}` : null }
      : null,
  });
}
