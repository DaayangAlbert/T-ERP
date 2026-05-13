import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant)
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  if (tenant.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Tenant déjà suspendu" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Raison requise (5 chars min)" }, { status: 400 });
  }

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: parsed.data.reason,
    },
  });

  await logAdminAction({
    session,
    action: "TENANT_SUSPENDED",
    targetType: "Tenant",
    targetId: tenant.id,
    targetDescription: `${tenant.name} (${tenant.slug})`,
    tenantId: tenant.id,
    justification: parsed.data.reason,
    beforeState: { status: tenant.status },
    afterState: { status: updated.status, reason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
