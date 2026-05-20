import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Limite raisonnable pour une signature scannée (300dpi · 600x200px PNG transparent)
const MAX_BYTES = 1_000_000; // 1 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Upload d'un fichier signature ou paraphe pour l'utilisateur connecté.
 *
 * - Reçoit un FormData avec :
 *     · file : Blob (PNG/JPEG/WEBP, max 1 MB)
 *     · kind : "signature" | "initials"
 * - Écrit dans /public/uploads/signatures/<userId>-<kind>.png
 * - Met à jour UserSignature.signatureUrl ou .initialsUrl avec l'URL relative
 * - Retourne { url } pour preview immédiat
 *
 * Storage : disque local (simple, pas de R2 setup). Migration future facile :
 * remplacer writeFile par un upload S3/R2 et changer l'URL retournée.
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Multipart/form-data attendu" }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Champ 'file' manquant ou invalide" }, { status: 400 });
  }
  if (kind !== "signature" && kind !== "initials") {
    return NextResponse.json(
      { error: "Champ 'kind' doit valoir 'signature' ou 'initials'" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_BYTES / 1000} KB)` },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Format non supporté. Utilise PNG, JPEG ou WEBP (reçu: ${file.type})` },
      { status: 400 },
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${session.sub}-${kind}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
  const filePath = path.join(uploadDir, fileName);
  const publicUrl = `/uploads/signatures/${fileName}`;

  // Crée le dossier si absent
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Supprime un éventuel ancien fichier avec autre extension (PNG vs JPG)
  for (const oldExt of ["png", "jpg", "webp"]) {
    if (oldExt === ext) continue;
    const oldPath = path.join(uploadDir, `${session.sub}-${kind}.${oldExt}`);
    if (existsSync(oldPath)) {
      await unlink(oldPath).catch(() => {});
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Met à jour la DB (upsert pour gérer le 1er upload)
  const updateData =
    kind === "signature"
      ? { signatureUrl: publicUrl, uploadedAt: new Date() }
      : { initialsUrl: publicUrl, uploadedAt: new Date() };

  await prisma.userSignature.upsert({
    where: { userId: session.sub },
    update: updateData,
    create: {
      userId: session.sub,
      ...updateData,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId ?? "",
      userId: session.sub,
      action: `user.signature.upload.${kind}`,
      entityType: "UserSignature",
      entityId: session.sub,
      metadata: { url: publicUrl, sizeBytes: file.size, mime: file.type },
    },
  });

  return NextResponse.json({ ok: true, url: publicUrl });
}

/**
 * Suppression d'une signature ou d'un paraphe.
 * Query string `?kind=signature` ou `?kind=initials`.
 */
export async function DELETE(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "signature" && kind !== "initials") {
    return NextResponse.json({ error: "Paramètre 'kind' requis" }, { status: 400 });
  }

  // Supprime le fichier disque (toutes extensions possibles)
  const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
  for (const ext of ["png", "jpg", "webp"]) {
    const filePath = path.join(uploadDir, `${session.sub}-${kind}.${ext}`);
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => {});
    }
  }

  // Reset l'URL en DB
  const updateData =
    kind === "signature" ? { signatureUrl: null } : { initialsUrl: null };
  await prisma.userSignature.updateMany({
    where: { userId: session.sub },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId ?? "",
      userId: session.sub,
      action: `user.signature.delete.${kind}`,
      entityType: "UserSignature",
      entityId: session.sub,
    },
  });

  return NextResponse.json({ ok: true });
}
