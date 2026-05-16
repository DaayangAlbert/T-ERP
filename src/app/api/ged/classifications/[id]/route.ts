import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed, guardGedMutation } from "@/lib/rbac/ged-guard";
import { Confidentiality, DuaTrigger, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const cls = await prisma.documentClassification.findFirst({
    where: { id: params.id, tenantId },
    select: {
      id: true,
      prefix: true,
      code: true,
      name: true,
      category: true,
      dua: true,
      duaYears: true,
      duaTrigger: true,
      confidentiality: true,
      requiredValidators: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      workflow: { select: { id: true, code: true, name: true, description: true } },
    },
  });

  if (!cls) {
    return NextResponse.json({ error: "Classification introuvable" }, { status: 404 });
  }

  // Stats
  const [docsTotal, docsActive, docsByMonthRaw, recentDocs] = await Promise.all([
    prisma.document.count({ where: { tenantId, classificationId: cls.id } }),
    prisma.document.count({
      where: {
        tenantId,
        classificationId: cls.id,
        retentionRecord: { archivalStatus: { in: ["ACTIVE", "SEMI_ACTIVE"] } },
      },
    }),
    prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM documents
      WHERE "tenantId" = ${tenantId} AND "classificationId" = ${cls.id}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `,
    prisma.document.findMany({
      where: { tenantId, classificationId: cls.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        internalReference: true,
        sizeBytes: true,
        createdAt: true,
        space: { select: { name: true, icon: true } },
      },
    }),
  ]);

  const sizeAggregate = await prisma.document.aggregate({
    where: { tenantId, classificationId: cls.id },
    _sum: { sizeBytes: true },
  });

  return NextResponse.json({
    classification: {
      id: cls.id,
      prefix: cls.prefix,
      code: cls.code,
      name: cls.name,
      category: cls.category,
      dua: cls.dua,
      duaYears: cls.duaYears,
      duaTrigger: cls.duaTrigger,
      confidentiality: cls.confidentiality,
      requiredValidators: cls.requiredValidators,
      active: cls.active,
      createdAt: cls.createdAt.toISOString(),
      updatedAt: cls.updatedAt.toISOString(),
      workflow: cls.workflow ?? null,
    },
    stats: {
      documentsTotal: docsTotal,
      documentsActive: docsActive,
      volumeBytes: Number(sizeAggregate._sum.sizeBytes ?? 0n),
      monthlySeries: docsByMonthRaw
        .reverse()
        .map((r) => ({ month: r.month.toISOString().slice(0, 7), count: Number(r.count) })),
    },
    recentDocuments: recentDocs.map((d) => ({
      id: d.id,
      name: d.name,
      reference: d.internalReference,
      sizeBytes: Number(d.sizeBytes),
      createdAt: d.createdAt.toISOString(),
      spaceName: d.space?.name ?? null,
      spaceIcon: d.space?.icon ?? null,
    })),
  });
}

const patchSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  dua: z.string().min(1).max(60).optional(),
  duaYears: z.number().int().min(0).max(99).nullable().optional(),
  duaTrigger: z.nativeEnum(DuaTrigger).optional(),
  confidentiality: z.nativeEnum(Confidentiality).optional(),
  requiredValidators: z.array(z.string()).optional(),
  workflowCode: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Édition réservée à l'ARCHIVIST" }, { status: 403 });
  }

  const cls = await prisma.documentClassification.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Classification introuvable" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    let workflowId: string | null | undefined = undefined;
    if (data.workflowCode !== undefined) {
      if (data.workflowCode === null || data.workflowCode === "") {
        workflowId = null;
      } else {
        const wf = await prisma.documentWorkflowTemplate.findFirst({
          where: { tenantId, code: data.workflowCode },
          select: { id: true },
        });
        if (!wf) {
          return NextResponse.json({ error: "Workflow introuvable" }, { status: 400 });
        }
        workflowId = wf.id;
      }
    }

    await prisma.documentClassification.update({
      where: { id: params.id },
      data: {
        name: data.name,
        dua: data.dua,
        duaYears: data.duaYears,
        duaTrigger: data.duaTrigger,
        confidentiality: data.confidentiality,
        requiredValidators: data.requiredValidators,
        ...(workflowId !== undefined ? { workflowId } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
