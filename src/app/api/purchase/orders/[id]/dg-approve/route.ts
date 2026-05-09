import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { dgDecisionSchema } from "@/schemas/purchase";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation finale réservée DG" }, { status: 403 });
  }

  try {
    const data = dgDecisionSchema.parse(await req.json().catch(() => ({})));
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, tenantId: session.tenantId, status: "PENDING_DG" },
    });
    if (!po) return NextResponse.json({ error: "BC introuvable ou déjà décidé" }, { status: 404 });

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "APPROVED",
        dgDecisionAt: new Date(),
        dgDecisionBy: session.sub,
        dgDecisionNote: data.note ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "po.dg_approve",
        entityType: "PurchaseOrder",
        entityId: po.id,
        metadata: { reference: po.reference, amount: po.amount.toString(), note: data.note ?? null },
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
