import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const patchSchema = z.object({
  active: z.boolean().optional(),
  label: z.string().min(2).max(120).optional(),
  description: z.string().min(1).max(200).optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const existing = await prisma.recurringEntry.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  try {
    const data = patchSchema.parse(await req.json());
    await prisma.recurringEntry.update({
      where: { id: existing.id },
      data: {
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.label !== undefined ? { label: data.label.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.dayOfMonth !== undefined ? { dayOfMonth: data.dayOfMonth } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[PATCH /api/comptable/recurring-entries/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const r = await prisma.recurringEntry.deleteMany({ where: { id: params.id, tenantId: session.tenantId } });
  if (r.count === 0) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
