import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantId = session.tenantId;
  const [docsTotal, docsClassified, anomaliesUnresolved, wfTotal, wfCompleted, retentionTotal, accessReqPending] = await Promise.all([
    prisma.document.count({ where: { tenantId } }),
    prisma.document.count({ where: { tenantId, classificationId: { not: null } } }),
    prisma.gedAuditEvent.count({ where: { tenantId, anomaly: true, resolvedAt: null } }),
    prisma.documentWorkflowInstance.count({ where: { template: { tenantId } } }),
    prisma.documentWorkflowInstance.count({ where: { template: { tenantId }, status: "COMPLETED" } }),
    prisma.documentRetentionRecord.count({ where: { document: { tenantId } } }),
    prisma.documentAccessRequest.count({ where: { document: { tenantId }, status: "PENDING" } }),
  ]);

  const indexationRate = docsTotal === 0 ? 100 : Math.round((docsClassified / docsTotal) * 100);
  const wfCompletionRate = wfTotal === 0 ? 100 : Math.round((wfCompleted / wfTotal) * 100);
  const retentionCoverage = docsTotal === 0 ? 100 : Math.round((retentionTotal / docsTotal) * 100);

  const checklist = [
    { key: "indexation", label: "Indexation classifications ≥ 95%", target: 95, value: indexationRate, ok: indexationRate >= 95 },
    { key: "anomalies", label: "Aucune anomalie non résolue", target: 0, value: anomaliesUnresolved, ok: anomaliesUnresolved === 0 },
    { key: "workflows", label: "Workflows clôturés ≥ 80%", target: 80, value: wfCompletionRate, ok: wfCompletionRate >= 80 },
    { key: "retention", label: "Politique DUA couverte ≥ 90%", target: 90, value: retentionCoverage, ok: retentionCoverage >= 90 },
    { key: "access", label: "Demandes d'accès traitées sous 48h", target: 0, value: accessReqPending, ok: accessReqPending <= 3 },
  ];

  const totalOk = checklist.filter((c) => c.ok).length;
  const readiness = Math.round((totalOk / checklist.length) * 100);

  return NextResponse.json({
    readiness,
    targetIso9001: 90,
    checklist,
    nextAuditWindow: "22 mai 2026",
  });
}
