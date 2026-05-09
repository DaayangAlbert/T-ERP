import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { PayslipPDF } from "@/components/payroll/PayslipPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const payslip = await prisma.payslip.findFirst({
    where: { id: params.id, userId: session.sub },
    include: {
      lines: { orderBy: { order: "asc" } },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          employeeId: true,
          position: true,
          category: true,
          cnpsNumber: true,
          hireDate: true,
          contractType: true,
        },
      },
      tenant: { select: { name: true, taxId: true, cnpsId: true, primaryColor: true } },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
  }

  const detail = {
    id: payslip.id,
    period: payslip.period.toISOString(),
    paymentDate: payslip.paymentDate.toISOString(),
    paymentMode: payslip.paymentMode,
    grossAmount: payslip.grossAmount.toString(),
    taxableGross: payslip.taxableGross.toString(),
    netAmount: payslip.netAmount.toString(),
    socialCharges: payslip.socialCharges.toString(),
    fiscalCharges: payslip.fiscalCharges.toString(),
    employerCharges: payslip.employerCharges.toString(),
    status: payslip.status,
    pdfUrl: payslip.pdfUrl,
    lines: payslip.lines.map((l) => ({
      id: l.id,
      code: l.code,
      label: l.label,
      quantity: l.quantity,
      base: l.base?.toString() ?? null,
      rate: l.rate,
      amountPlus: l.amountPlus?.toString() ?? null,
      amountMinus: l.amountMinus?.toString() ?? null,
      employerAmount: l.employerAmount?.toString() ?? null,
      order: l.order,
    })),
    user: {
      ...payslip.user,
      hireDate: payslip.user.hireDate?.toISOString() ?? null,
    },
    tenant: payslip.tenant,
  };

  const element = createElement(PayslipPDF, { payslip: detail }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const period = new Date(payslip.period);
  const filename = `bulletin_${payslip.user.lastName}_${period.getFullYear()}_${String(
    period.getMonth() + 1
  ).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
