import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: session.tenantId ? { tenantId: session.tenantId } : { tenantId: null },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      email: true,
      position: true,
      avatarUrl: true,
    },
    take: 30,
  });

  return NextResponse.json({ users, currentUserId: session.sub });
}
