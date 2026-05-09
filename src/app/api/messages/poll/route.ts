import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createPollSchema } from "@/schemas/messaging";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createPollSchema.parse(await req.json());

    // Vérifier que l'utilisateur est dans la conversation
    const part = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: session.sub } },
    });
    if (!part) return NextResponse.json({ error: "Vous n'êtes pas membre de cette conversation" }, { status: 403 });

    const pollData = {
      question: data.question,
      options: data.options.map((label) => ({ label, votes: [] as string[] })),
    };

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: session.sub,
        content: `📊 Sondage : ${data.question}`,
        pollData: pollData as object,
      },
    });

    return NextResponse.json({ id: message.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
