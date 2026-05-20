/**
 * Upload d'un asset entreprise (logo, signature DRH, cachet) pour le tenant.
 *
 * Multipart POST avec :
 *   - field `file`  : le fichier (PNG, JPG, SVG ou WebP, max 2 Mo)
 *   - field `kind`  : "logo" | "signature" | "stamp"
 *
 * Stockage : public/uploads/tenant/{tenantId}/{kind}-{timestamp}.{ext}
 * Sert l'URL publique /uploads/tenant/{tenantId}/{kind}-{timestamp}.{ext}.
 *
 * Sécurité :
 *   - guardIt + flag canManageTenantSettings
 *   - validation MIME stricte (whitelist)
 *   - taille max 2 Mo
 *   - nom de fichier généré côté serveur (pas de path traversal possible)
 *   - suppression de l'ancien fichier après update réussi (pas d'accumulation)
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const KIND_TO_FIELD: Record<string, "logoUrl" | "signatureImageUrl" | "stampImageUrl"> = {
  logo: "logoUrl",
  signature: "signatureImageUrl",
  stamp: "stampImageUrl",
};

export async function POST(req: Request) {
  const guard = await guardIt("canManageTenantSettings");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  const dbField = KIND_TO_FIELD[kind];
  if (!dbField) {
    return NextResponse.json({ error: "kind invalide (logo|signature|stamp)" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis (champ 'file')" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Taille max 2 Mo (reçu ${(file.size / 1024).toFixed(0)} Ko)` }, { status: 413 });
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Type non supporté (${file.type}). Autorisés : PNG, JPG, SVG, WebP.` },
      { status: 415 },
    );
  }

  // Récupère l'URL actuelle pour supprimer l'ancien fichier après update.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { [dbField]: true },
  });
  const previousUrl = (tenant?.[dbField] ?? null) as string | null;

  const filename = `${kind}-${Date.now()}.${ext}`;
  const dir = uploadDiskPath("tenant", tenantId);
  await fs.mkdir(dir, { recursive: true });
  const absPath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buffer);

  const publicUrl = uploadPublicUrl("tenant", tenantId, filename);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { [dbField]: publicUrl },
  });

  // Tente de supprimer l'ancien fichier si c'était un upload géré (sous /uploads/tenant/).
  // Les anciennes URLs (/seed/..., http://...) sont laissées intactes.
  if (previousUrl && previousUrl.startsWith(`/uploads/tenant/${tenantId}/`)) {
    const oldFilename = previousUrl.split("/").pop();
    if (oldFilename && oldFilename !== filename) {
      await fs
        .unlink(path.join(dir, oldFilename))
        .catch(() => { /* fichier déjà absent — non bloquant */ });
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: session.sub,
      action: "it.tenant.branding.upload",
      entityType: "Tenant",
      entityId: tenantId,
      metadata: { kind, filename, sizeBytes: file.size, mime: file.type },
    },
  });

  return NextResponse.json({ url: publicUrl });
}
