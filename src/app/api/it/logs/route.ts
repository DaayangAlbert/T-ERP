import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { LogLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const guard = await guardIt("canViewTechnicalLogs");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const level = url.searchParams.get("level") as LogLevel | null;
  const service = url.searchParams.get("service");
  const search = url.searchParams.get("search")?.trim();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (level) where.level = level;
  if (service) where.service = service;
  if (search) where.message = { contains: search, mode: "insensitive" };
  if (from || to) {
    where.timestamp = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.technicalLog.count({ where }),
    prisma.technicalLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      level: l.level,
      service: l.service,
      message: l.message,
      details: l.details,
      ipAddress: l.ipAddress,
      user: l.user,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  });
}
