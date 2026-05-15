import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

export default function DafLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.DAF)) redirect("/dashboard");

  // L'autorisation détaillée et le niveau (FULL/READ/SCOPE…) viennent de la
  // matrice centralisée (cf src/lib/rbac/access-matrix.ts). RbacScope affiche
  // automatiquement le bandeau "Lecture seule" pour les rôles READ (DG, SG, etc.).
  // Les composants UI consultent useAccess("DAF").canEdit pour masquer leurs
  // boutons d'édition.
  return <RbacScope module={MODULES.DAF}>{children}</RbacScope>;
}
