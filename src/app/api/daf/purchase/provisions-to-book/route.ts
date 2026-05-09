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

  // Provisions à constituer = services livrés mais pas encore facturés
  const commitments = await prisma.supplierCommitment.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["ACTIVE", "PARTIAL_DELIVERY"] },
    },
    include: { supplierObj: { select: { name: true, category: true } } },
  });

  const provisions = commitments
    .filter((c) => c.deliveredAmount > c.invoicedAmount)
    .map((c) => ({
      id: c.id,
      supplier: c.supplierObj.name,
      category: c.supplierObj.category,
      poRef: c.poRef,
      delivered: c.deliveredAmount.toString(),
      invoiced: c.invoicedAmount.toString(),
      provisionAmount: (c.deliveredAmount - c.invoicedAmount).toString(),
      odReference: `OD-PROV-${c.poRef}`,
    }));

  const totalProvision = provisions.reduce((s, p) => s + BigInt(p.provisionAmount), 0n);

  return NextResponse.json({
    items: provisions,
    summary: {
      count: provisions.length,
      totalProvision: totalProvision.toString(),
    },
  });
}
