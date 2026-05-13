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

/**
 * Annuaire avocats partenaires reconstruit à partir des LegalCase
 * (BatimCAM n'a pas de table dédiée — un avocat « partenaire » est
 * simplement quelqu'un qui a été désigné sur un dossier).
 */
export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const cases = await prisma.legalCase.findMany({
    where: { tenantId },
    select: {
      lawyerName: true,
      lawFirm: true,
      lawyerContactInfo: true,
      status: true,
      amountAtStake: true,
    },
  });

  const map = new Map<
    string,
    {
      lawyerName: string;
      lawFirm: string;
      contactInfo: any;
      activeCases: number;
      totalCases: number;
      totalAtStake: number;
    }
  >();

  for (const c of cases) {
    const key = `${c.lawyerName}__${c.lawFirm}`;
    const cur = map.get(key);
    const isOpen = OPEN_STATUSES.includes(c.status);
    if (!cur) {
      map.set(key, {
        lawyerName: c.lawyerName,
        lawFirm: c.lawFirm,
        contactInfo: c.lawyerContactInfo,
        activeCases: isOpen ? 1 : 0,
        totalCases: 1,
        totalAtStake: isOpen ? Number(c.amountAtStake) : 0,
      });
    } else {
      cur.totalCases++;
      if (isOpen) {
        cur.activeCases++;
        cur.totalAtStake += Number(c.amountAtStake);
      }
      cur.contactInfo ??= c.lawyerContactInfo;
    }
  }

  const items = Array.from(map.values()).sort((a, b) => b.activeCases - a.activeCases);
  return NextResponse.json({ items });
}
