import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { deleteSiteFile } from "@/lib/storage/local-files";
import { siteDocumentUpdateSchema } from "@/schemas/site-document";

export const dynamic = "force-dynamic";

async function guard(id: string) {
  const session = getCurrentSession();
  if (!session) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  if (session.role !== Role.SITE_MANAGER) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  const doc = await prisma.siteDocument.findUnique({
    where: { id },
    select: { id: true, siteId: true, fileUrl: true },
  });
  if (!doc) return { error: NextResponse.json({ error: "Document introuvable" }, { status: 404 }) };

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(doc.siteId)) {
    return { error: NextResponse.json({ error: "Hors périmètre" }, { status: 403 }) };
  }
  return { doc, session };
}

/**
 * PATCH : met à jour les métadonnées du document (titre, dates, montant…)
 * et/ou son statut `archived`. Le fichier lui-même n'est pas remplacé.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(params.id);
  if ("error" in g) return g.error;

  try {
    const input = siteDocumentUpdateSchema.parse(await req.json());

    const updated = await prisma.siteDocument.update({
      where: { id: params.id },
      data: {
        title: input.title,
        category: input.category,
        subCategory: input.subCategory,
        description: input.description,
        referenceNumber: input.referenceNumber,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : input.issuedAt === "" ? null : undefined,
        validUntil: input.validUntil ? new Date(input.validUntil) : input.validUntil === "" ? null : undefined,
        amount: input.amount !== undefined ? (input.amount === null ? null : BigInt(input.amount)) : undefined,
        relatedPartyName: input.relatedPartyName,
        tags: input.tags,
        archived: input.archived,
        archivedAt: input.archived === true ? new Date() : input.archived === false ? null : undefined,
      },
      select: { id: true, title: true, archived: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Données invalides", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/cc/documents/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE : suppression définitive (fichier + ligne).
 * Pour une suppression non-destructive, utilisez PATCH avec archived=true.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guard(params.id);
  if ("error" in g) return g.error;

  // Supprime le fichier physique puis la ligne
  await deleteSiteFile(g.doc.fileUrl);
  await prisma.siteDocument.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
