import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().int().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).default("BANK_TRANSFER"),
  paymentReference: z.string().max(80).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const invoice = await prisma.saasInvoice.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      reference: true,
      tenantId: true,
      amountTTC: true,
      status: true,
    },
  });
  if (!invoice)
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  if (invoice.status === "PAID")
    return NextResponse.json({ error: "Déjà payée" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation" }, { status: 400 });

  const updated = await prisma.saasInvoice.update({
    where: { id: params.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidAmount: BigInt(parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference ?? null,
    },
    select: { reference: true, amountTTC: true },
  });

  await logAdminAction({
    session,
    action: "PAYMENT_RECORDED",
    targetType: "SaasInvoice",
    targetId: invoice.id,
    targetDescription: `${updated.reference} · ${parsed.data.amount} XAF`,
    tenantId: invoice.tenantId,
    afterState: {
      status: "PAID",
      paidAmount: parsed.data.amount,
      reference: parsed.data.paymentReference,
    },
  });

  return NextResponse.json({ ok: true, reference: updated.reference });
}
