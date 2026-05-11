import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const tender = await prisma.tender.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { code: "asc" } },
      studyOwner: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!tender) return NextResponse.json({ error: "AO introuvable" }, { status: 404 });

  const totalBpu = tender.items.reduce((s, i) => s + Number(i.totalPrice), 0);

  return NextResponse.json({
    id: tender.id,
    reference: tender.reference,
    title: tender.title,
    moaName: tender.moaName,
    moaType: tender.moaType,
    workType: tender.workType,
    estimatedBudget: Number(tender.estimatedBudget),
    submissionDeadline: tender.submissionDeadline.toISOString(),
    stage: tender.stage,
    probability: tender.probability,
    studyCost: Number(tender.studyCost),
    ourBidAmount: tender.ourBidAmount ? Number(tender.ourBidAmount) : null,
    ourMargin: tender.ourMargin,
    awarded: tender.awarded,
    awardedTo: tender.awardedTo,
    studyOwner: tender.studyOwner
      ? `${tender.studyOwner.firstName} ${tender.studyOwner.lastName}`
      : null,
    items: tender.items.map((i) => ({
      id: i.id,
      code: i.code,
      designation: i.designation,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    pricingSummary: {
      totalBpu,
      estimatedBudget: Number(tender.estimatedBudget),
      gap: totalBpu - Number(tender.estimatedBudget),
    },
  });
}
