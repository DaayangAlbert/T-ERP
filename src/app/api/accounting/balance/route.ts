import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { classOf, accountLabel, SYSCOHADA_CLASSES } from "@/lib/syscohada";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const level = url.searchParams.get("level") === "class" ? "class" : "account";
  const period = url.searchParams.get("period");

  const lines = await prisma.accountingLine.findMany({
    where: {
      entry: {
        tenantId: session.tenantId,
        ...(period ? { period } : {}),
      },
    },
  });

  const map = new Map<string, { account: string; label: string; debit: bigint; credit: bigint }>();
  for (const l of lines) {
    const key = level === "class" ? classOf(l.account) : l.account;
    const existing = map.get(key);
    if (existing) {
      existing.debit += l.debit;
      existing.credit += l.credit;
    } else {
      map.set(key, {
        account: key,
        label: level === "class" ? SYSCOHADA_CLASSES[key]?.label ?? `Classe ${key}` : accountLabel(l.account),
        debit: l.debit,
        credit: l.credit,
      });
    }
  }

  const rows = Array.from(map.values())
    .sort((a, b) => a.account.localeCompare(b.account))
    .map((r) => ({
      account: r.account,
      label: r.label,
      debit: r.debit.toString(),
      credit: r.credit.toString(),
      balance: (r.debit - r.credit).toString(),
      // Détection compte anormal : compte client (411x) en crédit, ou compte fournisseur (401x) en débit
      anomaly:
        (r.account.startsWith("411") && r.credit > r.debit) ||
        (r.account.startsWith("401") && r.debit > r.credit)
          ? "INVERTED_BALANCE"
          : null,
    }));

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0n);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0n);

  return NextResponse.json({
    level,
    rows,
    summary: {
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      balanced: totalDebit === totalCredit,
      anomalies: rows.filter((r) => r.anomaly).length,
    },
  });
}
