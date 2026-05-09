import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createVoiceNoteSchema } from "@/schemas/messaging";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createVoiceNoteSchema.parse(await req.json());

    const part = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: session.sub } },
    });
    if (!part) return NextResponse.json({ error: "Vous n'êtes pas membre" }, { status: 403 });

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: session.sub,
        content: `🎙️ Note vocale (${data.durationSec}s)`,
      },
    });

    await prisma.voiceNote.create({
      data: {
        messageId: message.id,
        audioUrl: data.audioUrl,
        durationSec: data.durationSec,
        transcript: data.transcript,
      },
    });

    return NextResponse.json({ messageId: message.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
