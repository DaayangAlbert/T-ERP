import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Stockage local des fichiers uploadés (MVP).
 *
 * Structure : public/uploads/sites/{siteId}/{uuid}.{ext}
 * URL servie  : /uploads/sites/{siteId}/{uuid}.{ext}
 *
 * En production, à migrer vers S3/R2/Spaces — l'interface reste la même
 * (saveFile / deleteFile).
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_DIR, "uploads");

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "");
}

export interface SavedFile {
  fileUrl: string; // URL publique relative (ex: /uploads/sites/abc/xyz.pdf)
  fileName: string; // nom original
  fileSize: number; // bytes
  mimeType: string;
}

export async function saveSiteFile(
  siteId: string,
  file: File,
): Promise<SavedFile> {
  const safeSiteId = siteId.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(UPLOADS_ROOT, "sites", safeSiteId);
  await fs.mkdir(dir, { recursive: true });

  const ext = extOf(file.name);
  const uuid = randomUUID();
  const finalName = `${uuid}${ext}`;
  const fullPath = path.join(dir, finalName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);

  return {
    fileUrl: `/uploads/sites/${safeSiteId}/${finalName}`,
    fileName: file.name,
    fileSize: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function deleteSiteFile(fileUrl: string): Promise<void> {
  if (!fileUrl.startsWith("/uploads/")) return;
  const rel = fileUrl.replace(/^\/+/, "");
  const fullPath = path.join(PUBLIC_DIR, rel);
  // Garde-fou : empêche de sortir du dossier uploads
  if (!fullPath.startsWith(UPLOADS_ROOT)) return;
  try {
    await fs.unlink(fullPath);
  } catch {
    // ignore (fichier déjà supprimé ou inexistant)
  }
}
