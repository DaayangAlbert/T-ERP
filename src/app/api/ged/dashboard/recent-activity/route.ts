import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import type { GedRecentActivityResponse } from "@/hooks/useGedDashboard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const hoursParam = Number(url.searchParams.get("hours") ?? "24");
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 && hoursParam <= 720 ? hoursParam : 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const events = await prisma.gedAuditEvent.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      action: true,
      anomaly: true,
      actor: { select: { firstName: true, lastName: true, role: true } },
      document: {
        select: {
          name: true,
          internalReference: true,
          space: { select: { name: true } },
        },
      },
    },
  });

  const response: GedRecentActivityResponse = {
    activity: events.map((e) => ({
      id: e.id,
      timestamp: e.createdAt.toISOString(),
      actorName: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : "Système",
      actorRole: e.actor?.role ?? "SYSTEM",
      action: e.action,
      documentName: e.document?.internalReference ?? e.document?.name ?? null,
      spaceName: e.document?.space?.name ?? null,
      isAnomaly: e.anomaly,
    })),
  };

  return NextResponse.json(response);
}
