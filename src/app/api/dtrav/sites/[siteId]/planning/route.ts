import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const planning = await prisma.sitePlanning.findUnique({
    where: { siteId: params.siteId },
    include: {
      phases: {
        orderBy: { orderIndex: "asc" },
        include: { tasks: { orderBy: { plannedStart: "asc" } } },
      },
      milestones: { orderBy: { contractDueDate: "asc" } },
    },
  });

  if (!planning) {
    return NextResponse.json({ planning: null, phases: [], milestones: [], kpis: null });
  }

  const today = new Date();
  let totalProgress = 0;
  let totalWeight = 0;
  for (const ph of planning.phases) {
    const w = Math.max(1, ph.plannedEnd.getTime() - ph.plannedStart.getTime());
    totalProgress += (ph.progressPercent / 100) * w;
    totalWeight += w;
  }
  const overallProgress = totalWeight > 0 ? Math.round((totalProgress / totalWeight) * 100) : 0;

  const delayedPhase = planning.phases.find(
    (p) => p.status === "DELAYED" || (p.plannedEnd < today && p.progressPercent < 100)
  );
  const delayDays = delayedPhase
    ? Math.max(0, Math.floor((today.getTime() - delayedPhase.plannedEnd.getTime()) / 86_400_000))
    : 0;

  const nextMilestone = planning.milestones.find((m) => m.status === "UPCOMING");
  const lastMilestone = planning.milestones[planning.milestones.length - 1];

  return NextResponse.json({
    planning: {
      id: planning.id,
      totalDurationDays: planning.totalDurationDays,
    },
    phases: planning.phases.map((ph) => ({
      id: ph.id,
      orderIndex: ph.orderIndex,
      name: ph.name,
      plannedStart: ph.plannedStart.toISOString(),
      plannedEnd: ph.plannedEnd.toISOString(),
      actualStart: ph.actualStart?.toISOString() ?? null,
      actualEnd: ph.actualEnd?.toISOString() ?? null,
      progressPercent: ph.progressPercent,
      status: ph.status,
      tasks: ph.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        plannedStart: t.plannedStart.toISOString(),
        plannedEnd: t.plannedEnd.toISOString(),
        progressPercent: t.progressPercent,
      })),
    })),
    milestones: planning.milestones.map((m) => ({
      id: m.id,
      code: m.code,
      description: m.description,
      contractDueDate: m.contractDueDate.toISOString(),
      forecastDate: m.forecastDate?.toISOString() ?? null,
      actualDate: m.actualDate?.toISOString() ?? null,
      status: m.status,
      moaValidation: m.moaValidation,
    })),
    kpis: {
      overallProgress,
      delayDays,
      nextMilestone: nextMilestone
        ? {
            code: nextMilestone.code,
            daysToGo: Math.ceil(
              (nextMilestone.contractDueDate.getTime() - today.getTime()) / 86_400_000
            ),
          }
        : null,
      finalDelivery: lastMilestone
        ? {
            code: lastMilestone.code,
            daysToGo: Math.ceil(
              (lastMilestone.contractDueDate.getTime() - today.getTime()) / 86_400_000
            ),
          }
        : null,
    },
  });
}
