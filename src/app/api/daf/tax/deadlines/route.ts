import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10));
  const upTo = new Date(Date.now() + days * 86_400_000);

  const items = await prisma.taxDeadline.findMany({
    where: { tenantId: session.tenantId, dueDate: { lte: upTo } },
    orderBy: { dueDate: "asc" },
  });

  // KPIs
  const upcoming = items.filter((t) => t.paymentStatus !== "PAID");
  const totalAmount = upcoming.reduce((s, t) => s + (t.amount ?? 0n), 0n);
  const conformityYTD = items.length
    ? Math.round((items.filter((t) => t.paymentStatus === "PAID").length / items.length) * 100)
    : 100;

  // TVA crédit synthèse (par convention, si solde TVA déductible > collectée)
  const vatCredit = 0; // placeholder

  return NextResponse.json({
    items: items.map((t) => {
      const daysLeft = Math.floor((t.dueDate.getTime() - Date.now()) / 86_400_000);
      return {
        id: t.id,
        type: t.type,
        authority: t.authority,
        period: t.period,
        dueDate: t.dueDate.toISOString(),
        daysLeft,
        amount: t.amount?.toString() ?? null,
        declarationStatus: t.declarationStatus,
        paymentStatus: t.paymentStatus,
        declaredAt: t.declaredAt?.toISOString() ?? null,
        paidAt: t.paidAt?.toISOString() ?? null,
      };
    }),
    summary: {
      upcomingCount: upcoming.length,
      totalAmount: totalAmount.toString(),
      conformityYTD,
      vatCredit,
    },
  });
}
