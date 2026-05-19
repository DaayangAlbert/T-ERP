import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

// Rôles autorisés comme assignée d'étape de workflow (hors CANDIDATE,
// SUPER_ADMIN, TENANT_ADMIN qui sont techniques). On accepte aussi
// "EXTERNAL" comme valeur libre pour les approbations MOA/MOE/externes.
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

const createSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_-]+$/, "Format : MAJUSCULES, chiffres, tirets et underscores"),
  name: z.string().min(3).max(160),
  description: z.string().max(500).optional().nullable(),
  steps: z.array(stepSchema).min(1).max(10),
  /** Optionnel : ids des classifications à rattacher à ce template. */
  classificationIds: z.array(z.string().cuid()).optional(),
});

/**
 * GET /api/ged/workflows/templates
 *
 * Liste les templates du tenant (avec compteurs d'instances actives et
 * classifications rattachées). Accessible à tous les rôles GED en lecture.
 */
export async function GET() {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const templates = await prisma.documentWorkflowTemplate.findMany({
    where: { tenantId },
    orderBy: [{ active: "desc" }, { code: "asc" }],
    include: {
      _count: { select: { instances: true, classifications: true } },
    },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      steps: t.steps,
      active: t.active,
      instancesCount: t._count.instances,
      classificationsCount: t._count.classifications,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

/**
 * POST /api/ged/workflows/templates
 *
 * Crée un nouveau template. Réservé ARCHIVIST / TENANT_ADMIN.
 *
 * Body :
 *   {
 *     code: "WF-CCTP",
 *     name: "Validation CCTP marché public",
 *     description?: "...",
 *     steps: [
 *       { stepIndex: 0, name: "Revue technique", role: "TECH_DIRECTOR", slaHours: 48, mandatory: true },
 *       { stepIndex: 1, name: "Validation DAF", role: "DAF", slaHours: 72, mandatory: true }
 *     ],
 *     classificationIds?: ["clx...", "cly..."]  // classifications à rattacher
 *   }
 */
export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Vérifier que les stepIndex sont contigus depuis 0
  const sortedSteps = [...data.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  for (let i = 0; i < sortedSteps.length; i++) {
    if (sortedSteps[i].stepIndex !== i) {
      return NextResponse.json(
        { error: `stepIndex doit être contigu depuis 0 (manquant : ${i})` },
        { status: 400 },
      );
    }
  }

  // Vérifier l'unicité du code dans le tenant
  const existing = await prisma.documentWorkflowTemplate.findFirst({
    where: { tenantId, code: data.code },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Ce code est déjà utilisé" }, { status: 409 });
  }

  // Vérifier les classifications éventuelles (tenant scoping)
  if (data.classificationIds && data.classificationIds.length > 0) {
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

  const created = await prisma.$transaction(async (tx) => {
    const tpl = await tx.documentWorkflowTemplate.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        steps: sortedSteps as object,
        active: true,
      },
      select: { id: true, code: true, name: true },
    });

    if (data.classificationIds && data.classificationIds.length > 0) {
      await tx.documentClassification.updateMany({
        where: { id: { in: data.classificationIds }, tenantId },
        data: { workflowId: tpl.id },
      });
    }

    return tpl;
  });

  return NextResponse.json({ ok: true, template: created }, { status: 201 });
}
