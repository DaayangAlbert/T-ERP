import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { updateMilestoneSchema } from "@/schemas/planning";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updateMilestoneSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);
    const m = await prisma.milestone.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
    });
    if (!m) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.milestone.update({
      where: { id: m.id },
      data: {
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.critical !== undefined && { critical: data.critical }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "milestone.update",
        entityType: "Milestone",
        entityId: m.id,
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const m = await prisma.milestone.findFirst({ where: { id: params.id, tenantId: { in: scopeIds } } });
  if (!m) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.milestone.delete({ where: { id: m.id } });
  return NextResponse.json({ ok: true });
}
