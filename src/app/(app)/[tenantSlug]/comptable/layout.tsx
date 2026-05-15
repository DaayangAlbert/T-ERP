import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// ACCOUNTANT / DAF = FULL · DG / SG / ARCHIVIST / WORKS_DIRECTOR = READ.
export default function ComptableLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.CPT)) redirect("/dashboard");

  return (
    <RbacScope module={MODULES.CPT}>
      <div data-rh-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
