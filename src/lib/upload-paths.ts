import path from "node:path";
import { readFile } from "node:fs/promises";

/**
 * Racine de stockage des fichiers uploadés (logos, signatures, cachets, CV...).
 *
 * ⚠️ En production Next.js standalone, `process.cwd()` pointe vers
 * `.next/standalone` (le serveur fait un chdir au démarrage). Or `next build`
 * régénère `.next/standalone/` à chaque build → tout fichier écrit là est PERDU
 * au prochain déploiement.
 *
 * Solution : un dossier STABLE hors de `.next`, configurable via la variable
 * d'env `UPLOAD_ROOT`. En prod on la pointe vers /var/www/terp/uploads
 * (servi par nginx via `location /uploads/`).
 *
 * En dev (UPLOAD_ROOT absent), on retombe sur public/uploads pour que les
 * fichiers soient servis directement par le dev server.
 */
export const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "public", "uploads");

/** Construit le chemin disque absolu pour un sous-chemin relatif d'upload. */
export function uploadDiskPath(...segments: string[]): string {
  return path.join(UPLOAD_ROOT, ...segments);
}

/** Construit l'URL publique (toujours sous /uploads/, servie par nginx). */
export function uploadPublicUrl(...segments: string[]): string {
  return `/uploads/${segments.join("/")}`;
}

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
};

/**
 * Convertit une URL d'upload relative (/uploads/...) en data URI base64,
 * en lisant le fichier sur disque. Indispensable pour react-pdf qui rend
 * côté serveur et ne sait pas résoudre les URLs relatives.
 *
 * - URL `/uploads/...`  → lit depuis UPLOAD_ROOT, retourne data:image/...
 * - URL `/seed/...` ou `/...` (asset public buildé) → lit depuis public/
 * - URL http(s):// ou null → retournée telle quelle (react-pdf gère le réseau)
 * - Fichier introuvable → null (le composant PDF affiche le fallback)
 */
export async function uploadUrlToDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  let diskPath: string;
  if (url.startsWith("/uploads/")) {
    diskPath = uploadDiskPath(...url.slice("/uploads/".length).split("/"));
  } else if (url.startsWith("/")) {
    // Asset public buildé (ex: /seed/logo.svg) — dans public/, copié au deploy.
    diskPath = path.join(process.cwd(), "public", ...url.slice(1).split("/"));
  } else {
    return null;
  }

  try {
    const buf = await readFile(diskPath);
    const ext = (diskPath.split(".").pop() ?? "").toLowerCase();
    const mime = EXT_TO_MIME[ext] ?? "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null; // fichier absent — fallback géré côté composant
  }
}
