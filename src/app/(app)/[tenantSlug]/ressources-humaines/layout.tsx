import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

// Le DG, le TENANT_ADMIN et le DAF lisent l'espace RH (drill-down).
// Sandrine ONANA (HR) y accède en pleine action.
const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export default function RhLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  return (
    <div data-rh-screen>
      <div className="rh-page">{children}</div>
    </div>
  );
}
