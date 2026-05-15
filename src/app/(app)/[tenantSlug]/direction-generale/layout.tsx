import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

/**
 * Layout de l'espace Direction Générale.
 *
 * Autorisation pilotée par la matrice centralisée (access-matrix.ts).
 * DG = FULL · SG / SECRETARY_GENERAL / SUPER_ADMIN = READ (drill-down).
 *
 * Le breadcrumb "Espace DG > <fonction>" est rendu automatiquement par le
 * composant Breadcrumbs du AuthenticatedShell.
 */
export default function DgLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.DG)) redirect("/dashboard");

  return <RbacScope module={MODULES.DG}>{children}</RbacScope>;
}
