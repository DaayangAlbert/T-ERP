import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardItMutation } from "@/lib/rbac/it-guard";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().min(20).max(5000).optional(),
});

/** Définit les coordonnées GPS + rayon d'un chantier — pointage du personnel affecté. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardItMutation();
  if (guard instanceof NextResponse) return guard;
  const tenantId = guard.session.tenantId!;
  const scopeIds = await getTenantScopeIds(tenantId);

  const site = await prisma.site.findFirst({ where: { id: params.id, tenantId: { in: scopeIds } }, select: { id: true } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  try {
    const data = schema.parse(await req.json());
    await prisma.site.update({
      where: { id: site.id },
      data: { lat: data.lat, lng: data.lng, attendanceRadiusM: data.radiusM ?? null },
    });
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: guard.session.sub,
        action: "presence.site.geo.update",
        entityType: "Site",
        entityId: site.id,
        metadata: { lat: data.lat, lng: data.lng, radiusM: data.radiusM ?? null },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[PUT /api/it/attendance/sites/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
