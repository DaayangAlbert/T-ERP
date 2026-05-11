import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const [methods, templates, ratios, rex] = await Promise.all([
    prisma.operatingMethod.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { category: "asc" },
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.templatePlanning.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { usageCount: "desc" },
    }),
    prisma.referenceRatio.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { workItem: "asc" },
    }),
    prisma.siteRex.findMany({
      where: { site: { tenantId: session.tenantId } },
      include: { site: { select: { code: true, name: true } } },
      orderBy: { closedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    kpis: {
      methodsActive: methods.filter((m) => m.status === "ACTIVE").length,
      templatesCount: templates.length,
      ratiosCount: ratios.length,
      rexCount: rex.length,
    },
    methods: methods.map((m) => ({
      id: m.id,
      category: m.category,
      title: m.title,
      version: m.version,
      lastReviewedAt: m.lastReviewedAt?.toISOString() ?? null,
      author: m.author ? `${m.author.firstName.charAt(0)}. ${m.author.lastName}` : null,
      usageCount: m.usageCount,
      status: m.status,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      siteTypology: t.siteTypology,
      totalDuration: t.totalDuration,
      phases: t.phases as Array<{ name: string; durationDays: number }>,
      usageCount: t.usageCount,
    })),
    ratios: ratios.map((r) => ({
      id: r.id,
      workItem: r.workItem,
      unit: r.unit,
      refValue: r.refValue,
      observedValue: r.observedValue,
      observationsCount: r.observationsCount,
      gap: r.observedValue - r.refValue,
      gapPercent: r.refValue > 0 ? ((r.observedValue - r.refValue) / r.refValue) * 100 : 0,
    })),
    rex: rex.map((r) => ({
      id: r.id,
      siteCode: r.site.code,
      siteName: r.site.name,
      issues: r.issues,
      solutions: r.solutions,
      recommendations: r.recommendations,
      keywords: r.keywords,
      closedAt: r.closedAt.toISOString(),
    })),
  });
}
