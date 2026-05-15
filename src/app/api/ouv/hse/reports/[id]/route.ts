import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { hseTypeLabel, hseTypeEmoji, type OuvHseType } from "@/schemas/ouv-hse";

export const dynamic = "force-dynamic";

// GET /api/ouv/hse/reports/:id — Détail (lecture seule). L'ouvrier ne voit
// que ses propres signalements (sauf si anonyme — l'API filtre quand même
// par reportedById pour qu'il puisse les retrouver).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const r = await prisma.hseIncidentReport.findFirst({
    where: { id: ctx.params.id, reportedById: session.sub },
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      description: true,
      locationDetail: true,
      incidentGeoLat: true,
      incidentGeoLng: true,
      injuredPersonIds: true,
      witnessIds: true,
      photosUrls: true,
      isAnonymous: true,
      status: true,
      resolution: true,
      resolvedAt: true,
      assignedTo: { select: { firstName: true, lastName: true, role: true } },
      reportedToCnps: true,
      reportedToCnpsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!r) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    type: r.type,
    typeLabel: hseTypeLabel(r.type as OuvHseType),
    typeEmoji: hseTypeEmoji(r.type as OuvHseType),
    severity: r.severity,
    title: r.title,
    description: r.description,
    locationDetail: r.locationDetail,
    incidentGeoLat: r.incidentGeoLat,
    incidentGeoLng: r.incidentGeoLng,
    injuredPersonIds: r.injuredPersonIds,
    witnessIds: r.witnessIds,
    photosUrls: r.photosUrls,
    isAnonymous: r.isAnonymous,
    status: r.status,
    resolution: r.resolution,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    assignedToName: r.assignedTo
      ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}`
      : null,
    assignedToRole: r.assignedTo?.role ?? null,
    reportedToCnps: r.reportedToCnps,
    reportedToCnpsAt: r.reportedToCnpsAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  });
}
