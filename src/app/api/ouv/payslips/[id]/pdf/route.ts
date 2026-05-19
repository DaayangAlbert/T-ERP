import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { generatePayslipQrDataUrl, getPublicPayslipUrl } from "@/lib/payroll/payroll-pdf";
import { loadEnrichedPayslip } from "@/lib/payroll/load-enriched-payslip";
import { PayslipPDF } from "@/components/payroll/PayslipPDF";

export const runtime = "nodejs"; // @react-pdf/renderer requiert Node (pas Edge)
export const dynamic = "force-dynamic";

// GET /api/ouv/payslips/:id/pdf — bulletin PDF officiel pour les ouvriers.
//
// Harmonisé avec /api/payslips/:id/pdf (cadres) : utilise exactement le
// même composant PayslipPDF (4 colonnes GAINS / RETENUES / CHARGES /
// SYNTHÈSE, pied avec cumuls + congés + absences + infos + auth). La
// seule différence est la garde RBAC (guardOuv → seul WORKER consulte
// SON propre bulletin via session).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  try {
    // ownerUserId verrouille au userId connecté → l'ouvrier ne peut
    // consulter QUE son propre bulletin (cf. loadEnrichedPayslip).
    const detail = await loadEnrichedPayslip({
      payslipId: params.id,
      ownerUserId: session.sub,
      clientIp,
    });

    if (!detail) {
      return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
    }

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
        // inline: ouvre dans l'onglet (cohérent avec l'ancien flow OUV
        // qui faisait window.open). Pas de cache (sensible).
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(
      "[GET /api/ouv/payslips/:id/pdf] PDF generation failed:",
      (err as Error).message,
    );
    return NextResponse.json(
      { error: "Génération du bulletin échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
