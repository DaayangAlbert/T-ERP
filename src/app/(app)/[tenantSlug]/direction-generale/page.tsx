import { redirect } from "next/navigation";

/**
 * /dg → /dashboard/dg
 *
 * Le tableau de bord DG existe déjà à /dashboard/dg depuis J3.
 * Cette page-index garde l'URL /dg cohérente avec la sidebar "Espace DG".
 */
export default function DgIndex() {
  redirect("/dashboard/dg");
}
