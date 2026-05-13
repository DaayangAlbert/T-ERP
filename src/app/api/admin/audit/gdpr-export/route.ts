import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  tenantId: z.string().min(1),
  justification: z.string().min(10).max(500),
});

export async function POST(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation (justification ≥10 chars)" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.data.tenantId },
    select: { id: true, slug: true, name: true },
  });
  if (!tenant)
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  // Stub : déclencher l'export GDPR (en prod : queue worker, génération
  // archive chiffrée AES-256, lien à durée limitée 1h)
  await logAdminAction({
    session,
    action: "GDPR_EXPORT",
    targetType: "Tenant",
    targetId: tenant.id,
    targetDescription: `Export GDPR ${tenant.name}`,
    tenantId: tenant.id,
    justification: parsed.data.justification,
  });

  return NextResponse.json({
    ok: true,
    message: "Export GDPR planifié — disponible sous 24h",
    tenantSlug: tenant.slug,
  });
}
