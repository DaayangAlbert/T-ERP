import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const PAGE_SIZE = 30;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const direction = url.searchParams.get("direction"); // INBOUND | OUTBOUND

  const where: Record<string, unknown> = { bankAccount: { id: params.id, tenantId: session.tenantId } };
  if (direction) where.direction = direction;

  const [total, items] = await Promise.all([
    prisma.bankMovement.count({ where }),
    prisma.bankMovement.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      direction: m.direction,
      amount: m.amount.toString(),
      label: m.label,
      reference: m.reference,
      counterparty: m.counterparty,
      siteId: m.siteId,
      occurredAt: m.occurredAt.toISOString(),
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
