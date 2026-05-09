import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { TenantStatus, type Role } from "@prisma/client";

const patchSchema = z.object({
  status: z.nativeEnum(TenantStatus).optional(),
  plan: z
    .enum(["STARTER", "STANDARD", "BUSINESS", "ENTERPRISE"])
    .optional(),
});

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!isSuperAdmin(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au super-admin" }, { status: 403 });
  }

  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.plan !== undefined && { plan: body.plan }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    status: updated.status,
    plan: updated.plan,
  });
}
