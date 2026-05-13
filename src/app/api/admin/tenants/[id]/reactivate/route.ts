import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant)
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  if (tenant.status !== "SUSPENDED") {
    return NextResponse.json(
      { error: "Tenant non suspendu" },
      { status: 400 },
    );
  }

  await prisma.tenant.update({
    where: { id: params.id },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
      suspensionReason: null,
    },
  });

  await logAdminAction({
    session,
    action: "TENANT_REACTIVATED",
    targetType: "Tenant",
    targetId: tenant.id,
    targetDescription: `${tenant.name} (${tenant.slug})`,
    tenantId: tenant.id,
    beforeState: { status: tenant.status, reason: tenant.suspensionReason },
    afterState: { status: "ACTIVE" },
  });

  return NextResponse.json({ ok: true });
}
