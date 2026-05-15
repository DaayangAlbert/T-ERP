import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { GuaranteeStatus, GuaranteeType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.nativeEnum(GuaranteeType),
  amount: z.number().int().positive(),
  issuingBank: z.string().min(2).max(120),
  issuedAt: z.string().datetime(),
  expiryDate: z.string().datetime(),
});

// POST /api/sg/contracts/:id/guarantees — émission d'une garantie bancaire
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.clientContract.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!c) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const issued = new Date(data.issuedAt);
    const expiry = new Date(data.expiryDate);
    if (expiry <= issued) {
      return NextResponse.json({ error: "expiryDate doit être postérieure à issuedAt" }, { status: 400 });
    }

    // Mise à jour des montants snapshot sur ClientContract pour reporting rapide
    const snapshotField =
      data.type === GuaranteeType.SUBMISSION
        ? "submissionGuaranteeAmount"
        : data.type === GuaranteeType.PERFORMANCE
          ? "performanceGuaranteeAmount"
          : data.type === GuaranteeType.RETENTION
            ? "retentionGuaranteeAmount"
            : null;

    const [created] = await prisma.$transaction([
      prisma.bankGuarantee.create({
        data: {
          contractId: c.id,
          type: data.type,
          amount: BigInt(data.amount),
          issuingBank: data.issuingBank,
          issuedAt: issued,
          expiryDate: expiry,
          status: GuaranteeStatus.ACTIVE,
        },
        select: { id: true },
      }),
      ...(snapshotField
        ? [
            prisma.clientContract.update({
              where: { id: c.id },
              data: { [snapshotField]: BigInt(data.amount) },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
