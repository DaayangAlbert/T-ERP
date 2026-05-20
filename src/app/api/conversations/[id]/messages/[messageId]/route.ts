/**
 * Suppression d'un message "pour tout le monde" (style WhatsApp).
 *
 * Seul l'expéditeur peut supprimer son propre message. On garde la ligne en
 * tombstone (deletedAt) en vidant le contenu et la pièce jointe, et on supprime
 * le fichier sur disque + l'éventuelle note vocale. Le message disparaît alors
 * pour tous les participants (l'API ne renvoie plus son contenu).
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { uploadDiskPath } from "@/lib/upload-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; messageId: string } },
) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
  });
  if (!participation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const message = await prisma.message.findFirst({
    where: { id: params.messageId, conversationId: params.id },
    select: { id: true, senderId: true, attachmentUrl: true, deletedAt: true },
  });
  if (!message) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }
  if (message.senderId !== session.sub) {
    return NextResponse.json(
      { error: "Vous ne pouvez supprimer que vos propres messages." },
      { status: 403 },
    );
  }
  if (message.deletedAt) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  // Supprime le fichier joint du disque (best-effort).
  if (message.attachmentUrl?.startsWith("/uploads/")) {
    const diskPath = uploadDiskPath(...message.attachmentUrl.slice("/uploads/".length).split("/"));
    await fs.unlink(diskPath).catch(() => {
      /* fichier déjà absent — on ignore */
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.voiceNote.deleteMany({ where: { messageId: message.id } });
    await tx.message.update({
      where: { id: message.id },
      data: {
        deletedAt: new Date(),
        content: "",
        attachmentUrl: null,
        attachmentName: null,
        attachmentSize: null,
        attachmentType: null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
