import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.receivable.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE", "LITIGATION"] },
    },
    select: { amount: true, paidAmount: true, dueDate: true },
  });

  const now = Date.now();
  const buckets = { notDue: 0n, lt30: 0n, t30_60: 0n, t60_90: 0n, gt90: 0n };

  for (const r of items) {
    const remaining = r.amount - r.paidAmount;
    const daysOverdue = Math.floor((now - r.dueDate.getTime()) / 86_400_000);
    if (daysOverdue < 0) buckets.notDue += remaining;
    else if (daysOverdue < 30) buckets.lt30 += remaining;
    else if (daysOverdue < 60) buckets.t30_60 += remaining;
    else if (daysOverdue < 90) buckets.t60_90 += remaining;
    else buckets.gt90 += remaining;
  }

  const total = buckets.notDue + buckets.lt30 + buckets.t30_60 + buckets.t60_90 + buckets.gt90;
  const pct = (v: bigint) => (total > 0n ? Number((v * 1000n) / total) / 10 : 0);

  // KPIs annexes
  const overdue = buckets.lt30 + buckets.t30_60 + buckets.t60_90 + buckets.gt90;

  // DSO synthétisé : moyenne pondérée des retards
  const totalNum = Number(total);
  const dso = totalNum > 0
    ? Math.round(
        (Number(buckets.notDue) * 30 +
          Number(buckets.lt30) * 45 +
          Number(buckets.t30_60) * 60 +
          Number(buckets.t60_90) * 75 +
          Number(buckets.gt90) * 120) / totalNum
      )
    : 0;

  // Encaissé YTD synthétisé depuis paidAmount
  const paidYTD = items.reduce((s, r) => s + r.paidAmount, 0n);

  return NextResponse.json({
    buckets: [
      { range: "Non échu", amount: buckets.notDue.toString(), pct: pct(buckets.notDue), color: "#15803D" },
      { range: "Échu < 30 j", amount: buckets.lt30.toString(), pct: pct(buckets.lt30), color: "#B45309" },
      { range: "Échu 30–60 j", amount: buckets.t30_60.toString(), pct: pct(buckets.t30_60), color: "#B45309" },
      { range: "Échu 60–90 j", amount: buckets.t60_90.toString(), pct: pct(buckets.t60_90), color: "#B91C1C" },
      { range: "Échu > 90 j (douteux)", amount: buckets.gt90.toString(), pct: pct(buckets.gt90), color: "#B91C1C" },
    ],
    summary: {
      totalReceivables: total.toString(),
      overdue: overdue.toString(),
      dso,
      paidYTD: paidYTD.toString(),
    },
  });
}
