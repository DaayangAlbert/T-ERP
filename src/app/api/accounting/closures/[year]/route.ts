import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { year: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const year = parseInt(params.year, 10);
  if (Number.isNaN(year)) return NextResponse.json({ error: "Année invalide" }, { status: 400 });

  let closure = await prisma.annualClosure.findFirst({
    where: { tenantId: session.tenantId, fiscalYear: year },
  });

  if (!closure) {
    closure = await prisma.annualClosure.create({
      data: { tenantId: session.tenantId, fiscalYear: year },
    });
  }

  return NextResponse.json({
    id: closure.id,
    fiscalYear: closure.fiscalYear,
    status: closure.status,
    pnlValidated: closure.pnlValidated,
    balanceValidated: closure.balanceValidated,
    adjustmentsValidated: closure.adjustmentsValidated,
    draftGenerated: closure.draftGenerated,
    adjustments: closure.adjustments,
    dgValidatedAt: closure.dgValidatedAt?.toISOString() ?? null,
    dgValidatedBy: closure.dgValidatedBy,
    submittedToDgi: closure.submittedToDgi,
    dsfFileUrl: closure.dsfFileUrl,
  });
}
