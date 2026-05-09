import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { calculateProjection, startOfIsoWeek } from "@/lib/cashflow";
import { manualForecastSchema } from "@/schemas/cashflow";
import { Role, SiteStatus, CashFlowType } from "@prisma/client";

export const dynamic = "force-dynamic";

// L'API renvoie le détail (12 semaines + transactions à risque + le solde initial estimé).
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const url = new URL(req.url);
  const weeks = Math.max(4, Math.min(26, parseInt(url.searchParams.get("weeks") ?? "12", 10) || 12));

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const startDate = startOfIsoWeek(new Date());
  const horizonEnd = new Date(startDate);
  horizonEnd.setDate(startDate.getDate() + weeks * 7);

  const [projections, sites] = await Promise.all([
    prisma.cashFlowProjection.findMany({
      where: {
        tenantId: { in: scopeIds },
        expectedDate: { gte: startDate, lt: horizonEnd },
      },
      orderBy: { expectedDate: "asc" },
    }),
    // Solde initial estimé : 18 % du CA gagné (cohérent avec /api/dashboard/dg).
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
      select: { budget: true, progress: true },
    }),
  ]);

  const earnedRevenue = sites.reduce((sum, s) => sum + (Number(s.budget) * s.progress) / 100, 0);
  const initialBalance = Math.round(earnedRevenue * 0.18);

  const result = calculateProjection(projections, { initialBalance, weeks, startDate });

  // Liste des grosses échéances (>= 50 M FCFA) pour la card "à risque"
  const majorDueDates = projections
    .filter((p) => Number(p.amount) >= 50_000_000)
    .map((p) => ({
      id: p.id,
      type: p.type,
      category: p.category,
      label: p.label,
      amount: p.amount.toString(),
      expectedDate: p.expectedDate.toISOString(),
      probability: p.probability,
      sourceType: p.sourceType,
    }))
    .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
    .slice(0, 10);

  return NextResponse.json({
    weeks: result.weeks,
    summary: {
      initialBalance: result.initialBalance,
      totalIncome: result.totalIncome,
      totalExpense: result.totalExpense,
      finalBalance: result.finalBalance,
      criticalWeeksCount: result.criticalWeeks.length,
    },
    thresholds: result.thresholds,
    majorDueDates,
    horizon: {
      startDate: startDate.toISOString(),
      endDate: horizonEnd.toISOString(),
      weeks,
    },
    projectionsCount: projections.length,
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  try {
    const data = manualForecastSchema.parse(await req.json());

    // Récurrence : si MONTHLY, on génère N entries (mois suivants)
    const baseDate = new Date(data.expectedDate);
    const entries = [] as { date: Date; suffix: string }[];
    const count = data.recurrence === "MONTHLY" ? data.recurrenceCount : 1;
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() + i);
      entries.push({ date: d, suffix: count > 1 ? ` (${i + 1}/${count})` : "" });
    }

    const created = await prisma.$transaction(
      entries.map(({ date, suffix }) =>
        prisma.cashFlowProjection.create({
          data: {
            tenantId: session.tenantId!,
            type: data.type,
            category: data.category,
            label: data.label + suffix,
            amount: BigInt(data.amount),
            expectedDate: date,
            probability: data.probability,
            sourceType: "MANUAL",
          },
        })
      )
    );

    return NextResponse.json({ ids: created.map((c) => c.id), count: created.length }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/dg/cashflow]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
