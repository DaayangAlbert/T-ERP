import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { signShareToken, buildShareUrl } from "@/lib/share-token";
import { sendWhatsappTemplate } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// POST /api/ouv/payslips/:id/share-whatsapp { to?: string }
// Génère un lien signé 24 h vers le PDF puis envoie le template WhatsApp
// NEW_PAYSLIP_AVAILABLE. Le lien fonctionne via /api/emp/payslips/:id/pdf?token=…
// déjà livré côté EMP (accepte les tokens signés, pas besoin de doubler).
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as { to?: string };

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      netAmount: true,
      user: {
        select: { id: true, firstName: true, lastName: true, phoneMobile: true, phone: true },
      },
    },
  });
  if (!payslip) {
    return NextResponse.json({ error: "Bulletin introuvable ou hors périmètre" }, { status: 403 });
  }

  const toPhone = body.to?.trim() || payslip.user.phoneMobile || payslip.user.phone;
  if (!toPhone) {
    return NextResponse.json({ error: "Aucun numéro destinataire" }, { status: 400 });
  }

  const token = signShareToken({
    resource: "payslip",
    resourceId: payslip.id,
    ownerUserId: payslip.user.id,
  });
  const baseUrl = process.env.PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const shareUrl = buildShareUrl(baseUrl, "payslip", payslip.id, token);

  const periodMonth = payslip.periodLabel
    ? MONTHS_FR[Number(payslip.periodLabel.split("-")[1]) - 1] ?? ""
    : MONTHS_FR[payslip.period.getMonth()];
  const periodYear = payslip.periodLabel?.split("-")[0] ?? String(payslip.period.getFullYear());
  const netLabel = Number(payslip.netAmount).toLocaleString("fr-FR");

  const result = await sendWhatsappTemplate({
    templateKey: "NEW_PAYSLIP_AVAILABLE",
    toUserId: payslip.user.id,
    toPhone,
    deepLink: shareUrl,
    variables: {
      nom: payslip.user.firstName,
      mois: periodMonth,
      annee: periodYear,
      montant: netLabel,
      url: shareUrl,
    },
  });

  // wa.me deep link prêt à coller dans l'UI (fallback si user a juste un navigateur)
  const waUrl = `https://wa.me/${toPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
    `Bulletin ${periodMonth} ${periodYear} — Net ${netLabel} FCFA. PDF: ${shareUrl}`
  )}`;

  return NextResponse.json({
    ok: true,
    shareUrl,
    waUrl,
    expiresInHours: 24,
    whatsapp: result,
  });
}
