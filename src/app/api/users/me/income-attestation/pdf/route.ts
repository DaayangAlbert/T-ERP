import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { IncomeAttestationPDF } from "@/components/payroll/IncomeAttestationPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const [user, tenant, payslips] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true, position: true, cnpsNumber: true, employeeId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: session.tenantId ?? "" },
      select: { name: true, taxId: true },
    }),
    prisma.payslip.findMany({
      where: {
        userId: session.sub,
        status: "PAID",
        period: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      },
      include: { lines: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Agrégats annuels
  const grossAnnual = payslips.reduce((s, p) => s + p.grossAmount, 0n);
  const taxableGross = payslips.reduce((s, p) => s + p.taxableGross, 0n);
  const netAnnual = payslips.reduce((s, p) => s + p.netAmount, 0n);

  // Calcul des retenues depuis les lignes (codes A056-A072 conventionnels)
  let irpp = 0n;
  let cac = 0n;
  let cnps = 0n;
  let cfc = 0n;
  for (const p of payslips) {
    for (const line of p.lines) {
      if (/IRPP/i.test(line.label)) irpp += line.amountMinus ?? 0n;
      if (/CAC/i.test(line.label)) cac += line.amountMinus ?? 0n;
      if (/CNPS/i.test(line.label) && (line.amountMinus ?? 0n) > 0n) cnps += line.amountMinus ?? 0n;
      if (/CFC/i.test(line.label)) cfc += line.amountMinus ?? 0n;
    }
  }

  const props = {
    user: {
      name: `${user.firstName} ${user.lastName}`,
      position: user.position,
      cnpsNumber: user.cnpsNumber,
      niu: user.employeeId,
    },
    tenant: { name: tenant?.name ?? "—", niu: tenant?.taxId ?? null },
    year,
    data: {
      grossAnnual: grossAnnual.toString(),
      taxableGross: taxableGross.toString(),
      netAnnual: netAnnual.toString(),
      irppRetained: irpp.toString(),
      cacRetained: cac.toString(),
      cnpsRetained: cnps.toString(),
      cfcRetained: cfc.toString(),
      payslipsCount: payslips.length,
    },
    generatedAt: new Date().toISOString(),
  };

  const element = createElement(IncomeAttestationPDF, props) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation_revenus_${year}_${user.lastName}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
