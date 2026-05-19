import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createPayslipVerification } from "@/lib/payroll/payroll-verification";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const payslip = await prisma.payslip.findFirst({
    where: { id: params.id, userId: session.sub },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      period: true,
      verificationUuid: true,
      verificationCode: true,
      verificationHash: true,
      verifiedPublicUrl: true,
    },
  });
  if (!payslip) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  const hasVerification = Boolean(
    payslip.verificationUuid && payslip.verificationCode && payslip.verificationHash && payslip.verifiedPublicUrl
  );
  const verification = hasVerification
    ? {
        verificationUuid: payslip.verificationUuid!,
        verificationCode: payslip.verificationCode!,
        verifiedPublicUrl: payslip.verifiedPublicUrl!,
      }
    : createPayslipVerification({
        tenantId: payslip.tenantId,
        userId: payslip.userId,
        periodIso: payslip.period.toISOString(),
      });

  if (!hasVerification) {
    await prisma.payslip.update({
      where: { id: payslip.id },
      data: {
        verificationUuid: verification.verificationUuid,
        verificationCode: verification.verificationCode,
        verificationHash: "verificationHash" in verification ? verification.verificationHash : undefined,
        verifiedPublicUrl: verification.verifiedPublicUrl,
      },
    });
  }

  return NextResponse.json({ url: verification.verifiedPublicUrl });
}
