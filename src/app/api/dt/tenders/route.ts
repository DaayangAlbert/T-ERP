import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, TenderStage, WorkType, MoaType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

const PIPELINE_STAGES: TenderStage[] = [
  TenderStage.OPPORTUNITY,
  TenderStage.DCE_ANALYSIS,
  TenderStage.SITE_VISIT,
  TenderStage.TECHNICAL_STUDY,
  TenderStage.PRICING,
  TenderStage.SUBCONTRACTOR_QUOTES,
  TenderStage.INTERNAL_VALIDATION,
  TenderStage.SUBMITTED,
  TenderStage.RESULTS_PENDING,
];
const HISTORICAL_STAGES: TenderStage[] = [TenderStage.WON, TenderStage.LOST];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "in_progress"; // in_progress | imminent | this_month | history
  const stageFilter = searchParams.get("stage");
  const workType = searchParams.get("workType");

  const now = new Date();
  const j7 = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (view === "in_progress") {
    where.stage = { in: PIPELINE_STAGES };
  } else if (view === "imminent") {
    where.stage = { in: PIPELINE_STAGES };
    where.submissionDeadline = { gte: now, lte: j7 };
  } else if (view === "this_month") {
    where.stage = { in: PIPELINE_STAGES };
    where.submissionDeadline = { gte: monthStart, lte: monthEnd };
  } else if (view === "history") {
    where.stage = { in: HISTORICAL_STAGES };
  }
  if (stageFilter && Object.values(TenderStage).includes(stageFilter as TenderStage)) {
    where.stage = stageFilter;
  }
  if (workType && Object.values(WorkType).includes(workType as WorkType)) {
    where.workType = workType;
  }

  const tenders = await prisma.tender.findMany({
    where,
    include: {
      studyOwner: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
    orderBy: { submissionDeadline: "asc" },
  });

  // KPIs globaux (tous les pipeline en cours)
  const allInProgress = await prisma.tender.findMany({
    where: { tenantId: session.tenantId, stage: { in: PIPELINE_STAGES } },
    select: { estimatedBudget: true, studyCost: true, probability: true },
  });
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const allYtd = await prisma.tender.findMany({
    where: { tenantId: session.tenantId, createdAt: { gte: yearStart } },
    select: { stage: true, studyCost: true, ourBidAmount: true },
  });

  const ytdWon = allYtd.filter((t) => t.stage === TenderStage.WON).length;
  const ytdResults = allYtd.filter(
    (t) => t.stage === TenderStage.WON || t.stage === TenderStage.LOST
  ).length;
  const transformationRate = ytdResults > 0 ? Math.round((ytdWon / ytdResults) * 100) : 0;

  const totalStudyCost = allYtd.reduce((s, t) => s + Number(t.studyCost), 0);

  return NextResponse.json({
    items: tenders.map((t) => ({
      id: t.id,
      reference: t.reference,
      title: t.title,
      moaName: t.moaName,
      moaType: t.moaType,
      workType: t.workType,
      estimatedBudget: Number(t.estimatedBudget),
      submissionDeadline: t.submissionDeadline.toISOString(),
      stage: t.stage,
      probability: t.probability,
      studyCost: Number(t.studyCost),
      ourBidAmount: t.ourBidAmount ? Number(t.ourBidAmount) : null,
      ourMargin: t.ourMargin,
      awarded: t.awarded,
      itemsCount: t._count.items,
      studyOwner: t.studyOwner
        ? `${t.studyOwner.firstName.charAt(0)}. ${t.studyOwner.lastName}`
        : null,
    })),
    kpis: {
      inProgressCount: allInProgress.length,
      pipelineVolume: allInProgress.reduce((s, t) => s + Number(t.estimatedBudget), 0),
      transformationRate,
      ytdStudyCost: totalStudyCost,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const body = await req.json();
  const required = ["reference", "title", "moaName", "moaType", "workType", "estimatedBudget", "submissionDeadline"];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Champ manquant: ${k}` }, { status: 400 });
  }

  const tender = await prisma.tender.create({
    data: {
      tenantId: session.tenantId,
      reference: body.reference,
      title: body.title,
      moaName: body.moaName,
      moaType: body.moaType as MoaType,
      workType: body.workType as WorkType,
      estimatedBudget: BigInt(body.estimatedBudget),
      submissionDeadline: new Date(body.submissionDeadline),
      stage: (body.stage ?? "OPPORTUNITY") as TenderStage,
      studyOwnerId: session.sub,
      probability: body.probability ?? 30,
    },
  });

  return NextResponse.json({ id: tender.id, reference: tender.reference }, { status: 201 });
}
