import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sixtyDaysFromNow = new Date(Date.now() + 60 * 86_400_000);

  const items = await prisma.training.findMany({
    where: {
      tenantId: session.tenantId,
      status: "COMPLETED",
      expiresAt: { lte: sixtyDaysFromNow, gte: new Date() },
    },
    orderBy: { expiresAt: "asc" },
    include: { user: { select: { firstName: true, lastName: true, position: true } } },
  });

  return NextResponse.json({
    items: items.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      expiresAt: t.expiresAt!.toISOString(),
      daysLeft: Math.ceil((t.expiresAt!.getTime() - Date.now()) / 86_400_000),
      user: { name: `${t.user.firstName} ${t.user.lastName}`, position: t.user.position },
    })),
  });
}
