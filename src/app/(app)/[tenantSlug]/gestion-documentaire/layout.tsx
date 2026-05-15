import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// ARCHIVIST / GED = FULL · DT / DAF / RH / WORKS_DIRECTOR / SG / etc. = READ.
export default function GedLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.GED)) redirect("/dashboard");

  return (
    <RbacScope module={MODULES.GED}>
      <div data-rh-screen data-ged-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
