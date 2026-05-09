import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updatePrioritySchema } from "@/schemas/messaging";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updatePrioritySchema.parse(await req.json());

    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        conversation: { tenantId: session.tenantId, participants: { some: { userId: session.sub } } },
      },
      include: { conversation: { select: { participants: { select: { userId: true } } } } },
    });
    if (!message) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.message.update({
      where: { id: message.id },
      data: { priority: data.priority },
    });

    // Notification push pour priorité HIGH/URGENT
    if (data.priority === "HIGH" || data.priority === "URGENT") {
      const others = message.conversation.participants
        .filter((p) => p.userId !== session.sub)
        .map((p) => p.userId);
      for (const userId of others) {
        await prisma.notification.create({
          data: {
            userId,
            type: "message_priority",
            title: data.priority === "URGENT" ? "Message URGENT" : "Message important",
            body: message.content.slice(0, 120),
            link: `/messagerie?conversation=${message.conversationId}`,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
