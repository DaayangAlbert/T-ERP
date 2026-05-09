import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation écriture réservée DAF" }, { status: 403 });
  }

  const e = await prisma.accountingEntry.findFirst({
    where: { id: params.id, tenantId: session.tenantId, status: "DRAFT" },
  });
  if (!e) return NextResponse.json({ error: "Écriture introuvable ou déjà validée" }, { status: 404 });

  await prisma.accountingEntry.update({
    where: { id: e.id },
    data: {
      status: "VALIDATED",
      validatedByDaf: true,
      dafValidatedAt: new Date(),
      dafValidatedBy: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "accounting.entry.validate",
      entityType: "AccountingEntry",
      entityId: e.id,
      metadata: { reference: e.reference },
    },
  });

  return NextResponse.json({ ok: true });
}
