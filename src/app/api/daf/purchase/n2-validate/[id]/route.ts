import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.TENANT_ADMIN];

const N2_MIN = 5_000_000n;
const N2_MAX = 50_000_000n;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N2 réservée DAF" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { decision?: "APPROVE" | "REJECT" | "REQUEST_INFO"; note?: string };
  const decision = body.decision ?? "APPROVE";

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: params.id, tenantId: session.tenantId, status: "PENDING_DAF" },
  });
  if (!po) return NextResponse.json({ error: "BC introuvable ou déjà décidé" }, { status: 404 });

  if (po.amount < N2_MIN || po.amount > N2_MAX) {
    return NextResponse.json({ error: "Hors périmètre N2 (5 M – 50 M FCFA)" }, { status: 400 });
  }

  if (decision === "REJECT") {
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "REJECTED",
        dafApprovedAt: new Date(),
        dafApprovedBy: session.sub,
        rejectionReason: body.note ?? "Refusé par DAF",
      },
    });
  } else if (decision === "REQUEST_INFO") {
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "DRAFT",
        rejectionReason: body.note ?? "Complément d'information demandé",
      },
    });
  } else {
    // APPROVE — entre 5M et 50M : DAF est le N2 final, statut APPROVED
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "APPROVED",
        dafApprovedAt: new Date(),
        dafApprovedBy: session.sub,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `po.daf_${decision.toLowerCase()}`,
      entityType: "PurchaseOrder",
      entityId: po.id,
      metadata: { reference: po.reference, amount: po.amount.toString(), note: body.note ?? null },
    },
  });

  return NextResponse.json({ ok: true, decision });
}
