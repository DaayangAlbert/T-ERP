import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";
import { IncidentType, IncidentSeverity } from "@prisma/client";

const schema = z.object({
  type: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(IncidentSeverity).default(IncidentSeverity.LOW),
  victimUserId: z.string().optional(),
  bodyPartAffected: z.string().optional(),
  description: z.string().min(3),
  immediateActions: z.array(z.string()).default([]),
  geoLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  photoUrls: z.array(z.string()).default([]),
  clientUuid: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, siteId } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.hseIncident.create({
    data: {
      siteId,
      occurredAt: new Date(),
      type: parsed.data.type,
      severity: parsed.data.severity,
      victimsCount: parsed.data.victimUserId ? 1 : 0,
      description: parsed.data.description,
      reportedById: session.sub,
      declaredByFieldUserId: session.sub,
      declaredViaApp: true,
      bodyPartAffected: parsed.data.bodyPartAffected ?? null,
      geoLocation: (parsed.data.geoLocation as object) ?? undefined,
      immediateActionsList: parsed.data.immediateActions,
      photoUrls: parsed.data.photoUrls,
      clientUuid: parsed.data.clientUuid ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "cc.hse.incident.declare",
      entityType: "HseIncident",
      entityId: created.id,
      metadata: { siteId, type: parsed.data.type, severity: parsed.data.severity },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
