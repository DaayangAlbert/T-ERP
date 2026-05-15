import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { GuaranteeStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  releaseDate: z.string().datetime().optional(),
});

// POST /api/sg/contracts/:id/guarantees/:gId/release — lever une garantie active
export async function POST(req: Request, { params }: { params: { id: string; gId: string } }) {
  const guard = await guardSgMutation("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const guarantee = await prisma.bankGuarantee.findFirst({
    where: { id: params.gId, contractId: params.id, contract: { tenantId } },
    select: { id: true, status: true },
  });
  if (!guarantee) return NextResponse.json({ error: "Garantie introuvable" }, { status: 404 });
  if (guarantee.status !== GuaranteeStatus.ACTIVE) {
    return NextResponse.json({ error: `Garantie non active (${guarantee.status})` }, { status: 409 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);
    const releaseDate = data.releaseDate ? new Date(data.releaseDate) : new Date();

    await prisma.bankGuarantee.update({
      where: { id: guarantee.id },
      data: { status: GuaranteeStatus.RELEASED, releaseDate },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
