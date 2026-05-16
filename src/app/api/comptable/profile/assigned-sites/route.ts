import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, assignedSiteIds: true },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const sites = user.assignedSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: user.assignedSiteIds } },
        select: { id: true, code: true, name: true, client: true },
      })
    : [];

  return NextResponse.json({
    isDirection: user.assignedSiteIds.length === 0,
    sites,
    role: user.role,
  });
}
