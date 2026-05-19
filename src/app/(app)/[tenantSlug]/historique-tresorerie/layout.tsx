import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";

const ALLOWED: Role[] = [
  Role.DAF,
  Role.ACCOUNTANT,
  Role.DG,
  Role.TECH_DIRECTOR,
  Role.TENANT_ADMIN,
  Role.SUPER_ADMIN,
];

export default function TreasuryHistoryLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (!ALLOWED.includes(session.role as Role)) redirect("/dashboard");
  return <>{children}</>;
}
