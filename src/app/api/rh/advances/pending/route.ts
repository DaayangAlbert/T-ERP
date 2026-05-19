import { NextResponse } from "next/server";
import { Role, SalaryAdvanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Liste les demandes d'avance sur salaire en attente de validation,
 * pour le DRH / DAF / DG (vue tenant + filiales si holding).
 *
 * Routes complémentaires :
 *   - POST /api/ouv/advances (création par l'ouvrier)
 *   - Notification auto envoyée aux HR / DAF / DG via notifySupervisors
 *     (voir src/lib/notify-supervisors.ts)
 *
 * Filtre RBAC : seuls HR, DAF, DG, TENANT_ADMIN peuvent consulter.
 */
const ALLOWED_ROLES: ReadonlySet<Role> = new Set<Role>([
  Role.HR,
  Role.DAF,
  Role.DG,
  Role.TENANT_ADMIN,
]);

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [], summary: emptySummary() });
  if (!ALLOWED_ROLES.has(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);

  const advances = await prisma.salaryAdvanceRequest.findMany({
    where: {
      tenantId: { in: tenantIds },
      status: SalaryAdvanceStatus.PENDING,
    },
    orderBy: { createdAt: "asc" }, // les plus anciennes d'abord
    select: {
      id: true,
      amountXAF: true,
      maxAllowedXAF: true,
      reason: true,
      payoutMethod: true,
      status: true,
      createdAt: true,
      tenantId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          position: true,
          assignedSiteIds: true,
          avatarUrl: true,
          phoneMobile: true,
        },
      },
    },
  });

  // Résout les noms de chantier pour affichage
  const allSiteIds = Array.from(
    new Set(advances.flatMap((a) => a.user.assignedSiteIds)),
  );
  const sites = allSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: allSiteIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const items = advances.map((a) => ({
    id: a.id,
    amountXAF: Number(a.amountXAF),
    maxAllowedXAF: Number(a.maxAllowedXAF),
    reason: a.reason,
    payoutMethod: a.payoutMethod,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    user: {
      id: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      matricule: a.user.matricule,
      position: a.user.position,
      avatarUrl: a.user.avatarUrl,
      phoneMobile: a.user.phoneMobile,
      sites: a.user.assignedSiteIds
        .map((id) => siteById.get(id))
        .filter((s): s is { id: string; code: string; name: string } => Boolean(s)),
    },
  }));

  const totalAmount = items.reduce((acc, a) => acc + a.amountXAF, 0);

  return NextResponse.json({
    items,
    summary: {
      pendingCount: items.length,
      totalAmountXAF: totalAmount,
    },
  });
}

function emptySummary() {
  return { pendingCount: 0, totalAmountXAF: 0 };
}
