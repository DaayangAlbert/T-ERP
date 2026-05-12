import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const [suppliers, frameworks, evaluations] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ strategic: "desc" }, { volumeYTD: "desc" }],
      include: { _count: { select: { contracts: true, purchaseOrders: true, evaluations: true } } },
    }),
    prisma.frameworkContract.findMany({
      where: { tenantId: session.tenantId, status: "ACTIVE" },
      include: { supplier: { select: { id: true, name: true, category: true } } },
      orderBy: { endDate: "asc" },
    }),
    prisma.supplierEvaluation.findMany({
      where: { supplier: { tenantId: session.tenantId } },
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // KPIs
  const totalEngagementsYtd = suppliers.reduce((s, x) => s + Number(x.volumeYTD), 0);
  const fiscalCompliant = suppliers.filter((s) => {
    const fc = s.fiscalCompliance as { cnps?: string; dgi?: string } | null;
    return fc && fc.cnps === "OK" && fc.dgi === "OK";
  }).length;
  const fiscalPending = suppliers.length - fiscalCompliant;

  return NextResponse.json({
    kpis: {
      activeCount: suppliers.length,
      frameworkCount: frameworks.length,
      totalEngagementsYtd,
      fiscalCompliantCount: fiscalCompliant,
      fiscalPendingCount: fiscalPending,
    },
    frameworks: frameworks.map((f) => {
      const daysLeft = Math.floor((f.endDate.getTime() - Date.now()) / 86400_000);
      return {
        id: f.id,
        reference: f.reference,
        supplierId: f.supplier.id,
        supplierName: f.supplier.name,
        category: f.supplier.category,
        subject: f.subject,
        maxAmount: Number(f.maxAmount),
        usedAmount: Number(f.usedAmount),
        endDate: f.endDate.toISOString(),
        daysLeft,
        expiringSoon: daysLeft >= 0 && daysLeft <= 60,
      };
    }),
    suppliers: suppliers.map((s) => {
      const fc = s.fiscalCompliance as { cnps?: string; dgi?: string; lastChecked?: string } | null;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        taxId: s.taxId,
        ratingQuality: s.ratingQuality,
        ratingDelay: s.ratingDelay,
        ratingPrice: s.ratingPrice,
        strategic: s.strategic,
        blocked: s.blocked,
        volumeYTD: Number(s.volumeYTD),
        poCount: s._count.purchaseOrders,
        frameworkCount: s._count.contracts,
        evaluationsCount: s._count.evaluations,
        fiscalOk: fc?.cnps === "OK" && fc?.dgi === "OK",
        fiscalCnps: fc?.cnps ?? "PENDING",
        fiscalDgi: fc?.dgi ?? "PENDING",
      };
    }),
    evaluations: evaluations.map((e) => ({
      id: e.id,
      supplierName: e.supplier.name,
      period: e.period,
      ratingQuality: e.ratingQuality,
      ratingDelay: e.ratingDelay,
      ratingPrice: e.ratingPrice,
      avg: (e.ratingQuality + e.ratingDelay + e.ratingPrice) / 3,
      comments: e.comments,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
