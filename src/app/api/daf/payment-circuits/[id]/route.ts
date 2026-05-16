import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { updateCircuitTemplateSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  const t = await prisma.paymentCircuitTemplate.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: t.id,
    name: t.name,
    clientName: t.clientName,
    description: t.description,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    steps: t.steps,
    createdAt: t.createdAt.toISOString(),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  try {
    const data = updateCircuitTemplateSchema.parse(await req.json());
    const t = await prisma.paymentCircuitTemplate.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.paymentCircuitTemplate.update({
      where: { id: t.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.description !== undefined && { description: data.description ?? null }),
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
  // Soft delete : archive.
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  const t = await prisma.paymentCircuitTemplate.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.paymentCircuitTemplate.update({
    where: { id: t.id },
    data: { archivedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
