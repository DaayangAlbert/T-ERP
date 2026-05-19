import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Criticality, NcCategory, NcStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const CREATE_ALLOWED: Role[] = [
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.SITE_MANAGER,
  Role.TENANT_ADMIN,
];

const CreateNcSchema = z.object({
  siteId: z.string().cuid(),
  category: z.nativeEnum(NcCategory),
  criticality: z.nativeEnum(Criticality),
  description: z.string().min(5).max(2000),
  correctiveAction: z.string().max(2000).optional().nullable(),
  ownerId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(NcStatus).optional(),
});

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!CREATE_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée DT / DTrav / Chef de Chantier" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = CreateNcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const site = await prisma.site.findFirst({
    where: { id: parsed.data.siteId, tenantId: { in: scopeIds } },
    select: { id: true, tenantId: true },
  });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  // Chef de Chantier : doit avoir le chantier dans assignedSiteIds
  if (session.role === Role.SITE_MANAGER) {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (!me?.assignedSiteIds.includes(parsed.data.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }
  }

  // Si pas d'owner explicite : le déclarant assume initialement la résolution
  const ownerId = parsed.data.ownerId ?? session.sub;
  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerId, tenantId: { in: scopeIds } },
      select: { id: true },
    });
    if (!owner) return NextResponse.json({ error: "Responsable introuvable" }, { status: 404 });
  }

  const nc = await prisma.nonConformity.create({
    data: {
      siteId: parsed.data.siteId,
      category: parsed.data.category,
      criticality: parsed.data.criticality,
      description: parsed.data.description,
      correctiveAction: parsed.data.correctiveAction ?? null,
      ownerId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status ?? NcStatus.OPEN,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "qhse.nc.create",
      entityType: "NonConformity",
      entityId: nc.id,
      metadata: {
        siteId: parsed.data.siteId,
        category: parsed.data.category,
        criticality: parsed.data.criticality,
      },
    },
  });

  return NextResponse.json({ id: nc.id }, { status: 201 });
}
