import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N1 RH" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "Motif obligatoire" }, { status: 400 });

  const lr = await prisma.leaveRequest.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  await prisma.leaveRequest.update({
    where: { id: lr.id },
    data: { status: "REJECTED", rejectionReason: reason, rhValidatedBy: session.sub, rhValidatedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
