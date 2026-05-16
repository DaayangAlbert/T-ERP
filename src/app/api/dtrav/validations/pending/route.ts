import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, DailyReportStatus } from "@prisma/client";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";

export const dynamic = "force-dynamic";

const DTRAV_ROLES: Role[] = [Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SUPER_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DTRAV_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const filterSiteId = url.searchParams.get("siteId");
  const allowed = await getAccessibleSiteIds(session.sub);
  const effectiveSiteIds = filterSiteId
    ? (allowed === null || allowed.includes(filterSiteId) ? [filterSiteId] : [])
    : allowed;

  // 1) Rapports journaliers à valider
  const dailyReports = await prisma.siteDailyReport.findMany({
    where: {
      status: DailyReportStatus.SUBMITTED,
      ...(effectiveSiteIds === null ? {} : { siteId: { in: effectiveSiteIds } }),
    },
    include: {
      site: { select: { code: true, name: true } },
      submittedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 2) Validations workflow (BC, dépenses, etc.) ciblées DTrav
  const validations = await prisma.validation.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      currentStep: { in: ["DTRAV", "WORKS_DIRECTOR"] },
    },
    include: { initiator: { select: { firstName: true, lastName: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
  });

  return NextResponse.json({
    dailyReports: dailyReports.map((r) => ({
      id: r.id,
      siteCode: r.site.code,
      siteName: r.site.name,
      reportDate: r.reportDate.toISOString(),
      submittedBy: r.submittedBy,
      workforcePresent: r.workforcePresent,
      productionValue: Number(r.productionValue),
    })),
    workflow: validations.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      amount: v.amount ? Number(v.amount) : null,
      initiator: v.initiator,
      priority: v.priority,
      createdAt: v.createdAt.toISOString(),
    })),
    totalCount: dailyReports.length + validations.length,
  });
}
