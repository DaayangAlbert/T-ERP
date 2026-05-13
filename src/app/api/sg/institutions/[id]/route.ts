import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { InstitutionCategory, InstitutionType, RelationshipStatus } from "@prisma/client";
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

  const i = await prisma.institution.findFirst({
    where: { id: params.id, tenantId },
  });
  if (!i) {
    return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });
  }

  // Reconstruction historique relations à partir des données existantes
  const [contracts, cases, correspondences] = await Promise.all([
    prisma.clientContract.findMany({
      where: { tenantId, contractingAuthority: { contains: i.name.split(" — ")[0] } },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, reference: true, title: true, amountHT: true, phase: true, signatureDate: true },
    }),
    prisma.legalCase.findMany({
      where: { tenantId, opposingParty: { contains: i.name.split(" — ")[0] } },
      take: 5,
      orderBy: { openedAt: "desc" },
      select: { id: true, reference: true, title: true, status: true, amountAtStake: true },
    }),
    prisma.officialCorrespondence.findMany({
      where: {
        tenantId,
        OR: [
          { correspondentEntity: { contains: i.name.split(" — ")[0] } },
          { correspondentName: { contains: i.name.split(" — ")[0] } },
        ],
      },
      take: 10,
      orderBy: { date: "desc" },
      select: { id: true, reference: true, subject: true, direction: true, date: true, status: true },
    }),
  ]);

  return NextResponse.json({
    id: i.id,
    name: i.name,
    type: i.type,
    category: i.category,
    primaryContactName: i.primaryContactName,
    primaryContactRole: i.primaryContactRole,
    primaryContactPhone: i.primaryContactPhone,
    primaryContactEmail: i.primaryContactEmail,
    address: i.address,
    website: i.website,
    relationshipStatus: i.relationshipStatus,
    relationshipNotes: i.relationshipNotes,
    history: {
      contracts: contracts.map((c) => ({
        id: c.id,
        reference: c.reference,
        title: c.title,
        amountHT: Number(c.amountHT),
        phase: c.phase,
        signatureDate: c.signatureDate?.toISOString() ?? null,
      })),
      cases: cases.map((cs) => ({
        id: cs.id,
        reference: cs.reference,
        title: cs.title,
        status: cs.status,
        amountAtStake: Number(cs.amountAtStake),
      })),
      correspondences: correspondences.map((c) => ({
        id: c.id,
        reference: c.reference,
        subject: c.subject,
        direction: c.direction,
        date: c.date.toISOString(),
        status: c.status,
      })),
    },
  });
}

const PatchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  type: z.nativeEnum(InstitutionType).optional(),
  category: z.nativeEnum(InstitutionCategory).optional(),
  primaryContactName: z.string().max(200).optional().nullable(),
  primaryContactRole: z.string().max(120).optional().nullable(),
  primaryContactPhone: z.string().max(40).optional().nullable(),
  primaryContactEmail: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  relationshipStatus: z.nativeEnum(RelationshipStatus).optional(),
  relationshipNotes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await guardSg("canManageCorporateGovernance");
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

  const existing = await prisma.institution.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });
  }

  // Normalize "" to null pour email/website
  const data: any = { ...parsed.data };
  if (data.primaryContactEmail === "") data.primaryContactEmail = null;
  if (data.website === "") data.website = null;

  await prisma.institution.update({ where: { id: existing.id }, data });
  return NextResponse.json({ ok: true });
}
