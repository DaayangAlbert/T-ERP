import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

// L'espace Comptable est piloté par le ou les ACCOUNTANT (Direction OU Chantier
// — adapté côté UI via assignedSiteIds). DAF + DG y accèdent en lecture (drill-down),
// TENANT_ADMIN pour la maintenance.
const ALLOWED: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.TENANT_ADMIN];

export default function ComptableLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  // Réutilise le wrapper data-rh-screen pour bénéficier du protocole responsive partagé.
  return (
    <div data-rh-screen>
      <div className="rh-page">{children}</div>
    </div>
  );
}
