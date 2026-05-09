import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF];
const schema = z.object({ reason: z.string().min(3).max(500) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF" }, { status: 403 });
  }

  try {
    const { reason } = schema.parse(await req.json());
    const e = await prisma.accountingEntry.findFirst({
      where: { id: params.id, tenantId: session.tenantId, status: "DRAFT" },
    });
    if (!e) return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });

    await prisma.accountingEntry.update({
      where: { id: e.id },
      data: { status: "REVERSED" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "accounting.entry.reject",
        entityType: "AccountingEntry",
        entityId: e.id,
        metadata: { reference: e.reference, reason },
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
