import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["OPEN", "MEDIATION", "COURT_PENDING", "APPEAL", "SUPREME_COURT"] as const;

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const cases = await prisma.legalCase.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: "asc" }, { nextHearingDate: "asc" }],
    take: 200,
    include: { relatedContract: { select: { reference: true, title: true } } },
  });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  const active = cases.filter((c) => (ACTIVE_STATUSES as readonly string[]).includes(c.status));
  const totalAtRisk = active.reduce((s, c) => s + Number(c.amountAtStake), 0);
  const totalProvisioned = active.reduce((s, c) => s + Number(c.provisionAmount), 0);
  const upcomingHearings = active.filter((c) => c.nextHearingDate && c.nextHearingDate <= in30Days);
  const won = cases.filter((c) => c.status === "WON").length;
  const lost = cases.filter((c) => c.status === "LOST").length;

  return NextResponse.json({
    summary: {
      activeCount: active.length,
      totalAtRisk: String(totalAtRisk),
      totalProvisioned: String(totalProvisioned),
      coverageRatio: totalAtRisk > 0 ? (totalProvisioned / totalAtRisk) * 100 : 0,
      upcomingHearingsCount: upcomingHearings.length,
      won,
      lost,
    },
    cases: cases.map((c) => ({
      id: c.id,
      reference: c.reference,
      title: c.title,
      ourPosition: c.ourPosition,
      jurisdiction: c.jurisdiction,
      opposingParty: c.opposingParty,
      amountAtStake: c.amountAtStake.toString(),
      provisionAmount: c.provisionAmount.toString(),
      lawyerName: c.lawyerName,
      lawFirm: c.lawFirm,
      status: c.status,
      nextHearingDate: c.nextHearingDate?.toISOString() ?? null,
      daysUntilHearing: c.nextHearingDate ? Math.ceil((c.nextHearingDate.getTime() - now.getTime()) / 86_400_000) : null,
      openedAt: c.openedAt.toISOString(),
      relatedContract: c.relatedContract,
    })),
  });
}
