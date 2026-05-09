import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ROLE_TO_PATH: Record<Role, string> = {
  DG: "/dashboard/dg",
  DAF: "/dashboard/daf",
  SG: "/dashboard/sg",
  HR: "/dashboard/hr",
  TECH_DIRECTOR: "/dashboard/tech-director",
  WORKS_DIRECTOR: "/dashboard/works-director",
  WORKS_MANAGER: "/dashboard/works-manager",
  SITE_MANAGER: "/dashboard/site-manager",
  WORKER: "/dashboard/worker",
  ACCOUNTANT: "/dashboard/accountant",
  LOGISTICS: "/dashboard/logistics",
  WAREHOUSE: "/dashboard/warehouse",
  GED: "/dashboard/ged",
  EMPLOYEE: "/dashboard/employee",
  CANDIDATE: "/dashboard/candidate",
  TENANT_ADMIN: "/dashboard/tenant-admin",
  SUPER_ADMIN: "/dashboard/super-admin",
};

export default async function DashboardIndex() {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  if (!user) redirect("/");

  redirect(ROLE_TO_PATH[user.role]);
}
