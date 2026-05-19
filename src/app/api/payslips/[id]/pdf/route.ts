import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentSession } from "@/lib/session";
import { generatePayslipQrDataUrl, getPublicPayslipUrl } from "@/lib/payroll/payroll-pdf";
import { loadEnrichedPayslip } from "@/lib/payroll/load-enriched-payslip";
import { PayslipPDF } from "@/components/payroll/PayslipPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  try {
    const detail = await loadEnrichedPayslip({
      payslipId: params.id,
      ownerUserId: session.sub,
      clientIp,
    });

    if (!detail) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

    const publicUrl = getPublicPayslipUrl(detail.verifiedPublicUrl, req.url);
    const qrDataUrl = await generatePayslipQrDataUrl(publicUrl);

    const element = createElement(PayslipPDF, {
      payslip: detail,
      qrDataUrl,
      publicUrl,
    }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    const period = new Date(detail.period);
    const filename = `bulletin_${detail.user.lastName}_${period.getFullYear()}_${String(period.getMonth() + 1).padStart(2, "0")}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(
      "[GET /api/payslips/:id/pdf] PDF generation failed:",
      (err as Error).message,
      "\n",
      (err as Error).stack,
    );
    return NextResponse.json(
      { error: "Génération du bulletin échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
