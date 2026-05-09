import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateAssetSchema } from "@/schemas/stocks";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG, Role.DAF, Role.ACCOUNTANT];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF / Comptable" }, { status: 403 });
  }

  try {
    const data = updateAssetSchema.parse(await req.json());
    const a = await prisma.fixedAsset.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const newGross = data.grossValue ? BigInt(data.grossValue) : a.grossValue;
    const newDepr = data.accumulatedDepreciation ? BigInt(data.accumulatedDepreciation) : a.accumulatedDepreciation;
    await prisma.fixedAsset.update({
      where: { id: a.id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.grossValue !== undefined && { grossValue: newGross }),
        ...(data.accumulatedDepreciation !== undefined && { accumulatedDepreciation: newDepr }),
        ...(data.usefulLifeMonths !== undefined && { usefulLifeMonths: data.usefulLifeMonths }),
        ...(data.siteId !== undefined && { siteId: data.siteId }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.insurance !== undefined && { insurance: data.insurance as object }),
        netValue: newGross - newDepr,
        lastRevaluedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "asset.update",
        entityType: "FixedAsset",
        entityId: a.id,
        metadata: { changes: data },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
