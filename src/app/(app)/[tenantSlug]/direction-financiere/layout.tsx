import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export default function DafLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");

  // Le DG accède en lecture seule (drill-down sans actions). On laisse les composants
  // décider via useAuth() pour griser les boutons d'action si role !== "DAF".
  return <>{children}</>;
}
