import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * Liste TOUS les utilisateurs de la plateforme, tous tenants confondus,
 * y compris les chercheurs d'emploi (role CANDIDATE, tenantId null).
 * Réservé à la console plateforme (PlatformAdmin).
 */
export async function GET(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const q = url.searchParams.get("q")?.trim();
  const kind = url.searchParams.get("kind") ?? "all"; // all | employees | candidates
  const role = url.searchParams.get("role") as Role | null;
  const status = url.searchParams.get("status") as UserStatus | null;
  const tenantId = url.searchParams.get("tenantId"); // id précis, "none" (sans tenant), ou null

  const where: Record<string, unknown> = {};
  if (kind === "candidates") where.role = Role.CANDIDATE;
  else if (kind === "employees") where.role = { not: Role.CANDIDATE };
  if (role) where.role = role;
  if (status) where.status = status;
  if (tenantId === "none") where.tenantId = null;
  else if (tenantId) where.tenantId = tenantId;
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, users, employeesCount, candidatesCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        position: true,
        tenantId: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { role: { not: Role.CANDIDATE } } }),
    prisma.user.count({ where: { role: Role.CANDIDATE } }),
  ]);

  const tenantIds = Array.from(new Set(users.map((u) => u.tenantId).filter(Boolean))) as string[];
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, slug: true } })
    : [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      position: u.position,
      avatarUrl: u.avatarUrl,
      tenant: u.tenantId ? tenantById.get(u.tenantId) ?? null : null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    summary: { employees: employeesCount, candidates: candidatesCount, total: employeesCount + candidatesCount },
  });
}
