import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

// L'espace DT est piloté par Daniel ESSOMBA (TECH_DIRECTOR).
// Le DG y accède en lecture seule (drill-down). Le TENANT_ADMIN pour la maintenance.
const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export default function DtLayout({ children }: { children: React.ReactNode }) {
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
