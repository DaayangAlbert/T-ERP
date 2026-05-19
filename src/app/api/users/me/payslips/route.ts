import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createPayslipVerification } from "@/lib/payroll/payroll-verification";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10) || 12));

  const where = { userId: session.sub };

  const [total, items] = await Promise.all([
    prisma.payslip.count({ where }),
    prisma.payslip.findMany({
      where,
      orderBy: { period: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        tenantId: true,
        userId: true,
        period: true,
        periodEnd: true,
        paymentDate: true,
        paymentMode: true,
        paymentBankAccount: true,
        grossAmount: true,
        netAmount: true,
        socialCharges: true,
        fiscalCharges: true,
        status: true,
        pdfUrl: true,
        verificationUuid: true,
        verificationCode: true,
        verificationHash: true,
        verifiedPublicUrl: true,
      },
    }),
  ]);

  const aggregate = await prisma.payslip.aggregate({
    where: { ...where, status: "PAID" },
    _sum: { grossAmount: true, netAmount: true },
    _avg: { netAmount: true },
  });

  const serializedItems = await Promise.all(
    items.map(async (p) => {
      const hasVerification = Boolean(p.verificationUuid && p.verificationCode && p.verificationHash && p.verifiedPublicUrl);
      const verification = hasVerification
        ? {
            verificationUuid: p.verificationUuid!,
            verificationCode: p.verificationCode!,
            verifiedPublicUrl: p.verifiedPublicUrl!,
          }
        : createPayslipVerification({
            tenantId: p.tenantId,
            userId: p.userId,
            periodIso: p.period.toISOString(),
          });

      if (!hasVerification) {
        await prisma.payslip.update({
          where: { id: p.id },
          data: {
            verificationUuid: verification.verificationUuid,
            verificationCode: verification.verificationCode,
            verificationHash: "verificationHash" in verification ? verification.verificationHash : undefined,
            verifiedPublicUrl: verification.verifiedPublicUrl,
          },
        });
      }

      return {
      id: p.id,
      period: p.period.toISOString(),
      periodEnd: p.periodEnd?.toISOString() ?? null,
      paymentDate: p.paymentDate.toISOString(),
      paymentMode: p.paymentMode,
      paymentBankAccount: p.paymentBankAccount,
      grossAmount: p.grossAmount.toString(),
      netAmount: p.netAmount.toString(),
      socialCharges: p.socialCharges.toString(),
      fiscalCharges: p.fiscalCharges.toString(),
      status: p.status,
      pdfUrl: p.pdfUrl,
      verificationUuid: verification.verificationUuid,
      verificationCode: verification.verificationCode,
      verifiedPublicUrl: verification.verifiedPublicUrl,
    };
    })
  );

  return NextResponse.json({
    items: serializedItems,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      ytdGross: aggregate._sum.grossAmount?.toString() ?? "0",
      ytdNet: aggregate._sum.netAmount?.toString() ?? "0",
      avgNet: aggregate._avg.netAmount?.toString() ?? "0",
    },
  });
}
