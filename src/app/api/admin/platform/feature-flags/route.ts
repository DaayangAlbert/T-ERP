import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  tenantId: z.string().min(1),
  flagKey: z.string().min(1).max(80),
  enabled: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  const d = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { id: d.tenantId },
    select: { id: true, slug: true, name: true },
  });
  if (!tenant)
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const flag = await prisma.tenantFeatureFlag.upsert({
    where: { tenantId_flagKey: { tenantId: d.tenantId, flagKey: d.flagKey } },
    create: {
      tenantId: d.tenantId,
      flagKey: d.flagKey,
      enabled: d.enabled,
      enabledBy: session.email,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    },
    update: {
      enabled: d.enabled,
      enabledBy: session.email,
      enabledAt: new Date(),
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    },
  });

  await logAdminAction({
    session,
    action: "FEATURE_FLAG_TOGGLED",
    targetType: "TenantFeatureFlag",
    targetId: flag.id,
    targetDescription: `${d.flagKey} → ${d.enabled ? "ON" : "OFF"} (${tenant.slug})`,
    tenantId: d.tenantId,
    afterState: { flagKey: d.flagKey, enabled: d.enabled },
  });

  return NextResponse.json({ ok: true, flag });
}

export async function DELETE(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const flag = await prisma.tenantFeatureFlag.findUnique({
    where: { id },
  });
  if (!flag)
    return NextResponse.json({ error: "Flag introuvable" }, { status: 404 });

  await prisma.tenantFeatureFlag.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "FEATURE_FLAG_TOGGLED",
    targetType: "TenantFeatureFlag",
    targetId: flag.id,
    targetDescription: `${flag.flagKey} supprimé`,
    tenantId: flag.tenantId,
    beforeState: { flagKey: flag.flagKey, enabled: flag.enabled },
  });
  return NextResponse.json({ ok: true });
}
