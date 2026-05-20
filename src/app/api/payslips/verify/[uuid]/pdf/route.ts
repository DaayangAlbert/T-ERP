import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { verifyPayslipHash } from "@/lib/payroll/payroll-verification";
import { generatePayslipQrDataUrl, getPublicPayslipUrl } from "@/lib/payroll/payroll-pdf";
import { loadEnrichedPayslip } from "@/lib/payroll/load-enriched-payslip";
import { PayslipPDF } from "@/components/payroll/PayslipPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accès public au PDF d'un bulletin via son UUID de vérification.
 * Vérification du hash → chargement enrichi → rendu PDF.
 */
export async function GET(req: Request, { params }: { params: { uuid: string } }) {
  const found = await prisma.payslip.findUnique({
    where: { verificationUuid: params.uuid },
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

  if (!found) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  const valid = verifyPayslipHash({
    tenantId: found.tenantId,
    userId: found.userId,
    periodIso: found.period.toISOString(),
    verificationUuid: found.verificationUuid,
    verificationCode: found.verificationCode,
    verificationHash: found.verificationHash,
  });
  if (!valid) return NextResponse.json({ error: "Lien de verification invalide" }, { status: 404 });

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const detail = await loadEnrichedPayslip({ payslipId: found.id, clientIp, inlineImages: true });
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
      "Content-Disposition": `inline; filename="bulletin_${params.uuid}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
