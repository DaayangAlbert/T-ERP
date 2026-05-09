import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { resolveConflictSchema } from "@/schemas/planning";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = resolveConflictSchema.parse(await req.json());
    const c = await prisma.resourceConflict.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.resourceConflict.update({
      where: { id: c.id },
      data: { resolved: true, resolution: data.resolution },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "conflict.resolve",
        entityType: "ResourceConflict",
        entityId: c.id,
        metadata: { resolution: data.resolution },
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
