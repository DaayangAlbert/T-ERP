import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { LegalCaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const OPEN_STATUSES: LegalCaseStatus[] = [
  LegalCaseStatus.OPEN,
  LegalCaseStatus.MEDIATION,
  LegalCaseStatus.COURT_PENDING,
  LegalCaseStatus.APPEAL,
  LegalCaseStatus.SUPREME_COURT,
];

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86_400_000);

  const cases = await prisma.legalCase.findMany({
    where: {
      tenantId,
      status: { in: OPEN_STATUSES },
      nextHearingDate: { gte: now, lte: horizon },
    },
    orderBy: { nextHearingDate: "asc" },
    select: {
      id: true,
      reference: true,
      title: true,
      jurisdiction: true,
      opposingParty: true,
      ourPosition: true,
      lawyerName: true,
      lawFirm: true,
      nextHearingDate: true,
      amountAtStake: true,
      provisionAmount: true,
      status: true,
    },
  });

  const items = cases.map((c) => {
    const d = c.nextHearingDate!;
    const daysAway = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
    return {
      caseId: c.id,
      reference: c.reference,
      title: c.title,
      jurisdiction: c.jurisdiction,
      opposingParty: c.opposingParty,
      ourPosition: c.ourPosition,
      lawyerName: c.lawyerName,
      lawFirm: c.lawFirm,
      hearingDate: d.toISOString(),
      daysAway,
      amountAtStake: Number(c.amountAtStake),
      provisionAmount: Number(c.provisionAmount),
      status: c.status,
      notify: daysAway <= 30 ? (daysAway <= 1 ? "J-1" : daysAway <= 7 ? "J-7" : "J-30") : null,
    };
  });

  return NextResponse.json({
    items,
    counts: {
      total: items.length,
      within7d: items.filter((x) => x.daysAway <= 7).length,
      within30d: items.filter((x) => x.daysAway <= 30).length,
    },
  });
}
