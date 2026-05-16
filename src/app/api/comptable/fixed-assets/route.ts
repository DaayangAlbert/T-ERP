import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, AssetCategory, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const createSchema = z.object({
  code: z.string().min(2),
  description: z.string().min(2),
  category: z.nativeEnum(AssetCategory),
  acquisitionDate: z.string(),
  grossValue: z.coerce.number().positive(),
  usefulLifeMonths: z.coerce.number().int().positive(),
  siteId: z.string().nullable().optional(),
});

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowed !== null) where.siteId = { in: allowed };

  const assets = await prisma.fixedAsset.findMany({
    where,
    orderBy: { acquisitionDate: "desc" },
  });

  const totalGross = assets.reduce((s, a) => s + Number(a.grossValue), 0);
  const totalDepreciation = assets.reduce((s, a) => s + Number(a.accumulatedDepreciation), 0);
  const totalNet = assets.reduce((s, a) => s + Number(a.netValue), 0);

  return NextResponse.json({
    items: assets.map((a) => ({
      id: a.id,
      code: a.code,
      description: a.description,
      category: a.category,
      acquisitionDate: a.acquisitionDate.toISOString(),
      grossValue: Number(a.grossValue),
      accumulatedDepreciation: Number(a.accumulatedDepreciation),
      netValue: Number(a.netValue),
      usefulLifeMonths: a.usefulLifeMonths,
      siteId: a.siteId,
      condition: a.condition,
    })),
    totals: { gross: totalGross, depreciation: totalDepreciation, net: totalNet },
    scope: { isDirection: allowed === null },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  if (parsed.data.siteId && !isSiteAllowed(allowed, parsed.data.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  const created = await prisma.fixedAsset.create({
    data: {
      tenantId: session.tenantId,
      code: parsed.data.code,
      description: parsed.data.description,
      category: parsed.data.category,
      acquisitionDate: new Date(parsed.data.acquisitionDate),
      grossValue: BigInt(Math.round(parsed.data.grossValue)),
      accumulatedDepreciation: BigInt(0),
      netValue: BigInt(Math.round(parsed.data.grossValue)),
      usefulLifeMonths: parsed.data.usefulLifeMonths,
      siteId: parsed.data.siteId ?? null,
      condition: "GOOD",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "fixed-asset.create",
      entityType: "FixedAsset",
      entityId: created.id,
      metadata: { code: parsed.data.code, gross: parsed.data.grossValue },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
