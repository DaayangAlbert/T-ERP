import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.bankAccount.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { bank: "asc" },
  });

  const totalBalance = items.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = items.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = items.reduce((s, b) => s + b.creditLineUsed, 0n);

  return NextResponse.json({
    items: items.map((b) => ({
      id: b.id,
      bank: b.bank,
      accountNumber: b.accountNumber,
      accountType: b.accountType,
      currency: b.currency,
      balance: b.balance.toString(),
      creditLineGranted: b.creditLineGranted.toString(),
      creditLineUsed: b.creditLineUsed.toString(),
      creditLineAvailable: (b.creditLineGranted - b.creditLineUsed).toString(),
      renewalDate: b.renewalDate?.toISOString() ?? null,
      contact: b.contact,
      history12m: b.history12m,
    })),
    summary: {
      total: items.length,
      totalBalance: totalBalance.toString(),
      totalGranted: totalGranted.toString(),
      totalUsed: totalUsed.toString(),
      totalAvailable: (totalGranted - totalUsed).toString(),
    },
  });
}
