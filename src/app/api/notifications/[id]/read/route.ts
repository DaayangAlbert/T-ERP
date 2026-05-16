import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Marque une notification individuelle comme lue. L'utilisateur ne peut
 * toucher que ses propres notifications.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const n = await prisma.notification.findFirst({
    where: { id: params.id, userId: session.sub },
  });
  if (!n) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!n.read) {
    await prisma.notification.update({
      where: { id: n.id },
      data: { read: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
