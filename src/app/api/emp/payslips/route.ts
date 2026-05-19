import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { createPayslipVerification } from "@/lib/payroll/payroll-verification";

export const dynamic = "force-dynamic";

/**
 * Liste des bulletins de l'utilisateur connecté pour l'année courante par
 * défaut, ou pour `?year=YYYY`. Renvoie un cumul net + un dernier bulletin
 * mis en avant pour le header de la page paie.
 */
export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const payslips = await prisma.payslip.findMany({
    where: { userId: session.sub, period: { gte: yearStart, lt: yearEnd } },
    orderBy: { period: "desc" },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      period: true,
      periodLabel: true,
      paymentDate: true,
      grossAmount: true,
      netAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      overtimeHours: true,
      paymentReference: true,
      paymentBankAccount: true,
      status: true,
      verificationUuid: true,
      verificationCode: true,
      verificationHash: true,
      verifiedPublicUrl: true,
    },
  });

  const cumulNet = payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);

  return NextResponse.json({
    year,
    total: payslips.length,
    cumulNet,
    payslips: await Promise.all(
      payslips.map(async (p) => {
        const hasVerification = Boolean(p.verificationUuid && p.verificationCode && p.verificationHash && p.verifiedPublicUrl);
        const verification = hasVerification
          ? { verifiedPublicUrl: p.verifiedPublicUrl! }
          : createPayslipVerification({
              tenantId: p.tenantId,
              userId: p.userId,
              periodIso: p.period.toISOString(),
            });
        if (!hasVerification) {
          await prisma.payslip.update({
            where: { id: p.id },
            data: {
              verificationUuid: "verificationUuid" in verification ? verification.verificationUuid : undefined,
              verificationCode: "verificationCode" in verification ? verification.verificationCode : undefined,
              verificationHash: "verificationHash" in verification ? verification.verificationHash : undefined,
              verifiedPublicUrl: verification.verifiedPublicUrl,
            },
          });
        }
        return {
          id: p.id,
          period: p.period,
          periodLabel: p.periodLabel,
          paymentDate: p.paymentDate,
          overtimeHours: p.overtimeHours,
          paymentReference: p.paymentReference,
          paymentBankAccount: p.paymentBankAccount,
          status: p.status,
          grossAmount: Number(p.grossAmount),
          netAmount: Number(p.netAmount),
          cnpsAmount: Number(p.cnpsAmount),
          irppAmount: Number(p.irppAmount),
          verifiedPublicUrl: verification.verifiedPublicUrl,
        };
      })
    ),
  });
}
