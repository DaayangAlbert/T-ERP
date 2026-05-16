import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { Role, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const [outgoing, incoming, history] = await Promise.all([
    prisma.delegation.findMany({
      where: { tenantId: session.tenantId, fromUserId: session.sub, active: true },
      include: { toUser: { select: { firstName: true, lastName: true, position: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delegation.findMany({
      where: { tenantId: session.tenantId, toUserId: session.sub, active: true },
      include: { fromUser: { select: { firstName: true, lastName: true, position: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delegation.findMany({
      where: { tenantId: session.tenantId, OR: [{ fromUserId: session.sub }, { toUserId: session.sub }], active: false },
      include: {
        fromUser: { select: { firstName: true, lastName: true } },
        toUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const fmt = (d: Date | null) => (d ? d.toISOString() : null);

  return NextResponse.json({
    outgoing: outgoing.map((d) => ({
      id: d.id,
      to: `${d.toUser.firstName} ${d.toUser.lastName}`,
      toPosition: d.toUser.position,
      types: d.types,
      maxAmount: d.maxAmount?.toString() ?? null,
      startDate: fmt(d.startDate),
      endDate: fmt(d.endDate),
      reason: d.reason,
    })),
    incoming: incoming.map((d) => ({
      id: d.id,
      from: `${d.fromUser.firstName} ${d.fromUser.lastName}`,
      fromPosition: d.fromUser.position,
      types: d.types,
      maxAmount: d.maxAmount?.toString() ?? null,
      startDate: fmt(d.startDate),
      endDate: fmt(d.endDate),
      reason: d.reason,
    })),
    history: history.map((d) => ({
      id: d.id,
      from: `${d.fromUser.firstName} ${d.fromUser.lastName}`,
      to: `${d.toUser.firstName} ${d.toUser.lastName}`,
      types: d.types,
      maxAmount: d.maxAmount?.toString() ?? null,
      startDate: fmt(d.startDate),
      endDate: fmt(d.endDate),
      reason: d.reason,
      endedAt: fmt(d.updatedAt),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    toUserId?: string;
    types?: ValidationType[];
    maxAmount?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!body.toUserId) return NextResponse.json({ error: "Délégataire requis" }, { status: 400 });
  if (!body.types || body.types.length === 0) return NextResponse.json({ error: "Types requis" }, { status: 400 });
  if (!body.startDate) return NextResponse.json({ error: "Date début requise" }, { status: 400 });

  const created = await prisma.delegation.create({
    data: {
      tenantId: session.tenantId,
      fromUserId: session.sub,
      toUserId: body.toUserId,
      types: body.types,
      maxAmount: body.maxAmount ? BigInt(body.maxAmount) : null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      reason: body.reason ?? null,
      active: true,
    },
  });

  return NextResponse.json({ id: created.id, ok: true });
}
