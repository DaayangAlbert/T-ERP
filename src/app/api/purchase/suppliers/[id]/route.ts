import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  const [pos, evaluations, contracts] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.supplierEvaluation.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.frameworkContract.findMany({
      where: { supplierId: supplier.id, status: "ACTIVE" },
    }),
  ]);

  return NextResponse.json({
    id: supplier.id,
    name: supplier.name,
    category: supplier.category,
    taxId: supplier.taxId,
    rccm: supplier.rccm,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    paymentTerms: supplier.paymentTerms,
    ratingQuality: supplier.ratingQuality,
    ratingDelay: supplier.ratingDelay,
    ratingPrice: supplier.ratingPrice,
    strategic: supplier.strategic,
    blocked: supplier.blocked,
    blockReason: supplier.blockReason,
    volumeYTD: supplier.volumeYTD.toString(),
    poCount: supplier.poCount,
    history: pos.map((p) => ({
      id: p.id,
      reference: p.reference,
      label: p.label,
      amount: p.amount.toString(),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    evaluations: evaluations.map((e) => ({
      id: e.id,
      period: e.period,
      ratingQuality: e.ratingQuality,
      ratingDelay: e.ratingDelay,
      ratingPrice: e.ratingPrice,
      comments: e.comments,
      createdAt: e.createdAt.toISOString(),
    })),
    activeContracts: contracts.map((c) => ({
      id: c.id,
      reference: c.reference,
      subject: c.subject,
      maxAmount: c.maxAmount.toString(),
      usedAmount: c.usedAmount.toString(),
      endDate: c.endDate.toISOString(),
    })),
  });
}
