import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.message.findMany({
    where: {
      conversation: { tenantId: session.tenantId, participants: { some: { userId: session.sub } } },
      priority: { in: ["HIGH", "URGENT"] },
      senderId: { not: session.sub },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      sender: { select: { firstName: true, lastName: true, role: true } },
      conversation: { select: { id: true, name: true, isStrategic: true } },
    },
  });

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      content: m.content,
      sender: `${m.sender.firstName} ${m.sender.lastName}`,
      senderRole: m.sender.role,
      conversation: m.conversation,
      priority: m.priority,
      createdAt: m.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      urgent: items.filter((m) => m.priority === "URGENT").length,
      high: items.filter((m) => m.priority === "HIGH").length,
    },
  });
}
