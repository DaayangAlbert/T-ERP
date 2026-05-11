import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86400_000);

  const [milestones, audits] = await Promise.all([
    prisma.milestone.findMany({
      where: {
        tenantId: { in: scopeIds },
        date: { gte: now, lte: horizon },
      },
      orderBy: { date: "asc" },
      take: 20,
    }),
    prisma.siteAudit.findMany({
      where: {
        site: { tenantId: { in: scopeIds } },
        scheduledAt: { gte: now, lte: horizon },
        completedAt: null,
      },
      include: { site: { select: { code: true, name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const events = [
    ...milestones.map((m) => ({
      id: m.id,
      date: m.date.toISOString(),
      type: "MILESTONE" as const,
      title: m.title,
      details: m.notes ?? "",
      critical: m.critical,
    })),
    ...audits.map((a) => ({
      id: a.id,
      date: a.scheduledAt.toISOString(),
      type: "AUDIT" as const,
      title: `Audit ${a.auditType} — ${a.site.name}`,
      details: a.site.code,
      critical: false,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({ events });
}
