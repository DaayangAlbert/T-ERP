import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardItMutation } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().min(20).max(5000).optional(),
});

/** Définit les coordonnées GPS du bureau (siège) — pointage de la direction. */
export async function PUT(req: Request) {
  const guard = await guardItMutation();
  if (guard instanceof NextResponse) return guard;
  const tenantId = guard.session.tenantId!;

  try {
    const data = schema.parse(await req.json());
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { officeLat: data.lat, officeLng: data.lng, officeRadiusM: data.radiusM ?? null },
    });
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: guard.session.sub,
        action: "presence.office.geo.update",
        entityType: "Tenant",
        entityId: tenantId,
        metadata: { lat: data.lat, lng: data.lng, radiusM: data.radiusM ?? null },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[PUT /api/it/attendance/office]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
