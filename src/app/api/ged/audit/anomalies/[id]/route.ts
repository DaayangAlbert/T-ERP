import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed, guardGedMutation } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["INVESTIGATE", "RESOLVE"]),
  notes: z.string().min(3).max(2000).optional(),
});

// PATCH /api/ged/audit/anomalies/:id
//   - INVESTIGATE : enregistre la prise en charge (notes optionnelles, conserve resolvedAt=null)
//   - RESOLVE     : marque résolu avec horodate + notes obligatoires
// Réservé ARCHIVIST/TENANT_ADMIN.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const evt = await prisma.gedAuditEvent.findFirst({
    where: { id: params.id, tenantId, anomaly: true },
    select: { id: true, resolvedAt: true, action: true },
  });
  if (!evt) {
    return NextResponse.json({ error: "Anomalie introuvable" }, { status: 404 });
  }
  if (evt.resolvedAt) {
    return NextResponse.json({ error: "Anomalie déjà résolue" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (data.action === "RESOLVE" && !data.notes) {
      return NextResponse.json({ error: "Notes obligatoires pour résoudre" }, { status: 400 });
    }

    if (data.action === "RESOLVE") {
      await prisma.$transaction([
        prisma.gedAuditEvent.update({
          where: { id: evt.id },
          data: {
            resolvedAt: new Date(),
            resolvedBy: userId,
            resolutionNotes: data.notes,
          },
        }),
        prisma.gedAuditEvent.create({
          data: {
            tenantId,
            actorId: userId,
            action: GedAuditAction.MODIFICATION,
            metadata: { kind: "ANOMALY_RESOLVED", anomalyId: evt.id, notes: data.notes },
          },
        }),
      ]);
      return NextResponse.json({ ok: true, resolved: true });
    }

    // INVESTIGATE — on ajoute juste un audit + on stocke les notes en cours
    await prisma.$transaction([
      prisma.gedAuditEvent.update({
        where: { id: evt.id },
        data: { resolutionNotes: data.notes ?? null },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          metadata: { kind: "ANOMALY_INVESTIGATING", anomalyId: evt.id, notes: data.notes ?? null },
        },
      }),
    ]);
    return NextResponse.json({ ok: true, resolved: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}

// GET — détail d'une anomalie
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const evt = await prisma.gedAuditEvent.findFirst({
    where: { id: params.id, tenantId, anomaly: true },
    select: {
      id: true,
      action: true,
      createdAt: true,
      resolvedAt: true,
      resolvedBy: true,
      resolutionNotes: true,
      ipAddress: true,
      userAgent: true,
      metadata: true,
      actor: { select: { id: true, firstName: true, lastName: true, role: true } },
      document: { select: { id: true, name: true, internalReference: true } },
      space: { select: { id: true, name: true, icon: true } },
    },
  });

  if (!evt) {
    return NextResponse.json({ error: "Anomalie introuvable" }, { status: 404 });
  }

  // Cherche le résolveur si présent
  let resolverName: string | null = null;
  if (evt.resolvedBy) {
    const u = await prisma.user.findUnique({
      where: { id: evt.resolvedBy },
      select: { firstName: true, lastName: true, role: true },
    });
    if (u) resolverName = `${u.firstName} ${u.lastName} (${u.role})`;
  }

  return NextResponse.json({
    id: evt.id,
    action: evt.action,
    createdAt: evt.createdAt.toISOString(),
    resolvedAt: evt.resolvedAt?.toISOString() ?? null,
    resolverName,
    resolutionNotes: evt.resolutionNotes,
    ipAddress: evt.ipAddress,
    userAgent: evt.userAgent,
    metadata: evt.metadata,
    actor: evt.actor
      ? { id: evt.actor.id, name: `${evt.actor.firstName} ${evt.actor.lastName}`, role: evt.actor.role }
      : null,
    document: evt.document,
    space: evt.space,
  });
}
