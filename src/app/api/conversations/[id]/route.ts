/**
 * Réglages d'une conversation pour l'utilisateur courant (participant) :
 * couper/réactiver le son (isMuted) et épingler/désépingler (isPinned).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isMuted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
  });
  if (!participation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { isMuted, isPinned } = parsed.data;

  const updated = await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
    data: {
      ...(isMuted !== undefined && { isMuted }),
      ...(isPinned !== undefined && { isPinned }),
    },
    select: { isMuted: true, isPinned: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}
