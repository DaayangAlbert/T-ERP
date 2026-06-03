import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSite, guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  observations: z.string().max(8000).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const planning = await prisma.sitePlanning.findUnique({
    where: { siteId: params.siteId },
    select: { id: true },
  });
  if (!planning) return NextResponse.json({ error: "Planning non initialisé" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.sitePlanning.update({
    where: { id: planning.id },
    data: {
      observations:
        parsed.data.observations !== undefined ? parsed.data.observations?.trim() || null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Bootstrap le planning d'un chantier (idempotent — si déjà existant, le
 * retourne tel quel). Durée par défaut = (plannedEndDate − startDate) en jours.
 */
export async function POST(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const existing = await prisma.sitePlanning.findUnique({ where: { siteId: params.siteId } });
  if (existing) return NextResponse.json({ id: existing.id, alreadyExisted: true });

  const site = await prisma.site.findUnique({
    where: { id: params.siteId },
    select: { startDate: true, plannedEndDate: true },
  });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const totalDurationDays = Math.max(
    1,
    Math.round((site.plannedEndDate.getTime() - site.startDate.getTime()) / 86_400_000),
  );

  const created = await prisma.sitePlanning.create({
    data: { siteId: params.siteId, totalDurationDays },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.planning.bootstrap",
      entityType: "SitePlanning",
      entityId: created.id,
      metadata: { siteId: params.siteId, totalDurationDays },
    },
  });

  return NextResponse.json({ id: created.id, alreadyExisted: false }, { status: 201 });
}

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
      observations: planning.observations,
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
