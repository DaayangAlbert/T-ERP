import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.SITE_MANAGER, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé CDT/CC" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    reportContent?: string;
    reservations?: number;
  };

  const v = await prisma.externalVisit.findFirst({
    where: { id: params.id, site: { tenantId: session.tenantId } },
  });
  if (!v) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });

  await prisma.externalVisit.update({
    where: { id: v.id },
    data: {
      reportContent: body.reportContent ?? "",
      reservations: body.reservations ?? 0,
      completedAt: new Date(),
      status: "REPORTED",
    },
  });

  return NextResponse.json({ ok: true });
}
