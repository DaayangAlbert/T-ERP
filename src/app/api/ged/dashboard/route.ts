import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import {
  ArchivalStatus,
  ClassificationCategory,
  GedAuditAction,
  SpaceType,
  WorkflowStatus,
} from "@prisma/client";
import type { GedDashboardResponse, GedAlertSeverity } from "@/hooks/useGedDashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const in30d = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const [
    spaces,
    activeDocs,
    sumVolume,
    pendingWorkflows,
    completedYtdWorkflows,
    overdueWorkflows,
    pendingAccessRequests,
    contractsExpiring,
    docsAwaitingClassification,
    docsEndingDua,
    anomalies,
    activityRaw,
    docsByCategory,
  ] = await Promise.all([
    prisma.documentSpace.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        code: true,
        name: true,
        icon: true,
        spaceType: true,
        confidentiality: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.document.count({
      where: {
        tenantId,
        retentionRecord: { archivalStatus: { in: [ArchivalStatus.ACTIVE, ArchivalStatus.SEMI_ACTIVE] } },
      },
    }),
    prisma.document.aggregate({ where: { tenantId }, _sum: { sizeBytes: true } }),
    prisma.documentWorkflowInstance.count({
      where: { document: { tenantId }, status: WorkflowStatus.IN_PROGRESS },
    }),
    prisma.documentWorkflowInstance.count({
      where: {
        document: { tenantId },
        status: WorkflowStatus.COMPLETED,
        completedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
    prisma.documentWorkflowInstance.findMany({
      where: {
        document: { tenantId },
        status: WorkflowStatus.IN_PROGRESS,
        dueAt: { lt: new Date() },
      },
      select: { id: true, reference: true, dueAt: true },
      take: 10,
    }),
    prisma.documentAccessRequest.count({
      where: { document: { tenantId }, status: "PENDING" },
    }),
    prisma.document.findMany({
      where: {
        tenantId,
        classification: { prefix: "CTR" },
        retentionRecord: { duaEndDate: { lte: in30d, gte: new Date() } },
      },
      select: { id: true, internalReference: true, name: true },
      take: 5,
    }),
    prisma.document.count({
      where: {
        tenantId,
        classificationId: null,
        createdAt: { lte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      },
    }),
    prisma.documentRetentionRecord.count({
      where: {
        document: { tenantId },
        duaEndDate: { lte: in30d, gte: new Date() },
        legalHold: false,
      },
    }),
    prisma.gedAuditEvent.count({
      where: { tenantId, anomaly: true, resolvedAt: null },
    }),
    prisma.gedAuditEvent.findMany({
      where: { tenantId, createdAt: { gte: since24h } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        action: true,
        anomaly: true,
        actor: { select: { firstName: true, lastName: true, role: true } },
        document: { select: { name: true, internalReference: true, space: { select: { name: true, icon: true } } } },
      },
    }),
    prisma.document.groupBy({
      by: ["classificationId"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  // ── Calculs dérivés ──────────────────────────────────────────────────────
  const totalDocs = await prisma.document.count({ where: { tenantId } });
  const indexedDocs = await prisma.document.count({
    where: { tenantId, classificationId: { not: null } },
  });
  const indexationRate = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : 0;

  // Compliance alerts = anomalies non-résolues + workflows OVERDUE + critical contracts expiring + access requests
  const criticalCount = anomalies + contractsExpiring.length;
  const complianceAlerts = criticalCount + Math.min(overdueWorkflows.length, 2);

  // ── Cards Espaces (groupées) ─────────────────────────────────────────────
  // Le proto demande 6 cards :
  //   📜 Marchés & contrats / 🏗 Chantiers (23) / 👥 RH / 💰 Comptable / ⚖ Juridique / 🛡 QSE
  // On regroupe les 23 espaces CONSTRUCTION_SITE en 1 card synthétique.
  const transverseSpaces = spaces.filter((s) => s.spaceType !== SpaceType.CONSTRUCTION_SITE);
  const siteSpaces = spaces.filter((s) => s.spaceType === SpaceType.CONSTRUCTION_SITE);
  const siteSpacesDocsCount = siteSpaces.reduce((s, sp) => s + sp._count.documents, 0);

  // Indexation par espace = ratio docs avec classificationId / total docs de l'espace
  const indexedBySpace = await prisma.document.groupBy({
    by: ["spaceId"],
    where: { tenantId, classificationId: { not: null } },
    _count: { _all: true },
  });
  const indexedMap = new Map<string, number>(
    indexedBySpace.filter((r) => r.spaceId).map((r) => [r.spaceId!, r._count._all]),
  );

  const spacesCards: GedDashboardResponse["spaces"] = [
    ...transverseSpaces.map((s) => {
      const indexed = indexedMap.get(s.id) ?? 0;
      const rate = s._count.documents > 0 ? Math.round((indexed / s._count.documents) * 100) : 0;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        icon: s.icon ?? "📁",
        docsCount: s._count.documents,
        indexationRate: rate,
        spaceType: s.spaceType,
      };
    }),
    {
      id: "AGGREGATED_SITES",
      code: "SITES",
      name: "Chantiers",
      icon: "🏗",
      docsCount: siteSpacesDocsCount,
      indexationRate:
        siteSpacesDocsCount > 0
          ? Math.round(
              (siteSpaces.reduce((s, sp) => s + (indexedMap.get(sp.id) ?? 0), 0) / siteSpacesDocsCount) * 100,
            )
          : 0,
      spaceType: SpaceType.CONSTRUCTION_SITE,
      childCount: siteSpaces.length,
    },
  ];

  // ── Alertes documentaires (5 hiérarchisées) ──────────────────────────────
  const alerts: GedDashboardResponse["alerts"] = [];
  if (contractsExpiring.length > 0) {
    alerts.push({
      id: "alert-contracts-expiring",
      severity: "critical",
      title: `${contractsExpiring.length} contrat(s) MOA expirent dans 30 j`,
      detail: contractsExpiring.map((c) => c.internalReference ?? c.name).slice(0, 3).join(", "),
      link: "/ged/espaces?filter=MARCHES",
    });
  }
  if (docsAwaitingClassification > 0) {
    alerts.push({
      id: "alert-await-classification",
      severity: docsAwaitingClassification > 100 ? "critical" : "warning",
      title: `${docsAwaitingClassification} doc(s) en attente classement > 30 j`,
      detail: "Documents importés sans classification rattachée",
      link: "/ged/recherche?filter=unclassified",
    });
  }
  if (pendingAccessRequests > 0) {
    alerts.push({
      id: "alert-access-requests",
      severity: "warning",
      title: `${pendingAccessRequests} demande(s) d'accès confidentiels`,
      detail: "À traiter dans les 48 h",
      link: "/ged/audit?tab=access-requests",
    });
  }
  if (docsEndingDua > 0) {
    alerts.push({
      id: "alert-end-dua",
      severity: "warning",
      title: `${docsEndingDua} doc(s) en fin de DUA`,
      detail: "À programmer pour archivage définitif ou destruction",
      link: "/ged/recherche?filter=ending-dua",
    });
  }
  if (pendingWorkflows > 0) {
    alerts.push({
      id: "alert-workflows-pending",
      severity: "info",
      title: `${pendingWorkflows} workflow(s) validation en cours`,
      detail: `${overdueWorkflows.length} en retard`,
      link: "/ged/workflows",
    });
  }

  // ── Activité 24h ─────────────────────────────────────────────────────────
  const recentActivity: GedDashboardResponse["recentActivity"] = activityRaw.map((e) => ({
    id: e.id,
    timestamp: e.createdAt.toISOString(),
    actorName: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : "Système",
    actorRole: e.actor?.role ?? "SYSTEM",
    action: e.action,
    documentName: e.document?.internalReference ?? e.document?.name ?? null,
    spaceName: e.document?.space?.name ?? null,
    isAnomaly: e.anomaly,
  }));

  const response: GedDashboardResponse = {
    banner: {
      spacesCount: spaces.length,
      activeDocumentsCount: activeDocs,
      totalVolumeBytes: Number(sumVolume._sum.sizeBytes ?? 0n),
    },
    greeting: {
      activeWorkflowsCount: pendingWorkflows,
      complianceAlertsCount: complianceAlerts,
      pendingAccessRequestsCount: pendingAccessRequests,
    },
    kpis: {
      activeDocuments: activeDocs,
      pendingValidation: pendingWorkflows,
      indexationRate,
      indexationTarget: 95,
      complianceAlerts,
      criticalAlertsCount: criticalCount,
    },
    alerts,
    spaces: spacesCards,
    recentActivity,
  };

  return NextResponse.json(response);
}
