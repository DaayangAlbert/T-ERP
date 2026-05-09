import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { active?: boolean };
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) requis" }, { status: 400 });
  }

  const d = await prisma.delegation.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!d) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.delegation.update({
    where: { id: d.id },
    data: { active: body.active },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const d = await prisma.delegation.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!d) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.delegation.delete({ where: { id: d.id } });
  return NextResponse.json({ ok: true });
}
