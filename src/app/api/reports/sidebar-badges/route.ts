import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Compteurs "à valider" pour les rapports techniques.
 * Filtre par rôle pour ne renvoyer que ce qui concerne le viewer :
 *  - DTrav  → rapports CC + CDT en attente
 *  - DG     → rapports DT + DTrav + QHSE en attente
 *  - DT     → ses propres rapports DT/QHSE qui ont été refusés (à reprendre)
 *  - CDT    → ses rapports refusés
 *  - CC     → ses rapports refusés
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({});
  }

  const role = session.role as Role;
  const tenantId = session.tenantId;

  const result: Record<string, number> = {};

  if (role === Role.WORKS_DIRECTOR || role === Role.TENANT_ADMIN || role === Role.SUPER_ADMIN) {
    const [ccPending, cdtPending] = await Promise.all([
      prisma.siteProgressReport.count({ where: { tenantId, status: "SUBMITTED" } }),
      prisma.cdtWeeklyReport.count({ where: { tenantId, status: "SUBMITTED" } }),
    ]);
    result.dtravValidationsCc = ccPending;
    result.dtravValidationsCdt = cdtPending;
  }

  if (role === Role.DG || role === Role.TENANT_ADMIN || role === Role.SUPER_ADMIN) {
    const [dtPending, dtravPending, qhsePending] = await Promise.all([
      prisma.dtMonthlyTechReport.count({ where: { tenantId, status: "SUBMITTED" } }),
      prisma.dtravMonthlyReport.count({ where: { tenantId, status: "SUBMITTED" } }),
      prisma.qhseMonthlyReport.count({ where: { tenantId, status: "SUBMITTED" } }),
    ]);
    result.dgValidationsDt = dtPending;
    result.dgValidationsDtrav = dtravPending;
    result.dgValidationsQhse = qhsePending;
  }

  // Compteurs "rapports refusés" pour les auteurs (à reprendre)
  if (role === Role.TECH_DIRECTOR) {
    const [dtRejected, qhseRejected] = await Promise.all([
      prisma.dtMonthlyTechReport.count({ where: { authorId: session.sub, status: "REJECTED" } }),
      prisma.qhseMonthlyReport.count({ where: { authorId: session.sub, status: "REJECTED" } }),
    ]);
    result.dtMyRejected = dtRejected;
    result.qhseMyRejected = qhseRejected;
  }

  if (role === Role.WORKS_MANAGER) {
    const rejected = await prisma.cdtWeeklyReport.count({
      where: { authorId: session.sub, status: "REJECTED" },
    });
    result.cdtMyRejected = rejected;
  }

  if (role === Role.SITE_MANAGER) {
    const rejected = await prisma.siteProgressReport.count({
      where: { authorId: session.sub, status: "REJECTED" },
    });
    result.ccMyRejected = rejected;
  }

  if (role === Role.WORKS_DIRECTOR) {
    const rejected = await prisma.dtravMonthlyReport.count({
      where: { authorId: session.sub, status: "REJECTED" },
    });
    result.dtravMyRejected = rejected;
  }

  return NextResponse.json(result);
}
