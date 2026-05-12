import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, GedAuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé GED" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const anomalyOnly = searchParams.get("anomaly") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (action && Object.values(GedAuditAction).includes(action as GedAuditAction)) where.action = action;
  if (anomalyOnly) where.anomaly = true;

  const [journal, total, ytdCount, anomalies, accessRequests] = await Promise.all([
    prisma.gedAuditEvent.findMany({
      where,
      include: {
        actor: { select: { firstName: true, lastName: true, role: true } },
        document: { select: { name: true, internalReference: true } },
        space: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.gedAuditEvent.count({ where }),
    prisma.gedAuditEvent.count({ where: { tenantId: session.tenantId, createdAt: { gte: yearStart } } }),
    prisma.gedAuditEvent.findMany({
      where: { tenantId: session.tenantId, anomaly: true, resolvedAt: null },
      include: { actor: { select: { firstName: true, lastName: true } }, document: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.documentAccessRequest.findMany({
      where: { document: { tenantId: session.tenantId }, status: "PENDING" },
      include: {
        requester: { select: { firstName: true, lastName: true, role: true } },
        document: { select: { name: true, internalReference: true } },
      },
      orderBy: { requestedAt: "asc" },
    }),
  ]);

  // Calcul score conformité (simplifié) :
  // - workflows complétés vs total
  // - anomalies non résolues
  // - DUA respectées
  const [wfTotal, wfDone] = await Promise.all([
    prisma.documentWorkflowInstance.count({
      where: { template: { tenantId: session.tenantId } },
    }),
    prisma.documentWorkflowInstance.count({
      where: { template: { tenantId: session.tenantId }, status: "COMPLETED" },
    }),
  ]);
  const wfRate = wfTotal > 0 ? wfDone / wfTotal : 1;
  const anomalyPenalty = Math.min(0.1, anomalies.length * 0.02);
  const complianceScore = Math.max(0, Math.min(100, Math.round((0.85 + wfRate * 0.15 - anomalyPenalty) * 100)));

  return NextResponse.json({
    kpis: {
      complianceScore,
      complianceTarget: 90,
      pendingAccessRequests: accessRequests.length,
      activeAnomalies: anomalies.length,
      ytdEvents: ytdCount,
    },
    alerts: anomalies.map((a) => ({
      id: a.id,
      severity: "high" as const,
      title: a.metadata && typeof a.metadata === "object" && "title" in a.metadata
        ? String((a.metadata as { title?: string }).title)
        : `Anomalie détectée : ${a.action}`,
      details: a.document?.name ?? "Document inconnu",
      actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "Système",
      createdAt: a.createdAt.toISOString(),
    })),
    accessRequests: accessRequests.map((r) => ({
      id: r.id,
      requester: `${r.requester.firstName} ${r.requester.lastName}`,
      requesterRole: r.requester.role,
      documentName: r.document.name,
      documentRef: r.document.internalReference,
      reason: r.reason,
      requestedAt: r.requestedAt.toISOString(),
    })),
    journal: journal.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      action: e.action,
      actorName: e.actor ? `${e.actor.firstName.charAt(0)}. ${e.actor.lastName}` : "Système",
      actorRole: e.actor?.role ?? null,
      documentName: e.document?.name ?? null,
      documentRef: e.document?.internalReference ?? null,
      spaceName: e.space?.name ?? null,
      ipAddress: e.ipAddress,
      anomaly: e.anomaly,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
