import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";
import { AmendmentStatus, BillingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const [contract, amendments, billings, penalties] = await Promise.all([
    prisma.siteContract.findUnique({ where: { siteId: params.siteId } }),
    prisma.contractAmendment.findMany({
      where: { siteId: params.siteId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.progressBilling.findMany({
      where: { siteId: params.siteId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sitePenalty.findMany({
      where: { siteId: params.siteId },
      orderBy: { notifiedAt: "desc" },
    }),
  ]);

  const signedAmendmentsTotal = amendments
    .filter((a) => a.status === AmendmentStatus.SIGNED)
    .reduce((s, a) => s + Number(a.amount), 0);
  const pendingAmendmentsTotal = amendments
    .filter((a) => a.status !== AmendmentStatus.SIGNED && a.status !== AmendmentStatus.REJECTED)
    .reduce((s, a) => s + Number(a.amount), 0);
  const initial = contract ? Number(contract.initialAmount) : 0;
  const projected = initial + signedAmendmentsTotal + pendingAmendmentsTotal;

  const issuedBillings = billings.filter(
    (b) => b.status === BillingStatus.ISSUED || b.status === BillingStatus.PAID || b.status === BillingStatus.PARTIALLY_PAID
  );
  const totalCollected = issuedBillings.reduce((s, b) => s + (b.paidAmount ? Number(b.paidAmount) : 0), 0);
  const totalInvoiced = issuedBillings.reduce((s, b) => s + Number(b.amountTtc), 0);

  // Retenue garantie cumulée
  const totalGuarantee = billings.reduce((s, b) => s + Number(b.guaranteeRetention), 0);

  return NextResponse.json({
    contract: contract
      ? {
          reference: contract.reference,
          initialAmount: Number(contract.initialAmount),
          signedAmendmentsTotal,
          pendingAmendmentsTotal,
          projected,
          publicMarket: contract.publicMarket,
          procuringEntity: contract.procuringEntity,
          signedAt: contract.signedAt?.toISOString() ?? null,
        }
      : null,
    billings: billings.map((b) => ({
      id: b.id,
      billingNumber: b.billingNumber,
      period: b.period,
      amountHt: Number(b.amountHt),
      amountTtc: Number(b.amountTtc),
      netToReceive: Number(b.netToReceive),
      paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
      dueDate: b.dueDate.toISOString(),
      status: b.status,
    })),
    amendments: amendments.map((a) => ({
      id: a.id,
      reference: a.reference,
      amount: Number(a.amount),
      extraDays: a.extraDays,
      reason: a.reason,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
    penalties: penalties.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      reason: p.reason,
      notifiedAt: p.notifiedAt.toISOString(),
      status: p.status,
    })),
    kpis: {
      issuedCount: issuedBillings.length,
      totalInvoiced,
      totalCollected,
      collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
      totalGuarantee,
      penaltiesCount: penalties.length,
    },
  });
}
