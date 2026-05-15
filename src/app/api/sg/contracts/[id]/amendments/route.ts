import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { MarketAmendmentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(3).max(2000),
  additionalAmount: z.number().int(),
  additionalDelayDays: z.number().int().optional(),
});

// POST /api/sg/contracts/:id/amendments — crée un nouvel avenant (numéro auto)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.clientContract.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, _count: { select: { amendments: true } } },
  });
  if (!c) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const nextNumber = c._count.amendments + 1;
    const created = await prisma.marketContractAmendment.create({
      data: {
        contractId: c.id,
        amendmentNumber: nextNumber,
        reason: data.reason,
        additionalAmount: BigInt(data.additionalAmount),
        additionalDelayDays: data.additionalDelayDays ?? null,
        status: MarketAmendmentStatus.DRAFT,
      },
      select: { id: true, amendmentNumber: true },
    });

    // Marque le contrat comme AMENDMENT_PENDING
    await prisma.clientContract.update({
      where: { id: c.id },
      data: { legalStatus: "AMENDMENT_PENDING" },
    });

    return NextResponse.json({ ok: true, id: created.id, amendmentNumber: created.amendmentNumber }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
