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

  const items = await prisma.taxDeadline.findMany({
    where: {
      tenantId: session.tenantId,
      declarationStatus: { in: ["SUBMITTED", "ACCEPTED"] },
    },
    orderBy: { declaredAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    items: items.map((t) => ({
      id: t.id,
      type: t.type,
      authority: t.authority,
      period: t.period,
      declaredAt: t.declaredAt?.toISOString() ?? null,
      paidAt: t.paidAt?.toISOString() ?? null,
      receiptUrl: t.receiptUrl,
      declarationStatus: t.declarationStatus,
      paymentStatus: t.paymentStatus,
    })),
  });
}
