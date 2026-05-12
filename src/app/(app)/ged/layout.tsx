import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

// L'espace GED est piloté par Christelle EYENGA (ARCHIVIST) — référent
// documentaire transverse. DG accède en lecture (drill-down audit/rapports),
// TENANT_ADMIN pour la maintenance.
const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.TENANT_ADMIN];

export default function GedLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  // Réutilise le wrapper data-rh-screen + data-ged-screen pour le protocole
  // responsive partagé (audit-responsive.ts).
  return (
    <div data-rh-screen data-ged-screen>
      <div className="rh-page">{children}</div>
    </div>
  );
}
