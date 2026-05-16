import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Notifications adressées à l'utilisateur courant. Toutes les notifs sont
 * scopées par userId, indépendamment du rôle ou du tenant — chacun voit
 * uniquement les siennes.
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const onlyUnread = url.searchParams.get("unread") === "1";
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.sub,
      ...(onlyUnread ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      read: true,
      readAt: true,
      createdAt: true,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.sub, read: false },
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
    unreadCount,
  });
}

/**
 * Marquer toutes comme lues.
 */
export async function POST() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.sub, read: false },
    data: { read: true, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
