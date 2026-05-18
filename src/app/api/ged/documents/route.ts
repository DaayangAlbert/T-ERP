import { NextResponse } from "next/server";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { Confidentiality } from "@prisma/client";
import { createGedDocument } from "@/lib/ged/document-create";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo
const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "ged");

function extFromName(name: string, mime: string): string {
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) return name.slice(dot).toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime.startsWith("image/")) return "." + mime.split("/")[1];
  return "";
}

/**
 * POST /api/ged/documents — upload multipart
 *
 * FormData attendue :
 *   - `file` (binaire, max 50 Mo) — obligatoire
 *   - `displayName` — nom affiché (sinon = nom du fichier)
 *   - `spaceId` — espace cible explicite (sinon auto-classif)
 *   - `siteId` — contexte chantier (utilisé pour classif TECHNICAL)
 *   - `classificationPrefix` — force le préfixe (ex: "PEX", "BS_")
 *   - `confidentiality` — PUBLIC/INTERNAL/RESTRICTED/CONFIDENTIAL
 *   - `publish` — "1" pour DocStatus PUBLISHED, sinon DRAFT
 *   - `notes` — note libre pour l'audit log
 *
 * Réponse 201 :
 *   {
 *     id, internalReference,
 *     classification: { detectedPrefix, reason, classificationId, spaceId },
 *     duaEndDate, workflowInstanceId
 *   }
 *
 * Permission : ARCHIVIST / TENANT_ADMIN / SUPER_ADMIN (guardGedMutation).
 * Les autres directions (DT, DAF, RH...) doivent passer par leurs propres
 * routes d'upload — ou cette route directement si on étend ALLOWED plus tard.
 */
export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const authorId = session.sub;

  // Seuls ARCHIVIST/TENANT_ADMIN/SUPER_ADMIN ont guardGedMutation = canEdit
  // (les autres rôles sont READ-only sur GED). Pas besoin de re-check.

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Multipart attendu" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ 'file' manquant" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${Math.round(MAX_SIZE_BYTES / 1_000_000)} Mo)` },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Type MIME non autorisé : ${file.type}` },
      { status: 415 },
    );
  }

  const displayName = (form.get("displayName") as string | null)?.trim() || file.name;
  const spaceId = (form.get("spaceId") as string | null) || undefined;
  const siteId = (form.get("siteId") as string | null) || undefined;
  const classificationPrefix =
    (form.get("classificationPrefix") as string | null)?.trim().toUpperCase() || undefined;
  const confRaw = form.get("confidentiality") as string | null;
  const confidentiality =
    confRaw && Object.values(Confidentiality).includes(confRaw as Confidentiality)
      ? (confRaw as Confidentiality)
      : undefined;
  const publish = form.get("publish") === "1";
  const notes = (form.get("notes") as string | null)?.trim() || undefined;

  // ── Stockage binaire ───────────────────────────────────────────────────
  // Layout : public/uploads/ged/<tenantId>/<YYYY>/<MM>/<uuid><ext>
  // URL servie : /uploads/ged/<tenantId>/<YYYY>/<MM>/<uuid><ext>
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const ext = extFromName(file.name, file.type);
  const uuid = randomUUID();
  const relDir = path.join(tenantId, yyyy, mm);
  const absDir = path.join(UPLOAD_ROOT, relDir);
  const filename = `${uuid}${ext}`;
  const absPath = path.join(absDir, filename);

  try {
    await mkdir(absDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buffer);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Échec écriture fichier : ${e?.message ?? "inconnu"}` },
      { status: 500 },
    );
  }

  const url = `/uploads/ged/${tenantId}/${yyyy}/${mm}/${filename}`;

  // ── Création en base + auto-classification ────────────────────────────
  try {
    const result = await createGedDocument({
      tenantId,
      authorId,
      filename: file.name,
      displayName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      url,
      siteId,
      classificationPrefix,
      spaceId,
      confidentiality,
      publish,
      importNotes: notes,
    });

    return NextResponse.json(
      {
        id: result.id,
        internalReference: result.internalReference,
        url,
        sizeBytes: file.size,
        classification: {
          detectedPrefix: result.classification.detectedPrefix,
          reason: result.classification.reason,
          classificationId: result.classification.classificationId,
          classificationName: result.classification.classification?.name ?? null,
          spaceId: result.classification.spaceId,
        },
        duaEndDate: result.duaEndDate,
        workflowInstanceId: result.workflowInstanceId,
      },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: `Échec création document : ${e?.message ?? "inconnu"}` },
      { status: 500 },
    );
  }
}
