import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { canReadAdminPayslipPdf } from "@/lib/payroll/payroll-access";
import { generatePayslipQrDataUrl, getPublicPayslipUrl } from "@/lib/payroll/payroll-pdf";
import { loadEnrichedPayslip } from "@/lib/payroll/load-enriched-payslip";
import { PayslipPDF } from "@/components/payroll/PayslipPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement du PDF d'un bulletin par les admins RH/DAF, restreint au
 * cycle de paie et au tenant courant. Le rendu utilise le helper enrichi
 * commun (cumuls + congés + métadonnées entreprise).
 */
export async function GET(req: Request, { params }: { params: { id: string; payslipId: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canReadAdminPayslipPdf(session.role)) {
    return NextResponse.json({ error: "Acces bulletin refuse" }, { status: 403 });
  }

  // Garde d'accès : le bulletin doit appartenir au cycle et au tenant courant.
  const accessible = await prisma.payslip.findFirst({
    where: {
      id: params.payslipId,
      payrollCycleId: params.id,
      tenantId: session.tenantId,
    },
    select: { id: true, periodLabel: true },
  });
  if (!accessible) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const detail = await loadEnrichedPayslip({ payslipId: accessible.id, clientIp });
  if (!detail) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  const publicUrl = getPublicPayslipUrl(detail.verifiedPublicUrl, req.url);
  const qrDataUrl = await generatePayslipQrDataUrl(publicUrl);

  const element = createElement(PayslipPDF, {
    payslip: detail,
    qrDataUrl,
    publicUrl,
  }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bulletin_${accessible.periodLabel ?? accessible.id}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
