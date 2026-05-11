import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const delegations = await prisma.delegation.findMany({
    where: { tenantId: session.tenantId, fromUserId: session.sub },
    include: {
      toUser: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({
    items: delegations.map((d) => ({
      id: d.id,
      toUser: `${d.toUser.firstName} ${d.toUser.lastName}`,
      toUserRole: d.toUser.role,
      types: d.types,
      maxAmount: d.maxAmount ? Number(d.maxAmount) : null,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate?.toISOString() ?? null,
      active: d.active,
      reason: d.reason,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.toUserId || !body.startDate || !body.endDate || !body.reason) {
    return NextResponse.json({ error: "Champs requis : toUserId, startDate, endDate, reason" }, { status: 400 });
  }

  const delegation = await prisma.delegation.create({
    data: {
      tenantId: session.tenantId,
      fromUserId: session.sub,
      toUserId: body.toUserId,
      types: (body.types ?? ["AMENDMENT", "SUBCONTRACTING", "EQUIPMENT", "SPECIAL_METHOD", "TECHNICAL_HANDOVER"]) as ValidationType[],
      maxAmount: body.maxAmount ? BigInt(body.maxAmount) : null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      active: true,
      reason: body.reason,
    },
  });

  return NextResponse.json({ id: delegation.id }, { status: 201 });
}
