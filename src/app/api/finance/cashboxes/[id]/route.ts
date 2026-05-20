import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateCashboxSchema } from "@/schemas/finance";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DG, Role.DAF];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = updateCashboxSchema.parse(await req.json());

    const cashbox = await prisma.siteCashbox.findFirst({
      where: { id: params.id, site: { tenantId: session.tenantId } },
    });
    if (!cashbox) return NextResponse.json({ error: "Caisse introuvable" }, { status: 404 });

    // Empêche la clôture d'une caisse avec un solde non nul (régulariser d'abord).
    if (data.isActive === false && cashbox.isActive && cashbox.balance !== 0n) {
      return NextResponse.json(
        { error: "Solde non nul : régularisez la caisse avant de la clôturer." },
        { status: 400 }
      );
    }

    const closing = data.isActive === false && cashbox.isActive;

    await prisma.siteCashbox.update({
      where: { id: cashbox.id },
      data: {
        ...(data.custodianId !== undefined && { custodianId: data.custodianId }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
          closedAt: data.isActive ? null : new Date(),
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: closing ? "cashbox.close" : "cashbox.update",
        entityType: "SiteCashbox",
        entityId: cashbox.id,
        metadata: { changes: data },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/finance/cashboxes/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
