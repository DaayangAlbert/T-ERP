import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { RbacScope } from "@/components/rbac/RbacScope";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// LOGISTICS = FULL · DG / DAF / TECH_DIRECTOR / WORKS_DIRECTOR / WAREHOUSE = READ.
// Spécificité Robert ETONDÉ : assignedSiteIds doit être [] (vue globale 23 chantiers).
export default async function LogLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!canAccess(session.role as Role, MODULES.LOG)) redirect("/dashboard");

  // Spécifique au LOGISTICS : il doit avoir une vue globale (assignedSiteIds vide)
  if (session.role === Role.LOGISTICS) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (user && user.assignedSiteIds.length > 0) redirect("/dashboard");
  }

  return (
    <RbacScope module={MODULES.LOG}>
      <div data-rh-screen data-log-screen>
        <div className="rh-page">{children}</div>
      </div>
    </RbacScope>
  );
}
