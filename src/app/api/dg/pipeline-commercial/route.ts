import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const OPEN_STAGES = [
  "OPPORTUNITY",
  "DCE_ANALYSIS",
  "SITE_VISIT",
  "TECHNICAL_STUDY",
  "PRICING",
  "SUBCONTRACTOR_QUOTES",
  "INTERNAL_VALIDATION",
  "SUBMITTED",
  "RESULTS_PENDING",
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenders = await prisma.tender.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ stage: "asc" }, { submissionDeadline: "asc" }],
    include: { studyOwner: { select: { firstName: true, lastName: true } } },
    take: 300,
  });

  const open = tenders.filter((t) => OPEN_STAGES.includes(t.stage));
  const won = tenders.filter((t) => t.stage === "WON");
  const lost = tenders.filter((t) => t.stage === "LOST");

  const weightedPipeline = open.reduce((s, t) => s + (Number(t.estimatedBudget) * t.probability) / 100, 0);
  const totalPipeline = open.reduce((s, t) => s + Number(t.estimatedBudget), 0);
  const totalWon = won.reduce((s, t) => s + Number(t.ourBidAmount ?? t.estimatedBudget), 0);
  const conversionRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;

  // Grouping par stage
  const byStage = new Map<string, { stage: string; count: number; value: number; weightedValue: number }>();
  for (const t of open) {
    const acc = byStage.get(t.stage) ?? { stage: t.stage, count: 0, value: 0, weightedValue: 0 };
    acc.count += 1;
    acc.value += Number(t.estimatedBudget);
    acc.weightedValue += (Number(t.estimatedBudget) * t.probability) / 100;
    byStage.set(t.stage, acc);
  }

  const now = new Date();

  return NextResponse.json({
    summary: {
      openCount: open.length,
      totalPipeline: String(totalPipeline),
      weightedPipeline: String(weightedPipeline),
      won: won.length,
      lost: lost.length,
      conversionRate,
      totalWon: String(totalWon),
    },
    byStage: Array.from(byStage.values()).map((s) => ({
      stage: s.stage,
      count: s.count,
      value: String(s.value),
      weightedValue: String(s.weightedValue),
    })),
    tenders: tenders.map((t) => ({
      id: t.id,
      reference: t.reference,
      title: t.title,
      moaName: t.moaName,
      workType: t.workType,
      estimatedBudget: t.estimatedBudget.toString(),
      submissionDeadline: t.submissionDeadline.toISOString(),
      daysUntilDeadline: Math.ceil((t.submissionDeadline.getTime() - now.getTime()) / 86_400_000),
      stage: t.stage,
      probability: t.probability,
      ourBidAmount: t.ourBidAmount?.toString() ?? null,
      ourMargin: t.ourMargin,
      awarded: t.awarded,
      awardedTo: t.awardedTo,
      studyOwner: `${t.studyOwner.firstName} ${t.studyOwner.lastName}`,
    })),
  });
}
