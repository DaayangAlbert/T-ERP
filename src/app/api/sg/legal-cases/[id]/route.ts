import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import { LegalCaseStatus, LegalPosition } from "@prisma/client";
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

  const c = await prisma.legalCase.findFirst({
    where: { id: params.id, tenantId },
    include: {
      events: { orderBy: { eventDate: "desc" } },
      relatedContract: {
        select: { id: true, reference: true, title: true, contractingAuthority: true },
      },
    },
  });
  if (!c) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    id: c.id,
    reference: c.reference,
    title: c.title,
    description: c.description,
    ourPosition: c.ourPosition,
    jurisdiction: c.jurisdiction,
    caseNumber: c.caseNumber,
    opposingParty: c.opposingParty,
    opposingPartyType: c.opposingPartyType,
    amountAtStake: Number(c.amountAtStake),
    provisionAmount: Number(c.provisionAmount),
    lawyerName: c.lawyerName,
    lawFirm: c.lawFirm,
    lawyerContactInfo: c.lawyerContactInfo,
    status: c.status,
    nextHearingDate: c.nextHearingDate?.toISOString() ?? null,
    strategy: c.strategy,
    openedAt: c.openedAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
    resolution: c.resolution,
    relatedContract: c.relatedContract,
    events: c.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate.toISOString(),
      description: e.description,
      documentUrl: e.documentUrl,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

const PatchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  ourPosition: z.nativeEnum(LegalPosition).optional(),
  jurisdiction: z.string().min(2).max(120).optional(),
  caseNumber: z.string().max(120).optional().nullable(),
  opposingParty: z.string().min(2).max(200).optional(),
  status: z.nativeEnum(LegalCaseStatus).optional(),
  nextHearingDate: z.string().datetime().nullable().optional(),
  strategy: z.string().max(2000).optional().nullable(),
  lawyerName: z.string().min(2).max(120).optional(),
  lawFirm: z.string().min(2).max(120).optional(),
  lawyerContactInfo: z.any().optional(),
});

export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await guardSgMutation("canManageLegalCases");
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

  const existing = await prisma.legalCase.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  const data: any = { ...parsed.data };
  if (parsed.data.nextHearingDate !== undefined) {
    data.nextHearingDate = parsed.data.nextHearingDate ? new Date(parsed.data.nextHearingDate) : null;
  }

  await prisma.legalCase.update({ where: { id: existing.id }, data });

  // Si statut a changé → log événement automatique
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.legalCaseEvent.create({
      data: {
        caseId: existing.id,
        eventType: "STATUS_CHANGE",
        eventDate: new Date(),
        description: `Statut : ${existing.status} → ${parsed.data.status}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
