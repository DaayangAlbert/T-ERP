import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { CorrespondenceConfidentiality, CorrespondenceStatus, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
  if (!c) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }

  // Reconstruction timeline workflow
  const timeline: Array<{ at: string; label: string; actor?: string }> = [];
  timeline.push({ at: c.createdAt.toISOString(), label: "Enregistré au registre" });
  if (c.submittedToDgAt) {
    timeline.push({ at: c.submittedToDgAt.toISOString(), label: "Soumis à signature DG" });
  }
  if (c.signedByDgAt) {
    timeline.push({ at: c.signedByDgAt.toISOString(), label: "Signé par DG" });
  }
  if (c.handledAt) {
    timeline.push({ at: c.handledAt.toISOString(), label: "Traité" });
  }
  if (c.archivedInGedAt) {
    timeline.push({ at: c.archivedInGedAt.toISOString(), label: "Archivé en GED" });
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at));

  return NextResponse.json({
    id: c.id,
    reference: c.reference,
    direction: c.direction,
    date: c.date.toISOString(),
    correspondentName: c.correspondentName,
    correspondentEntity: c.correspondentEntity,
    subject: c.subject,
    summary: c.summary,
    confidentiality: c.confidentiality,
    status: c.status,
    dueDate: c.dueDate?.toISOString() ?? null,
    handledAt: c.handledAt?.toISOString() ?? null,
    requiresDgSignature: c.requiresDgSignature,
    submittedToDgAt: c.submittedToDgAt?.toISOString() ?? null,
    signedByDgAt: c.signedByDgAt?.toISOString() ?? null,
    dgSignatureRef: c.dgSignatureRef,
    documentUrl: c.documentUrl,
    archivedInGedAt: c.archivedInGedAt?.toISOString() ?? null,
    assignedTo: c.assignedTo
      ? { id: c.assignedTo.id, fullName: `${c.assignedTo.firstName} ${c.assignedTo.lastName}`, role: c.assignedTo.role }
      : null,
    timeline,
  });
}

const PatchSchema = z.object({
  subject: z.string().min(3).max(200).optional(),
  summary: z.string().max(2000).optional().nullable(),
  confidentiality: z.nativeEnum(CorrespondenceConfidentiality).optional(),
  documentUrl: z.string().url().optional().nullable(),
  requiresDgSignature: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assignedToRole: z.nativeEnum(Role).optional().nullable(),
  status: z.nativeEnum(CorrespondenceStatus).optional(),
});

export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await guardSg("canManageOfficialCorrespondence");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }

  const data: any = { ...parsed.data };
  delete data.assignedToRole;
  if (parsed.data.dueDate !== undefined) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.assignedToRole !== undefined) {
    if (parsed.data.assignedToRole === null) {
      data.assignedToUserId = null;
    } else {
      const u = await prisma.user.findFirst({
        where: { tenantId, role: parsed.data.assignedToRole, status: "ACTIVE" },
        select: { id: true },
      });
      data.assignedToUserId = u?.id ?? null;
    }
  }

  await prisma.officialCorrespondence.update({ where: { id: existing.id }, data });
  return NextResponse.json({ ok: true });
}
