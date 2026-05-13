import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

// L'espace SG est piloté par Élisabeth NDONGMO (SECRETARY_GENERAL) — juriste
// de formation, gouvernance/corporate/juridique. DG accède en lecture
// (drill-down), TENANT_ADMIN pour la maintenance.
//
// Note : la spec demande MFA obligatoire pour SG (sinon redirect /mfa/setup).
// MFA n'est pas encore implémenté projet-wide — sera ajouté en phase 2.
const ALLOWED: Role[] = [Role.SECRETARY_GENERAL, Role.DG, Role.TENANT_ADMIN];

export default function SgLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  // Réutilise le wrapper data-rh-screen + data-sg-screen pour le protocole
  // responsive partagé (audit-responsive.ts).
  return (
    <div data-rh-screen data-sg-screen>
      <div className="rh-page">{children}</div>
    </div>
  );
}
