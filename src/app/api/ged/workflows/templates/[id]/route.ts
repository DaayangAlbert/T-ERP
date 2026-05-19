import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

const ROLE_VALUES = [
  Role.DG,
  Role.DAF,
  Role.SECRETARY_GENERAL,
  Role.HR,
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.SITE_MANAGER,
  Role.WORKER,
  Role.ACCOUNTANT,
  Role.LOGISTICS,
  Role.WAREHOUSE,
  Role.ARCHIVIST,
  Role.EMPLOYEE,
] as const;

const stepSchema = z.object({
  stepIndex: z.number().int().min(0),
  name: z.string().min(2).max(120),
  role: z.union([z.enum(ROLE_VALUES), z.literal("EXTERNAL")]),
  mandatory: z.boolean().default(true),
  slaHours: z.number().int().min(1).max(720).default(48),
});

const updateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  description: z.string().max(500).nullable().optional(),
  steps: z.array(stepSchema).min(1).max(10).optional(),
  active: z.boolean().optional(),
  classificationIds: z.array(z.string().cuid()).optional(),
});

/**
 * GET /api/ged/workflows/templates/[id]
 * Détail d'un template + classifications rattachées.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const tpl = await prisma.documentWorkflowTemplate.findFirst({
    where: { id: params.id, tenantId },
    include: {
      classifications: { select: { id: true, prefix: true, name: true, active: true } },
      _count: { select: { instances: true } },
    },
  });
  if (!tpl) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

  return NextResponse.json({
    id: tpl.id,
    code: tpl.code,
    name: tpl.name,
    description: tpl.description,
    steps: tpl.steps,
    active: tpl.active,
    instancesCount: tpl._count.instances,
    classifications: tpl.classifications,
    createdAt: tpl.createdAt.toISOString(),
    updatedAt: tpl.updatedAt.toISOString(),
  });
}

/**
 * PATCH /api/ged/workflows/templates/[id]
 * Modifie un template existant.
 * Si `steps` est fourni, remplace entièrement la liste des étapes.
 * Si `classificationIds` est fourni, redéfinit le rattachement.
 *
 * Note : modifier `steps` n'affecte PAS les instances déjà créées (snapshot
 * pris au moment de l'instanciation via `DocumentWorkflowStep`).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const tpl = await prisma.documentWorkflowTemplate.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!tpl) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.active !== undefined) update.active = data.active;

  if (data.steps) {
    const sortedSteps = [...data.steps].sort((a, b) => a.stepIndex - b.stepIndex);
    for (let i = 0; i < sortedSteps.length; i++) {
      if (sortedSteps[i].stepIndex !== i) {
        return NextResponse.json(
          { error: `stepIndex doit être contigu depuis 0 (manquant : ${i})` },
          { status: 400 },
        );
      }
    }
    update.steps = sortedSteps as object;
  }

  if (data.classificationIds) {
    const found = await prisma.documentClassification.findMany({
      where: { id: { in: data.classificationIds }, tenantId },
      select: { id: true },
    });
    if (found.length !== data.classificationIds.length) {
      return NextResponse.json(
        { error: "Une ou plusieurs classifications sont introuvables" },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(update).length > 0) {
      await tx.documentWorkflowTemplate.update({
        where: { id: tpl.id },
        data: update,
      });
    }
    if (data.classificationIds) {
      // Détache toutes les classifications actuellement liées à ce template
      await tx.documentClassification.updateMany({
        where: { tenantId, workflowId: tpl.id },
        data: { workflowId: null },
      });
      // Puis rattache la nouvelle sélection
      if (data.classificationIds.length > 0) {
        await tx.documentClassification.updateMany({
          where: { id: { in: data.classificationIds }, tenantId },
          data: { workflowId: tpl.id },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/ged/workflows/templates/[id]
 * Soft delete : passe `active=false`. Empêche la création de nouvelles
 * instances mais conserve les instances en cours et l'historique.
 * Force suppression via ?force=1 SI aucune instance n'existe.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const tpl = await prisma.documentWorkflowTemplate.findFirst({
    where: { id: params.id, tenantId },
    include: { _count: { select: { instances: true } } },
  });
  if (!tpl) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  if (force && tpl._count.instances === 0) {
    // Suppression définitive autorisée seulement si aucune instance
    await prisma.$transaction(async (tx) => {
      await tx.documentClassification.updateMany({
        where: { tenantId, workflowId: tpl.id },
        data: { workflowId: null },
      });
      await tx.documentWorkflowTemplate.delete({ where: { id: tpl.id } });
    });
    return NextResponse.json({ ok: true, deleted: "hard" });
  }

  // Soft delete par défaut (conserve les instances historiques)
  await prisma.documentWorkflowTemplate.update({
    where: { id: tpl.id },
    data: { active: false },
  });
  return NextResponse.json({
    ok: true,
    deleted: "soft",
    instancesCount: tpl._count.instances,
  });
}
