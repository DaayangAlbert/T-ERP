import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Espace Logisticien — Robert ETONDÉ (siège BatimCAM Yaoundé).
// assignedSiteIds doit être [] (vue globale 23 chantiers).
const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export default async function LogLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  // Si LOGISTICS, vérifier qu'il a une vue globale (assignedSiteIds vide)
  if (session.role === Role.LOGISTICS) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (user && user.assignedSiteIds.length > 0) redirect("/dashboard");
  }

  return (
    <div data-rh-screen data-log-screen>
      <div className="rh-page">{children}</div>
    </div>
  );
}
