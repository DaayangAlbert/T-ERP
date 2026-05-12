import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { buildPayslipPdf, type PayslipPdfData } from "@/lib/payslip-pdf";
import { verifyShareToken } from "@/lib/share-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // @react-pdf/renderer requiert Node (pas Edge)

/**
 * Génère le PDF du bulletin à la volée.
 *
 * Accès :
 *  - Si la session est valide → propriétaire seulement (`userId` match).
 *  - Sinon : token de partage signé (`?token=...`) valide 24 h, généré par
 *    POST /share-whatsapp. Permet à la femme/famille de François d'ouvrir
 *    le PDF sans compte T-ERP, le temps de la consultation.
 */
export async function GET(req: Request, ctx: { params: { id: string } }) {
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("token");

  let allowedUserId: string | null = null;
  if (shareToken) {
    try {
      const payload = verifyShareToken(shareToken);
      if (payload.resource === "payslip" && payload.resourceId === ctx.params.id) {
        allowedUserId = payload.ownerUserId;
      }
    } catch {
      return NextResponse.json({ error: "Lien de partage expiré ou invalide" }, { status: 403 });
    }
  } else {
    const guard = guardEmp();
    if (guard instanceof NextResponse) return guard;
    allowedUserId = guard.session.sub;
  }

  if (!allowedUserId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: allowedUserId },
    select: {
      period: true,
      periodLabel: true,
      periodEnd: true,
      paymentDate: true,
      paymentBankAccount: true,
      paymentReference: true,
      baseSalary: true,
      overtimeAmount: true,
      overtimeHours: true,
      overtimeHours125: true,
      overtimeHours150: true,
      overtimeHours200: true,
      seniorityBonus: true,
      transportAllowance: true,
      grossAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      netAmount: true,
      workedDays: true,
      reportedHours: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          matricule: true,
          employeeId: true,
          position: true,
          professionalCategory: true,
          cnpsNumber: true,
          niu: true,
          hireDate: true,
          bankName: true,
          bankAgency: true,
          rib: true,
        },
      },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
  }

  const data: PayslipPdfData = {
    period: payslip.period,
    periodLabel: payslip.periodLabel,
    periodEnd: payslip.periodEnd,
    paymentDate: payslip.paymentDate,
    paymentBankAccount: payslip.paymentBankAccount,
    paymentReference: payslip.paymentReference,
    baseSalary: payslip.baseSalary ? Number(payslip.baseSalary) : 0,
    overtimeAmount: Number(payslip.overtimeAmount),
    overtimeHours: payslip.overtimeHours,
    overtimeHours125: payslip.overtimeHours125,
    overtimeHours150: payslip.overtimeHours150,
    overtimeHours200: payslip.overtimeHours200,
    seniorityBonus: Number(payslip.seniorityBonus),
    transportAllowance: Number(payslip.transportAllowance),
    grossAmount: Number(payslip.grossAmount),
    cnpsAmount: Number(payslip.cnpsAmount),
    irppAmount: Number(payslip.irppAmount),
    otherDeductions: Number(payslip.otherDeductions),
    netAmount: Number(payslip.netAmount),
    workedDays: payslip.workedDays,
    reportedHours: payslip.reportedHours,
    employee: {
      fullName: `${payslip.user.firstName} ${payslip.user.lastName}`,
      matricule: payslip.user.matricule ?? payslip.user.employeeId ?? "—",
      position: payslip.user.position,
      professionalCategory: payslip.user.professionalCategory,
      cnpsNumber: payslip.user.cnpsNumber,
      niu: payslip.user.niu,
      hireDate: payslip.user.hireDate,
      bankInfo: payslip.user.bankName
        ? `${payslip.user.bankName}${payslip.user.bankAgency ? ` · ${payslip.user.bankAgency}` : ""}`
        : null,
    },
  };

  const pdfBuffer = await buildPayslipPdf(data);
  const filename = `bulletin-${payslip.periodLabel ?? payslip.period.toISOString().slice(0, 7)}-${payslip.user.lastName}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
