import path from "node:path";

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
