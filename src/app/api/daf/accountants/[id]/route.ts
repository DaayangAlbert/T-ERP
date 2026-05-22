import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const patchSchema = z.object({
  // Liste fermée des chantiers affectés. Vide = comptable Direction (accès global).
  siteIds: z.array(z.string().min(1)).max(500),
});

// PATCH — (ré)affecte un comptable à un ensemble de chantiers (User.assignedSiteIds).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const { siteIds } = patchSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const target = await prisma.user.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds }, role: Role.ACCOUNTANT },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Comptable introuvable" }, { status: 404 });

    // Dédoublonnage + vérification que chaque chantier appartient bien au tenant.
    const unique = Array.from(new Set(siteIds));
    if (unique.length > 0) {
      const valid = await prisma.site.count({
        where: { id: { in: unique }, tenantId: { in: scopeIds } },
      });
      if (valid !== unique.length) {
        return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { assignedSiteIds: unique },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "daf.accountant.assign_sites",
        entityType: "User",
        entityId: target.id,
        metadata: { siteIds: unique, count: unique.length },
      },
    });

    return NextResponse.json({ ok: true, assignedSiteIds: unique, isDirection: unique.length === 0 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
