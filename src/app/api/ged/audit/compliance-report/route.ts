import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { ArchivalStatus, WorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ged/audit/compliance-report?period=YTD|month|year
// Retourne un payload structuré (que l'UI peut transformer en PDF).
export async function GET(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "YTD";

  const now = new Date();
  let from: Date;
  if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else {
    from = new Date(now.getFullYear(), 0, 1); // YTD
  }

  const [
    totalDocs,
    indexedDocs,
    spacesCount,
    spacesIndexationRaw,
    workflowsTotal,
    workflowsCompleted,
    workflowsInTime,
    accessRequestsTotal,
    accessRequestsApproved,
    accessRequestsAvgDecisionMs,
    anomaliesTotal,
    anomaliesResolved,
    duaPending,
    duaOverdue,
  ] = await Promise.all([
    prisma.document.count({ where: { tenantId } }),
    prisma.document.count({ where: { tenantId, classificationId: { not: null } } }),
    prisma.documentSpace.count({ where: { tenantId, active: true } }),
    prisma.document.groupBy({
      by: ["spaceId"],
      where: { tenantId, spaceId: { not: null } },
      _count: { _all: true },
    }),
    prisma.documentWorkflowInstance.count({
      where: { document: { tenantId }, startedAt: { gte: from } },
    }),
    prisma.documentWorkflowInstance.count({
      where: {
        document: { tenantId },
        status: WorkflowStatus.COMPLETED,
        completedAt: { gte: from },
      },
    }),
    prisma.documentWorkflowInstance.findMany({
      where: {
        document: { tenantId },
        status: WorkflowStatus.COMPLETED,
        completedAt: { gte: from },
      },
      select: { startedAt: true, completedAt: true, dueAt: true },
    }),
    prisma.documentAccessRequest.count({
      where: { document: { tenantId }, requestedAt: { gte: from } },
    }),
    prisma.documentAccessRequest.count({
      where: { document: { tenantId }, requestedAt: { gte: from }, status: "APPROVED" },
    }),
    prisma.documentAccessRequest.findMany({
      where: { document: { tenantId }, decidedAt: { not: null }, requestedAt: { gte: from } },
      select: { requestedAt: true, decidedAt: true },
    }),
    prisma.gedAuditEvent.count({
      where: { tenantId, anomaly: true, createdAt: { gte: from } },
    }),
    prisma.gedAuditEvent.count({
      where: { tenantId, anomaly: true, createdAt: { gte: from }, resolvedAt: { not: null } },
    }),
    prisma.documentRetentionRecord.count({
      where: { document: { tenantId }, archivalStatus: ArchivalStatus.PENDING_DESTRUCTION },
    }),
    prisma.documentRetentionRecord.count({
      where: {
        document: { tenantId },
        archivalStatus: { in: [ArchivalStatus.SEMI_ACTIVE, ArchivalStatus.ACTIVE] },
        duaEndDate: { lt: now },
        legalHold: false,
      },
    }),
  ]);

  // Calcul SLA workflows
  const wfInTime = workflowsInTime.filter((w) => {
    if (!w.dueAt || !w.completedAt) return true;
    return w.completedAt.getTime() <= w.dueAt.getTime();
  }).length;
  const wfSlaRate = workflowsInTime.length > 0 ? Math.round((wfInTime / workflowsInTime.length) * 100) : 100;

  const accessAvgDays =
    accessRequestsAvgDecisionMs.length === 0
      ? 0
      : Math.round(
          (accessRequestsAvgDecisionMs.reduce(
            (s, r) => s + (r.decidedAt!.getTime() - r.requestedAt.getTime()),
            0,
          ) /
            accessRequestsAvgDecisionMs.length /
            86400_000) *
            10,
        ) / 10;

  // Indexation par espace (avec stats des indexed)
  const indexedBySpace = await prisma.document.groupBy({
    by: ["spaceId"],
    where: { tenantId, spaceId: { not: null }, classificationId: { not: null } },
    _count: { _all: true },
  });
  const indexedMap = new Map<string, number>(
    indexedBySpace.filter((r) => r.spaceId).map((r) => [r.spaceId!, r._count._all]),
  );
  const spacesData = await prisma.documentSpace.findMany({
    where: { tenantId, active: true },
    select: { id: true, code: true, name: true },
  });
  const spaceIndexation = spacesData.map((s) => {
    const total = spacesIndexationRaw.find((r) => r.spaceId === s.id)?._count._all ?? 0;
    const indexed = indexedMap.get(s.id) ?? 0;
    return {
      code: s.code,
      name: s.name,
      total,
      indexed,
      rate: total > 0 ? Math.round((indexed / total) * 100) : 0,
    };
  });

  const indexationRate = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : 0;
  const workflowsCompletionRate = workflowsTotal > 0 ? Math.round((workflowsCompleted / workflowsTotal) * 100) : 100;
  const accessApprovalRate =
    accessRequestsTotal > 0 ? Math.round((accessRequestsApproved / accessRequestsTotal) * 100) : 100;

  // Score conformité global pondéré
  const scoreComponents = {
    indexation: indexationRate,
    workflowSla: wfSlaRate,
    workflowCompletion: workflowsCompletionRate,
    anomalyResolution: anomaliesTotal > 0 ? Math.round((anomaliesResolved / anomaliesTotal) * 100) : 100,
  };
  const overallScore = Math.round(
    scoreComponents.indexation * 0.3 +
      scoreComponents.workflowSla * 0.25 +
      scoreComponents.workflowCompletion * 0.25 +
      scoreComponents.anomalyResolution * 0.2,
  );

  return NextResponse.json({
    period,
    periodFrom: from.toISOString(),
    periodTo: now.toISOString(),
    overallScore,
    scoreComponents,
    indexation: {
      totalDocs,
      indexedDocs,
      rate: indexationRate,
      bySpace: spaceIndexation,
    },
    workflows: {
      total: workflowsTotal,
      completed: workflowsCompleted,
      completionRate: workflowsCompletionRate,
      slaRate: wfSlaRate,
    },
    accessRequests: {
      total: accessRequestsTotal,
      approved: accessRequestsApproved,
      approvalRate: accessApprovalRate,
      avgDecisionDays: accessAvgDays,
    },
    anomalies: {
      total: anomaliesTotal,
      resolved: anomaliesResolved,
      resolutionRate: anomaliesTotal > 0 ? Math.round((anomaliesResolved / anomaliesTotal) * 100) : 100,
    },
    retention: {
      pendingDestruction: duaPending,
      overdueDuaWithoutHold: duaOverdue,
    },
    spacesCount,
  });
}
