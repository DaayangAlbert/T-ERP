import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  // En production, désactive l'endpoint : il est uniquement utilisé par
  // le ProfileSwitcher mode démo, qui est lui-même caché en prod. Laisser
  // cet endpoint ouvert exposerait la liste de tous les users d'un tenant
  // à n'importe quel user connecté (info leak).
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Indisponible en production" }, { status: 403 });
  }

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
