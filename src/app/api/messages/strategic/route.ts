import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.conversation.findMany({
    where: {
      tenantId: session.tenantId,
      isStrategic: true,
      participants: { some: { userId: session.sub } },
    },
    orderBy: [{ pinnedAt: "desc" }, { lastMessageAt: "desc" }],
    include: {
      participants: {
        select: { userId: true, user: { select: { firstName: true, lastName: true, role: true } } },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, senderId: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      isStrategic: c.isStrategic,
      pinnedAt: c.pinnedAt?.toISOString() ?? null,
      participants: c.participants.map((p) => ({ userId: p.userId, name: `${p.user.firstName} ${p.user.lastName}`, role: p.user.role })),
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    })),
  });
}
