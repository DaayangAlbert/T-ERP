/**
 * Upload d'une pièce jointe (image, document, audio) dans une conversation.
 *
 * Multipart POST avec :
 *   - `file`    : fichier binaire (image, PDF, doc, audio webm/mp3/ogg)
 *   - `content` : optionnel — texte d'accompagnement
 *   - `kind`    : optionnel — "voice" pour les notes vocales (crée une VoiceNote)
 *   - `duration`: optionnel — durée en secondes (pour kind=voice)
 *
 * Stockage : public/uploads/messages/{conversationId}/{timestamp}-{safeName}
 *
 * Sécurité :
 *   - participant de la conversation (sinon 403)
 *   - MIME whitelist : images, PDF/Office, audio courants
 *   - taille max 10 Mo
 *   - filename sanitisé côté serveur (pas de path traversal)
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_MIMES = new Set([
  // Images
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  // Audio (notes vocales)
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav",
]);

function safeName(name: string): string {
  // Garde lettres/chiffres/. _ - et tronque à 80 chars
  return name.replace(/[^\w.\-]/g, "_").slice(0, 80);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
  });
  if (!participation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const content = String(form.get("content") ?? "").slice(0, 4000);
  const kind = String(form.get("kind") ?? ""); // "voice" | ""
  const duration = Number(form.get("duration") ?? 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis (champ 'file')" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Taille max 10 Mo (reçu ${(file.size / 1024 / 1024).toFixed(1)} Mo)` },
      { status: 413 }
    );
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Type non supporté (${file.type})` },
      { status: 415 }
    );
  }

  // Écriture du fichier dans UPLOAD_ROOT (stable, servi par nginx via /uploads/).
  // ⚠️ NE PAS écrire sous process.cwd()/public en prod standalone : ce dossier
  // est dans .next/standalone (perdu au rebuild) et n'est pas servi par nginx.
  const filename = `${Date.now()}-${safeName(file.name || "file")}`;
  const dir = uploadDiskPath("messages", params.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const publicUrl = uploadPublicUrl("messages", params.id, filename);

  // Création du message (et VoiceNote si kind=voice)
  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: params.id,
        senderId: session.sub,
        content: content || (kind === "voice" ? "🎤 Note vocale" : file.name),
        attachmentUrl: publicUrl,
        attachmentName: file.name,
        attachmentSize: file.size,
        attachmentType: file.type,
        ...(kind === "voice" && {
          voiceNote: {
            create: {
              audioUrl: publicUrl,
              durationSec: Math.max(1, Math.round(duration)),
            },
          },
        }),
      },
      select: {
        id: true,
        content: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentSize: true,
        attachmentType: true,
        createdAt: true,
        senderId: true,
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
        voiceNote: { select: { durationSec: true, transcript: true } },
      },
    });
    await tx.conversation.update({
      where: { id: params.id },
      data: { lastMessageAt: message.createdAt },
    });
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: params.id, userId: session.sub } },
      data: { lastReadAt: message.createdAt },
    });
    return message;
  });

  return NextResponse.json(
    {
      id: created.id,
      content: created.content,
      attachmentUrl: created.attachmentUrl,
      attachmentName: created.attachmentName,
      attachmentSize: created.attachmentSize,
      attachmentType: created.attachmentType,
      voiceNote: created.voiceNote,
      createdAt: created.createdAt.toISOString(),
      senderId: created.senderId,
      sender: created.sender,
      isMe: true,
      isSystem: false,
      deleted: false,
    },
    { status: 201 }
  );
}
