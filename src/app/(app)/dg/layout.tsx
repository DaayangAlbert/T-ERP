import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

/**
 * Layout exclusif au Directeur Général.
 *
 * - Redirige vers /dashboard si l'utilisateur n'a pas Role.DG
 *   (le layout (app) parent a déjà vérifié la session — pas besoin de re-auth ici)
 * - Le breadcrumb "Espace DG > <fonction>" est rendu automatiquement par le
 *   composant Breadcrumbs du AuthenticatedShell, grâce à l'entrée
 *   `dg: "Espace DG"` dans SEGMENT_LABELS.
 */
export default async function DgLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });

  if (!user || user.role !== Role.DG) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
