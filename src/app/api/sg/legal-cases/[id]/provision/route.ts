import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ProvisionSchema = z.object({
  newAmount: z.number().int().nonnegative(),
  reason: z.string().min(5).max(500),
  validatedByDafName: z.string().min(2).max(120).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageLegalCases");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = ProvisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.legalCase.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, provisionAmount: true, amountAtStake: true, reference: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  if (BigInt(parsed.data.newAmount) > existing.amountAtStake) {
    return NextResponse.json(
      { error: "Provision ne peut pas dépasser l'enjeu financier" },
      { status: 400 },
    );
  }

  const oldAmount = Number(existing.provisionAmount);
  const newAmount = parsed.data.newAmount;
  const delta = newAmount - oldAmount;

  await prisma.$transaction(async (tx) => {
    await tx.legalCase.update({
      where: { id: existing.id },
      data: { provisionAmount: BigInt(newAmount) },
    });
    await tx.legalCaseEvent.create({
      data: {
        caseId: existing.id,
        eventType: "PROVISION_ADJUSTMENT",
        eventDate: new Date(),
        description: `Ajustement provision : ${oldAmount.toLocaleString("fr-FR")} → ${newAmount.toLocaleString("fr-FR")} FCFA (Δ ${delta >= 0 ? "+" : ""}${delta.toLocaleString("fr-FR")}). Motif : ${parsed.data.reason}${parsed.data.validatedByDafName ? ` · Validé DAF : ${parsed.data.validatedByDafName}` : ""}`,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    oldAmount,
    newAmount,
    delta,
  });
}
