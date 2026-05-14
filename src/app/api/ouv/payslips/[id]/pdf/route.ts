import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { buildPayslipPdf, type PayslipPdfData } from "@/lib/payslip-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // @react-pdf/renderer requiert Node (pas Edge)

// GET /api/ouv/payslips/:id/pdf — bulletin PDF généré côté serveur.
// Pas de token de partage ici (l'ouvrier consulte SON bulletin via session).
// Le partage WhatsApp tiers passe par /api/emp/payslips/:id/pdf?token=…
// (déjà livré, accepte les tokens signés émis par share-whatsapp).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
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
