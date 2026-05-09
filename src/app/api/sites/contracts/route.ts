import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const contracts = await prisma.siteContract.findMany({
    where: { site: { tenantId: { in: scopeIds } } },
    orderBy: { createdAt: "desc" },
    include: {
      site: { select: { id: true, code: true, name: true, client: true, status: true } },
    },
  });

  return NextResponse.json({
    items: contracts.map((c) => {
      const amendments = Array.isArray(c.amendments) ? (c.amendments as Array<{ amount?: number }>) : [];
      return {
        id: c.id,
        siteId: c.siteId,
        site: c.site,
        reference: c.reference,
        initialAmount: c.initialAmount.toString(),
        currentAmount: c.currentAmount.toString(),
        amendmentsCount: amendments.length,
        amendments,
        guarantees: c.guarantees,
        paymentTerms: c.paymentTerms,
        publicMarket: c.publicMarket,
        procuringEntity: c.procuringEntity,
        signedAt: c.signedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      };
    }),
    summary: {
      total: contracts.length,
      publicCount: contracts.filter((c) => c.publicMarket).length,
      privateCount: contracts.filter((c) => !c.publicMarket).length,
      totalCurrent: contracts.reduce((s, c) => s + c.currentAmount, 0n).toString(),
    },
  });
}
