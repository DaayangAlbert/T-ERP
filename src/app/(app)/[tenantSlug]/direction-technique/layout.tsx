import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// TECH_DIRECTOR = FULL · DG / WORKS_DIRECTOR / SG / ACCOUNTANT = READ (drill-down).
export default function DtLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.DT)) redirect("/dashboard");

  return (
    <RbacScope module={MODULES.DT}>
      <div data-rh-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
