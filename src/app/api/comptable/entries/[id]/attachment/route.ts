import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/**
 * Sert le justificatif (pièce jointe) d'une écriture comptable.
 *
 * Le fichier est servi via cette route AUTHENTIFIÉE plutôt qu'en accès direct
 * sous /public : vérification rôle + tenant + périmètre chantier du comptable.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const entry = await prisma.entry.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { siteId: true, attachmentUrl: true, attachmentName: true, attachmentMimeType: true },
  });
  if (!entry) return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
  if (!entry.attachmentUrl) return NextResponse.json({ error: "Aucun justificatif" }, { status: 404 });

  // Comptable chantier : limité à ses chantiers assignés.
  const allowed = await getAccessibleSiteIds(session.sub);
  if (allowed !== null && entry.siteId && !isSiteAllowed(allowed, entry.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  // attachmentUrl = "/uploads/comptable/{tenant}/{yyyy}/{mm}/{fichier}" → sous public/.
  // Garde anti-traversal : on n'autorise que les chemins sous uploads/comptable/.
  const rel = entry.attachmentUrl.replace(/^\/+/, "");
  if (!rel.startsWith("uploads/comptable/") || rel.includes("..")) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), "public", rel));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": entry.attachmentMimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(entry.attachmentName || "justificatif")}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable sur le serveur" }, { status: 404 });
  }
}
