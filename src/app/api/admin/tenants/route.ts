import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!isSuperAdmin(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au super-admin" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      taxId: true,
      cnpsId: true,
      plan: true,
      status: true,
      primaryColor: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, sites: true } },
    },
  });

  return NextResponse.json({
    items: tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      taxId: t.taxId,
      cnpsId: t.cnpsId,
      plan: t.plan,
      status: t.status,
      primaryColor: t.primaryColor,
      usersCount: t._count.users,
      sitesCount: t._count.sites,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    total: tenants.length,
  });
}
