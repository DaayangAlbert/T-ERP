import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createConversationSchema } from "@/schemas/messaging";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [] });

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: session.sub },
    select: {
      conversationId: true,
      lastReadAt: true,
      isPinned: true,
      isMuted: true,
      conversation: {
        select: {
          id: true,
          name: true,
          isGroup: true,
          avatarUrl: true,
          lastMessageAt: true,
          tenantId: true,
          participants: {
            where: { userId: { not: session.sub } },
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatarUrl: true,
                },
              },
            },
            take: 6,
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              senderId: true,
              sender: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  const tenantConversations = memberships.filter(
    (m) => m.conversation && m.conversation.tenantId === session.tenantId
  );

  const items = await Promise.all(
    tenantConversations.map(async (m) => {
      const conv = m.conversation;
      const unread = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: session.sub },
          ...(m.lastReadAt
            ? { createdAt: { gt: m.lastReadAt } }
            : {}),
        },
      });

      const last = conv.messages[0];
      const otherUsers = conv.participants.map((p) => p.user);
      const headline =
        conv.name ||
        otherUsers
          .slice(0, 2)
          .map((u) => `${u.firstName} ${u.lastName}`)
          .join(", ") ||
        "Conversation";

      return {
        id: conv.id,
        name: headline,
        isGroup: conv.isGroup,
        avatarUrl: conv.avatarUrl,
        otherUsers,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
              senderName: `${last.sender.firstName} ${last.sender.lastName}`,
              isMe: last.senderId === session.sub,
            }
          : null,
        lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
        unread,
        isPinned: m.isPinned,
        isMuted: m.isMuted,
      };
    })
  );

  items.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });

  try {
    const data = createConversationSchema.parse(await req.json());

    // Validate that all participants belong to the same tenant
    const participants = await prisma.user.findMany({
      where: { id: { in: data.participantIds }, tenantId: session.tenantId },
      select: { id: true },
    });
    if (participants.length !== data.participantIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs participants invalides pour ce tenant" },
        { status: 400 }
      );
    }

    const memberIds = Array.from(new Set([...data.participantIds, session.sub]));

    // For 1-1, return existing conversation if it already exists.
    if (!data.isGroup && memberIds.length === 2) {
      const [a, b] = memberIds;
      const existing = await prisma.conversation.findFirst({
        where: {
          tenantId: session.tenantId,
          isGroup: false,
          AND: [
            { participants: { some: { userId: a } } },
            { participants: { some: { userId: b } } },
          ],
        },
      });
      if (existing) return NextResponse.json({ id: existing.id, existing: true }, { status: 200 });
    }

    const created = await prisma.conversation.create({
      data: {
        tenantId: session.tenantId,
        name: data.name ?? null,
        isGroup: data.isGroup || memberIds.length > 2,
        participants: {
          create: memberIds.map((userId) => ({ userId })),
        },
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/conversations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
