import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { updateForecastSchema } from "@/schemas/cashflow";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const existing = await prisma.cashFlowProjection.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
  });
  if (!existing) return NextResponse.json({ error: "Prévision introuvable" }, { status: 404 });

  try {
    const data = updateForecastSchema.parse(await req.json());
    const updated = await prisma.cashFlowProjection.update({
      where: { id: existing.id },
      data: {
        ...(data.amount !== undefined && { amount: BigInt(data.amount) }),
        ...(data.expectedDate !== undefined && { expectedDate: data.expectedDate }),
        ...(data.probability !== undefined && { probability: data.probability }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.realized !== undefined && { realized: data.realized }),
        ...(data.realizedAmount !== undefined && {
          realizedAmount: BigInt(data.realizedAmount),
          realizedDate: new Date(),
        }),
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PUT /api/dg/cashflow/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const existing = await prisma.cashFlowProjection.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
  });
  if (!existing) return NextResponse.json({ error: "Prévision introuvable" }, { status: 404 });

  await prisma.cashFlowProjection.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
