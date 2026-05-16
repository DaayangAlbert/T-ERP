import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ROLE_TO_PATH: Record<Role, string> = {
  DG: "/direction-generale",
  DAF: "/direction-financiere",
  HR: "/dashboard/hr",
  TECH_DIRECTOR: "/dashboard/tech-director",
  WORKS_DIRECTOR: "/dashboard/works-director",
  WORKS_MANAGER: "/dashboard/works-manager",
  SITE_MANAGER: "/dashboard/site-manager",
  WORKER: "/ouv/dashboard",
  ACCOUNTANT: "/dashboard/accountant",
  LOGISTICS: "/dashboard/logistics",
  WAREHOUSE: "/dashboard/warehouse",
  ARCHIVIST: "/gestion-documentaire",
  SECRETARY_GENERAL: "/secretaire-general",
  EMPLOYEE: "/dashboard/employee",
  CANDIDATE: "/dashboard/candidate",
  TENANT_ADMIN: "/dashboard/tenant-admin",
  SUPER_ADMIN: "/tenants",
};

export default async function DashboardIndex({
  params,
}: {
  params: { tenantSlug: string };
}) {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  if (!user) redirect("/");

  redirect(`/${params.tenantSlug}${ROLE_TO_PATH[user.role]}`);
}
