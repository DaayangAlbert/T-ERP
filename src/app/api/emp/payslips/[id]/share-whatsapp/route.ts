import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { signShareToken, buildShareUrl } from "@/lib/share-token";
import { sendWhatsappTemplate } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

interface Body {
  /** Numéro destinataire au format E.164. Si vide, on prend phoneMobile/phone du user. */
  to?: string;
}

/**
 * Partage d'un bulletin par WhatsApp. Génère un lien signé (24 h) vers le
 * PDF, déclenche l'envoi du template `NEW_PAYSLIP_AVAILABLE` (stub) et
 * renvoie le lien au client pour preview/copie.
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as Body;

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      netAmount: true,
      user: { select: { id: true, firstName: true, lastName: true, phoneMobile: true, phone: true } },
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

  return NextResponse.json({
    ok: true,
    shareUrl,
    expiresInHours: 24,
    whatsapp: result,
  });
}
