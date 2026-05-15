import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import { InstitutionCategory, InstitutionType, RelationshipStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as InstitutionType | null;
  const category = url.searchParams.get("category") as InstitutionCategory | null;
  const status = url.searchParams.get("status") as RelationshipStatus | null;
  const q = url.searchParams.get("q")?.trim();

  const where: any = { tenantId };
  if (type) where.type = type;
  if (category) where.category = category;
  if (status) where.relationshipStatus = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { primaryContactName: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.institution.findMany({
    where,
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      category: true,
      primaryContactName: true,
      primaryContactRole: true,
      primaryContactPhone: true,
      primaryContactEmail: true,
      relationshipStatus: true,
      relationshipNotes: true,
      website: true,
    },
  });

  const allForCounts = type || category || status || q
    ? await prisma.institution.findMany({
        where: { tenantId },
        select: { type: true, category: true, relationshipStatus: true },
      })
    : items.map((i) => ({ type: i.type, category: i.category, relationshipStatus: i.relationshipStatus }));

  const counts = {
    total: allForCounts.length,
    ministries: allForCounts.filter((i) => i.type === InstitutionType.MINISTRY).length,
    municipalities: allForCounts.filter((i) => i.type === InstitutionType.MUNICIPALITY).length,
    associations: allForCounts.filter((i) => i.type === InstitutionType.PROFESSIONAL_ASSOCIATION).length,
    partners: allForCounts.filter((i) => i.category === InstitutionCategory.PARTNER).length,
    sensitive: allForCounts.filter((i) => i.relationshipStatus === RelationshipStatus.SENSITIVE).length,
  };

  return NextResponse.json({ items, counts });
}

const CreateInstitutionSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.nativeEnum(InstitutionType),
  category: z.nativeEnum(InstitutionCategory),
  primaryContactName: z.string().max(200).optional(),
  primaryContactRole: z.string().max(120).optional(),
  primaryContactPhone: z.string().max(40).optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  website: z.string().url().optional().or(z.literal("")),
  relationshipStatus: z.nativeEnum(RelationshipStatus).default(RelationshipStatus.ACTIVE),
  relationshipNotes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = CreateInstitutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.institution.create({
    data: {
      tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      category: parsed.data.category,
      primaryContactName: parsed.data.primaryContactName ?? null,
      primaryContactRole: parsed.data.primaryContactRole ?? null,
      primaryContactPhone: parsed.data.primaryContactPhone ?? null,
      primaryContactEmail: parsed.data.primaryContactEmail || null,
      address: parsed.data.address ?? null,
      website: parsed.data.website || null,
      relationshipStatus: parsed.data.relationshipStatus,
      relationshipNotes: parsed.data.relationshipNotes ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
