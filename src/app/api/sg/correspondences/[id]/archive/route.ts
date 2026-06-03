import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgCorrespondenceMutation } from "@/lib/rbac/sg-guard";
import {
  Confidentiality,
  CorrespondenceConfidentiality,
  CorrespondenceDirection,
  CorrespondenceStatus,
  DocStatus,
  GedAuditAction,
  SpaceType,
} from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Mappe la confidentialité « courrier » vers la confidentialité « GED ».
 * Les valeurs n'ont pas exactement les mêmes noms d'enum.
 */
function mapConfidentiality(c: CorrespondenceConfidentiality): Confidentiality {
  switch (c) {
    case "PUBLIC":
      return Confidentiality.PUBLIC;
    case "STANDARD":
      return Confidentiality.INTERNAL;
    case "SENSITIVE":
      return Confidentiality.RESTRICTED;
    case "CONFIDENTIAL":
      return Confidentiality.CONFIDENTIAL;
  }
}

/**
 * Récupère ou crée l'espace documentaire « Courriers officiels » du tenant.
 * Idempotent — exécuté à chaque archivage qui pousse un PDF.
 */
async function ensureCorrespondencesSpace(tenantId: string): Promise<string> {
  const existing = await prisma.documentSpace.findFirst({
    where: { tenantId, code: "COURRIERS" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.documentSpace.create({
    data: {
      tenantId,
      code: "COURRIERS",
      name: "Courriers officiels",
      description:
        "Registre archivé des courriers entrants et sortants (signés DG le cas échéant)",
      icon: "✉️",
      spaceType: SpaceType.OTHER,
      confidentiality: Confidentiality.RESTRICTED,
    },
    select: { id: true },
  });
  return created.id;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgCorrespondenceMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId },
    select: {
      id: true,
      reference: true,
      status: true,
      direction: true,
      subject: true,
      summary: true,
      documentUrl: true,
      confidentiality: true,
      date: true,
    },
  });
  if (!c) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }
  if (c.status === CorrespondenceStatus.ARCHIVED) {
    return NextResponse.json({ error: "Déjà archivé" }, { status: 409 });
  }

  // Si un fichier scanné/PDF est attaché, on le pousse dans la GED en tant que
  // Document classé. Sinon, on se contente de marquer le timestamp d'archivage.
  let createdDocumentId: string | null = null;
  if (c.documentUrl) {
    const spaceId = await ensureCorrespondencesSpace(tenantId);
    const year = c.date.getUTCFullYear();
    const directionLabel =
      c.direction === CorrespondenceDirection.INCOMING ? "Entrants" : "Sortants";
    const truncatedSubject = c.subject.length > 80 ? `${c.subject.slice(0, 77)}…` : c.subject;
    const docName = `${c.reference} — ${truncatedSubject}`;

    // Idempotence : si le document a déjà été créé (re-tentative), on le retrouve
    // via internalReference (unique au tenant : ex. CE-2026-0001 / CS-2026-0001).
    const existingDoc = await prisma.document.findFirst({
      where: { tenantId, internalReference: c.reference },
      select: { id: true },
    });
    if (existingDoc) {
      createdDocumentId = existingDoc.id;
    } else {
      const doc = await prisma.document.create({
        data: {
          tenantId,
          name: docName,
          category: `Courrier ${directionLabel}`,
          folder: `Courriers/${directionLabel}/${year}`,
          mimeType: "application/pdf",
          sizeBytes: BigInt(0), // taille réelle inconnue à ce stade
          url: c.documentUrl,
          authorId: session.sub,
          status: DocStatus.ARCHIVED,
          spaceId,
          internalReference: c.reference,
          confidentiality: mapConfidentiality(c.confidentiality),
          ocrContent: c.summary ?? null,
        },
        select: { id: true },
      });
      createdDocumentId = doc.id;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.officialCorrespondence.update({
      where: { id: c.id },
      data: {
        status: CorrespondenceStatus.ARCHIVED,
        archivedInGedAt: new Date(),
        handledAt: new Date(),
      },
    });
    await tx.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: session.sub,
        documentId: createdDocumentId,
        action: GedAuditAction.IMPORT,
        metadata: {
          kind: "CORRESPONDENCE_ARCHIVED",
          correspondenceId: c.id,
          reference: c.reference,
          direction: c.direction,
          documentCreated: !!createdDocumentId,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, documentId: createdDocumentId });
}
