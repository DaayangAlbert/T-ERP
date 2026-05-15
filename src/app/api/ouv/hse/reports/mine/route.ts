import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { hseTypeLabel, hseTypeEmoji, type OuvHseType } from "@/schemas/ouv-hse";

export const dynamic = "force-dynamic";

// GET /api/ouv/hse/reports/mine — Mes signalements (les 30 derniers).
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const rows = await prisma.hseIncidentReport.findMany({
    where: { reportedById: session.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      description: true,
      locationDetail: true,
      photosUrls: true,
      status: true,
      isAnonymous: true,
      resolution: true,
      resolvedAt: true,
      assignedTo: { select: { firstName: true, lastName: true, role: true } },
      reportedToCnps: true,
      reportedToCnpsAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    reports: rows.map((r) => ({
      id: r.id,
      type: r.type,
      typeLabel: hseTypeLabel(r.type as OuvHseType),
      typeEmoji: hseTypeEmoji(r.type as OuvHseType),
      severity: r.severity,
      title: r.title,
      description: r.description,
      locationDetail: r.locationDetail,
      photosCount: r.photosUrls.length,
      status: r.status,
      isAnonymous: r.isAnonymous,
      resolution: r.resolution,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      assignedToName: r.assignedTo
        ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}`
        : null,
      assignedToRole: r.assignedTo?.role ?? null,
      reportedToCnps: r.reportedToCnps,
      reportedToCnpsAt: r.reportedToCnpsAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
