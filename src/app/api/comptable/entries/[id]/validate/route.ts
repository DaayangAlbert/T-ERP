import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, CptEntryStatus } from "@prisma/client";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const allowed = await getAccessibleSiteIds(session.sub);
  const entry = await prisma.entry.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!isSiteAllowed(allowed, entry.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }
  if (entry.status !== CptEntryStatus.DRAFT) {
    return NextResponse.json({ error: "Écriture déjà validée ou annulée" }, { status: 409 });
  }

  await prisma.entry.update({
    where: { id: entry.id },
    data: { status: CptEntryStatus.VALIDATED, validatedById: session.sub, validatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "entry.validate",
      entityType: "Entry",
      entityId: entry.id,
      metadata: { journal: entry.journalCode, reference: entry.reference },
    },
  });

  return NextResponse.json({ ok: true });
}
