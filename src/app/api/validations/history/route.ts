import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const search = url.searchParams.get("q")?.trim();
  const type = url.searchParams.get("type") as ValidationType | null;
  const status = url.searchParams.get("status") as ValidationStatus | null;
  const sinceParam = url.searchParams.get("since"); // YYYY-MM-DD

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
    status: { in: [ValidationStatus.APPROVED, ValidationStatus.REJECTED, ValidationStatus.EXPIRED, ValidationStatus.WITHDRAWN] },
  };
  if (status) where.status = status;
  if (type) where.type = type;
  if (sinceParam) where.decisionAt = { gte: new Date(sinceParam) };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.validation.count({ where }),
    prisma.validation.findMany({
      where,
      orderBy: { decisionAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        initiator: { select: { firstName: true, lastName: true } },
        decidedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      amount: v.amount?.toString() ?? null,
      status: v.status,
      initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
      decidedBy: v.decidedBy ? `${v.decidedBy.firstName} ${v.decidedBy.lastName}` : null,
      decisionAt: v.decisionAt?.toISOString() ?? null,
      decisionReason: v.decisionReason,
      createdAt: v.createdAt.toISOString(),
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
