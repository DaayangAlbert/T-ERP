import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const in90 = new Date(now.getTime() + 90 * 86_400_000);

  const [bankGuarantees, financialCommitments] = await Promise.all([
    prisma.bankGuarantee.findMany({
      where: { contract: { tenantId: session.tenantId } },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
      include: { contract: { select: { reference: true, title: true, siteId: true, site: { select: { code: true, name: true } } } } },
      take: 300,
    }),
    prisma.financialCommitment.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ status: "asc" }, { maturityDate: "asc" }],
      take: 300,
    }),
  ]);

  const unifiedItems = [
    ...bankGuarantees.map((g) => ({
      id: g.id,
      kind: "BANK_GUARANTEE" as const,
      type: g.type,
      reference: null as string | null,
      bank: g.issuingBank,
      amount: g.amount.toString(),
      beneficiary: g.contract.title,
      issueDate: g.issuedAt.toISOString(),
      maturityDate: g.expiryDate.toISOString(),
      status: g.status,
      daysUntilMaturity: Math.ceil((g.expiryDate.getTime() - now.getTime()) / 86_400_000),
      site: g.contract.site,
      contractRef: g.contract.reference,
      releaseDate: g.releaseDate?.toISOString() ?? null,
    })),
    ...financialCommitments.map((c) => ({
      id: c.id,
      kind: c.type as
        | "BANK_GUARANTEE"
        | "FIRST_DEMAND_GUARANTEE"
        | "LETTER_CREDIT"
        | "PURCHASE_COMMITMENT",
      type: c.type,
      reference: c.reference,
      bank: c.bank,
      amount: c.amount.toString(),
      beneficiary: c.beneficiary,
      issueDate: c.issueDate.toISOString(),
      maturityDate: c.maturityDate.toISOString(),
      status: c.status,
      daysUntilMaturity: Math.ceil((c.maturityDate.getTime() - now.getTime()) / 86_400_000),
      site: null,
      contractRef: null,
      releaseDate: null,
    })),
  ];

  const active = unifiedItems.filter((i) => i.status === "ACTIVE");
  const expiringSoon = active.filter((i) => new Date(i.maturityDate) <= in30);
  const expiringNext90 = active.filter((i) => new Date(i.maturityDate) <= in90 && new Date(i.maturityDate) > in30);
  const totalActive = active.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpiringSoon = expiringSoon.reduce((s, i) => s + Number(i.amount), 0);
  const expired = unifiedItems.filter((i) => i.status === "EXPIRED").length;

  return NextResponse.json({
    summary: {
      activeCount: active.length,
      totalActive: String(totalActive),
      expiringSoonCount: expiringSoon.length,
      totalExpiringSoon: String(totalExpiringSoon),
      expiringNext90Count: expiringNext90.length,
      expiredCount: expired,
    },
    items: unifiedItems.sort((a, b) => a.daysUntilMaturity - b.daysUntilMaturity),
  });
}
