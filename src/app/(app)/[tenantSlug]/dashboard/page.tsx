import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Map rôle → espace métier réel.
 *
 * Toutes les valeurs ici doivent pointer vers un page.tsx ou un layout
 * qui existe réellement sous `src/app/(app)/[tenantSlug]/`. Sinon le
 * routeur tombera sur le placeholder générique [role]/page.tsx qui
 * affiche "tableau de bord en construction".
 */
const ROLE_TO_PATH: Record<Role, string> = {
  OWNER: "/proprietaire",
  DG: "/dashboard/dg",
  DAF: "/direction-financiere",
  HR: "/ressources-humaines",
  TECH_DIRECTOR: "/direction-technique",
  WORKS_DIRECTOR: "/directeur-travaux",
  WORKS_MANAGER: "/conducteur-travaux",
  SITE_MANAGER: "/chef-chantier",
  WORKER: "/ouv/dashboard",
  ACCOUNTANT: "/comptable",
  PURCHASING_OFFICER: "/achats",
  LOGISTICS: "/logistique",
  WAREHOUSE: "/magasin",
  ARCHIVIST: "/gestion-documentaire",
  SECRETARY_GENERAL: "/secretaire-general",
  EMPLOYEE: "/employe",
  // CANDIDATE et SUPER_ADMIN sortent du tenant — redirection globale ci-dessous.
  CANDIDATE: "",
  TENANT_ADMIN: "/informatique",
  SUPER_ADMIN: "",
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

  // Rôles globaux (hors tenant)
  if (user.role === Role.CANDIDATE) redirect("/cand/dashboard");
  if (user.role === Role.SUPER_ADMIN) redirect("/admin/tenants");

  redirect(`/${params.tenantSlug}${ROLE_TO_PATH[user.role]}`);
}
