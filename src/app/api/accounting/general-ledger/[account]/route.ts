import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { account: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period"); // optionnel : "2026-04"

  // Toutes les lignes mouvementées sur le compte (préfixe pour 7 → 70x, 71x...)
  const lines = await prisma.accountingLine.findMany({
    where: {
      account: { startsWith: params.account },
      entry: {
        tenantId: session.tenantId,
        ...(period ? { period } : {}),
      },
    },
    include: {
      entry: { select: { reference: true, date: true, journal: true, label: true } },
    },
    orderBy: { entry: { date: "asc" } },
  });

  // Solde progressif
  let runningBalance = 0n;
  const movements = lines.map((l) => {
    runningBalance = runningBalance + l.debit - l.credit;
    return {
      id: l.id,
      account: l.account,
      label: l.label,
      reference: l.entry.reference,
      date: l.entry.date.toISOString(),
      journal: l.entry.journal,
      entryLabel: l.entry.label,
      debit: l.debit.toString(),
      credit: l.credit.toString(),
      balance: runningBalance.toString(),
    };
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0n);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0n);

  return NextResponse.json({
    account: params.account,
    movements,
    summary: {
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      finalBalance: (totalDebit - totalCredit).toString(),
      count: movements.length,
    },
  });
}
