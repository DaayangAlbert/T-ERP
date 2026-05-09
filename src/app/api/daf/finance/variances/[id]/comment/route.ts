import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.TENANT_ADMIN];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { comment?: string };
  const comment = (body.comment ?? "").trim();
  if (!comment) return NextResponse.json({ error: "Commentaire requis" }, { status: 400 });

  const existing = await prisma.budgetVariance.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Écart introuvable" }, { status: 404 });

  await prisma.budgetVariance.update({
    where: { id: params.id },
    data: {
      comment,
      commentAuthor: session.sub,
      commentAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
