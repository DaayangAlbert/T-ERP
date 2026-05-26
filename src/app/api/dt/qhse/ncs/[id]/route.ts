import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Criticality, NcCategory, NcStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// Cf /api/dt/qhse/ncs : TECH_DIRECTOR retiré (READ depuis l'arrivée de QHSE_MANAGER).
const EDIT_ALLOWED: Role[] = [
  Role.QHSE_MANAGER,
  Role.WORKS_DIRECTOR,
  Role.SITE_MANAGER,
  Role.TENANT_ADMIN,
];

const PatchNcSchema = z.object({
  category: z.nativeEnum(NcCategory).optional(),
  criticality: z.nativeEnum(Criticality).optional(),
  description: z.string().min(5).max(2000).optional(),
  correctiveAction: z.string().max(2000).nullable().optional(),
  ownerId: z.string().cuid().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.nativeEnum(NcStatus).optional(),
});

async function loadNc(id: string, scopeIds: string[]) {
  return prisma.nonConformity.findFirst({
    where: { id, site: { tenantId: { in: scopeIds } } },
    select: {
      id: true,
      siteId: true,
      status: true,
      site: { select: { tenantId: true } },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!EDIT_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée DT / DTrav / Chef de Chantier" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = PatchNcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const existing = await loadNc(params.id, scopeIds);
  if (!existing) return NextResponse.json({ error: "Non-conformité introuvable" }, { status: 404 });

  if (session.role === Role.SITE_MANAGER) {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (!existing.siteId || !me?.assignedSiteIds.includes(existing.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }
  }

  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerId, tenantId: { in: scopeIds } },
      select: { id: true },
    });
    if (!owner) return NextResponse.json({ error: "Responsable introuvable" }, { status: 404 });
  }

  const becomingClosed =
    parsed.data.status === NcStatus.CLOSED && existing.status !== NcStatus.CLOSED;

  const updated = await prisma.nonConformity.update({
    where: { id: existing.id },
    data: {
      category: parsed.data.category,
      criticality: parsed.data.criticality,
      description: parsed.data.description,
      correctiveAction: parsed.data.correctiveAction,
      ownerId: parsed.data.ownerId,
      dueDate: parsed.data.dueDate === null ? null : parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      status: parsed.data.status,
      closedAt: becomingClosed ? new Date() : undefined,
    },
    select: { id: true, status: true, closedAt: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: becomingClosed ? "qhse.nc.close" : "qhse.nc.update",
      entityType: "NonConformity",
      entityId: existing.id,
      metadata: { siteId: existing.siteId, newStatus: updated.status },
    },
  });

  return NextResponse.json(updated);
}
