import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { canInitiateDm, isCadre } from "@/lib/rbac/messaging-access";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ShareSchema = z.object({
  documentIds: z.array(z.string().cuid()).min(1).max(20),
  recipientUserIds: z.array(z.string().cuid()).min(1).max(20),
  message: z.string().trim().max(2000).optional(),
});

/**
 * POST /api/ged/documents/share
 *
 * Partage un ou plusieurs documents GED vers un ou plusieurs collaborateurs via
 * la messagerie interne. Pour chaque destinataire, on récupère (ou crée) la
 * conversation DM 1-1, puis on envoie :
 *   - un message texte d'introduction (si `message` fourni),
 *   - un message par document, avec les champs attachment* remplis pour le
 *     rendu natif "pièce jointe" et `attachedDocumentIds` pour le lien GED.
 *
 * Garde : tout utilisateur ayant accès lecture à la GED (canAccess GED) peut
 * partager les documents qu'il voit. Les permissions de DM sont en sus
 * vérifiées via canInitiateDm (non-cadres : uniquement leur hiérarchie).
 */
export async function POST(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const senderId = session.sub;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = ShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { documentIds, recipientUserIds, message } = parsed.data;

  const me = await prisma.user.findUnique({
    where: { id: senderId },
    select: { role: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Récupération des documents — on doit vérifier qu'ils appartiennent au tenant.
  const docs = await prisma.document.findMany({
    where: { id: { in: documentIds }, tenantId },
    select: {
      id: true,
      name: true,
      url: true,
      mimeType: true,
      sizeBytes: true,
      internalReference: true,
    },
  });
  if (docs.length === 0) {
    return NextResponse.json({ error: "Aucun document accessible" }, { status: 404 });
  }

  // Filtre les destinataires : doivent être actifs, dans le tenant, hors soi.
  const candidates = await prisma.user.findMany({
    where: {
      id: { in: recipientUserIds.filter((id) => id !== senderId) },
      tenantId,
      status: "ACTIVE",
    },
    select: { id: true, role: true },
  });

  // Si l'envoyeur n'est pas cadre, vérifier qu'il peut DM chaque destinataire.
  const allowedRecipientIds: string[] = [];
  if (isCadre(me.role)) {
    allowedRecipientIds.push(...candidates.map((c) => c.id));
  } else {
    for (const c of candidates) {
      const ok = await canInitiateDm(senderId, me.role as Role, c.id);
      if (ok) allowedRecipientIds.push(c.id);
    }
  }
  if (allowedRecipientIds.length === 0) {
    return NextResponse.json(
      { error: "Aucun destinataire autorisé pour ce profil" },
      { status: 403 },
    );
  }

  // Pour chaque destinataire : trouve (ou crée) la conversation DM 1-1.
  const conversationByRecipient = new Map<string, string>();
  for (const recipientId of allowedRecipientIds) {
    const existing = await prisma.conversation.findFirst({
      where: {
        tenantId,
        isGroup: false,
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      conversationByRecipient.set(recipientId, existing.id);
      continue;
    }
    const created = await prisma.conversation.create({
      data: {
        tenantId,
        isGroup: false,
        participants: {
          create: [{ userId: senderId }, { userId: recipientId }],
        },
      },
      select: { id: true },
    });
    conversationByRecipient.set(recipientId, created.id);
  }

  // Envoi : 1 message d'intro (si fourni) puis 1 message par document.
  let messagesCreated = 0;
  for (const [, conversationId] of conversationByRecipient) {
    const now = new Date();

    if (message && message.length > 0) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: message,
        },
      });
      messagesCreated++;
    }

    for (const doc of docs) {
      const sizeInt =
        typeof doc.sizeBytes === "bigint"
          ? Number(doc.sizeBytes > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(0) : doc.sizeBytes)
          : Number(doc.sizeBytes ?? 0);
      const label = doc.internalReference
        ? `${doc.internalReference} — ${doc.name}`
        : doc.name;

      await prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: `📎 ${label}`,
          attachmentUrl: doc.url,
          attachmentName: doc.name,
          attachmentSize: Number.isFinite(sizeInt) ? sizeInt : 0,
          attachmentType: doc.mimeType,
          attachedDocumentIds: [doc.id],
        },
      });
      messagesCreated++;
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    });
  }

  return NextResponse.json({
    conversations: Array.from(conversationByRecipient.values()),
    recipients: allowedRecipientIds.length,
    documents: docs.length,
    messagesCreated,
    skippedRecipients: recipientUserIds.length - allowedRecipientIds.length,
  });
}
