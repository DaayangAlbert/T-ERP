import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendMessageSchema } from "@/schemas/messaging";

export const dynamic = "force-dynamic";

async function assertParticipant(conversationId: string, userId: string) {
  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return participation;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const participation = await assertParticipant(params.id, session.sub);
  if (!participation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const before = url.searchParams.get("before"); // ISO timestamp for pagination

  const messages = await prisma.message.findMany({
    where: {
      conversationId: params.id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      content: true,
      attachmentUrl: true,
      attachmentName: true,
      attachmentSize: true,
      isSystem: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
      },
    },
  });

  // Mark as read
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({
    items: messages
      .reverse()
      .map((m) => ({
        id: m.id,
        content: m.content,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentSize: m.attachmentSize,
        isSystem: m.isSystem,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        sender: m.sender,
        isMe: m.senderId === session.sub,
      })),
    currentUserId: session.sub,
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const participation = await assertParticipant(params.id, session.sub);
  if (!participation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  try {
    const { content } = sendMessageSchema.parse(await req.json());

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: params.id,
          senderId: session.sub,
          content,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
          },
        },
      });
      await tx.conversation.update({
        where: { id: params.id },
        data: { lastMessageAt: message.createdAt },
      });
      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: { conversationId: params.id, userId: session.sub },
        },
        data: { lastReadAt: message.createdAt },
      });
      return message;
    });

    return NextResponse.json(
      {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        senderId: created.senderId,
        sender: created.sender,
        isMe: true,
        isSystem: false,
        attachmentUrl: null,
        attachmentName: null,
        attachmentSize: null,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/conversations/:id/messages]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
