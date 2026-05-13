import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const invoice = await prisma.saasInvoice.findUnique({
    where: { id: params.id },
    include: { tenant: { select: { name: true, billingContactEmail: true } } },
  });
  if (!invoice)
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  await prisma.saasInvoice.update({
    where: { id: params.id },
    data: {
      reminderCount: { increment: 1 },
      lastReminderAt: new Date(),
    },
  });

  // Stub email/WhatsApp — en prod : Resend + WhatsApp Business templates
  console.log(
    `[reminder] Facture ${invoice.reference} → ${invoice.tenant.billingContactEmail}`,
  );

  await logAdminAction({
    session,
    action: "PAYMENT_RECORDED",
    targetType: "SaasInvoice",
    targetId: invoice.id,
    targetDescription: `Relance #${invoice.reminderCount + 1} · ${invoice.reference}`,
    tenantId: invoice.tenantId,
    justification: "Relance impayé",
  });

  return NextResponse.json({
    ok: true,
    sentTo: invoice.tenant.billingContactEmail,
    reminderCount: invoice.reminderCount + 1,
  });
}
