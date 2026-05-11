import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const minRating = parseFloat(searchParams.get("minRating") ?? "0");
  const fiscalOk = searchParams.get("fiscalOk") === "1";

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
    isSubcontractor: true,
  };
  if (minRating > 0) where.internalRating = { gte: minRating };

  const subs = await prisma.supplier.findMany({
    where,
    include: {
      contracts: { where: { status: "ACTIVE" }, select: { maxAmount: true } },
      _count: { select: { subEvaluations: true } },
    },
    orderBy: { internalRating: "desc" },
  });

  const filtered = subs.filter((s) => {
    if (specialty && !s.specialties.includes(specialty as any)) return false;
    if (fiscalOk) {
      const fc = s.fiscalCompliance as { cnps?: string; dgi?: string } | null;
      if (!fc || fc.cnps !== "OK" || fc.dgi !== "OK") return false;
    }
    return true;
  });

  const totalEngagements = filtered.reduce(
    (s, x) => s + x.contracts.reduce((cs, c) => cs + Number(c.maxAmount), 0),
    0
  );

  const alerts = subs.filter((s) => {
    const fc = s.fiscalCompliance as { cnps?: string; dgi?: string } | null;
    return !fc || fc.cnps !== "OK" || fc.dgi !== "OK";
  }).length;

  return NextResponse.json({
    kpis: {
      qualifiedCount: subs.length,
      frameworkActiveCount: subs.filter((s) => s.contracts.length > 0).length,
      activeEngagements: totalEngagements,
      pendingEvaluations: 6, // démo
      alertsCount: alerts,
    },
    items: filtered.map((s) => ({
      id: s.id,
      name: s.name,
      specialties: s.specialties as string[],
      agreements: s.agreements as string[],
      internalRating: s.internalRating,
      ratingsCount: s.ratingsCount,
      fiscalCompliance: s.fiscalCompliance,
      paymentTerms: s.paymentTerms,
      volumeYTD: Number(s.volumeYTD),
      evaluationsCount: s._count.subEvaluations,
    })),
  });
}
