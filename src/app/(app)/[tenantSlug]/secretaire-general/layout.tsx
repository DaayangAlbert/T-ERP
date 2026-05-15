import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// SECRETARY_GENERAL / SG = FULL · DG / ARCHIVIST = READ (drill-down).
//
// Note : la spec demande MFA obligatoire pour SG (sinon redirect /mfa/setup).
// MFA n'est pas encore implémenté projet-wide — sera ajouté en phase 2.
export default function SgLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.SG)) redirect("/dashboard");

  return (
    <RbacScope module={MODULES.SG}>
      <div data-rh-screen data-sg-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
