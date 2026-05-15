import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// HR = FULL · DG / DAF / SG / ARCHIVIST / WORKS_DIRECTOR = READ (drill-down).
export default function RhLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.RH)) redirect("/dashboard");

  return (
    <RbacScope module={MODULES.RH}>
      <div data-rh-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
