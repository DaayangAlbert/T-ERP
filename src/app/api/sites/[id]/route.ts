import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { canManageSites } from "@/lib/permissions";
import { updateSiteSchema } from "@/schemas/site";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Phase 2 / fn 1.2 — accept un tableau d'ids tenant pour autoriser un parent isGroup à voir ses filiales.
async function loadScopedSite(id: string, tenantIds: string[]) {
  return prisma.site.findFirst({
    where: { id, tenantId: { in: tenantIds } },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

function serialize(site: NonNullable<Awaited<ReturnType<typeof loadScopedSite>>>) {
  return {
    ...site,
    budget: site.budget.toString(),
    startDate: site.startDate.toISOString(),
    plannedEndDate: site.plannedEndDate.toISOString(),
    actualEndDate: site.actualEndDate?.toISOString() ?? null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });

  const site = await loadScopedSite(params.id, await getTenantScopeIds(session.tenantId));
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  return NextResponse.json(serialize(site));
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (!canManageSites(session.role as Role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  try {
    const data = updateSiteSchema.parse(await req.json());
    const site = await loadScopedSite(params.id, await getTenantScopeIds(session.tenantId));
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.client !== undefined && { client: data.client }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.region !== undefined && { region: data.region || null }),
        ...(data.budget !== undefined && { budget: BigInt(data.budget) }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.plannedEndDate !== undefined && { plannedEndDate: data.plannedEndDate }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.margin !== undefined && { margin: data.margin }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.managerId !== undefined && { managerId: data.managerId || null }),
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PUT /api/sites/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (!canManageSites(session.role as Role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const site = await loadScopedSite(params.id, await getTenantScopeIds(session.tenantId));
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  await prisma.site.update({
    where: { id: site.id },
    data: { status: SiteStatus.ARCHIVED },
  });

  return NextResponse.json({ ok: true, archived: true });
}
