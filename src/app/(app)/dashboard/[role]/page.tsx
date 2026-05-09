import { Construction } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  daf: "Direction administrative et financière",
  sg: "Secrétariat général",
  hr: "Ressources humaines",
  "tech-director": "Direction technique",
  "works-director": "Direction des travaux",
  "works-manager": "Conducteur de travaux",
  "site-manager": "Chef de chantier",
  worker: "Ouvrier",
  accountant: "Comptable",
  logistics: "Logistique",
  warehouse: "Magasinier",
  ged: "Gestion documentaire",
  employee: "Employé bureau",
  candidate: "Candidat externe",
  "tenant-admin": "Administrateur informatique",
  "super-admin": "Super-admin SaaS",
};

export default async function GenericRoleDashboard({
  params,
}: {
  params: { role: string };
}) {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { firstName: true, lastName: true, role: true, position: true },
  });
  if (!user) redirect("/");

  const label = ROLE_LABELS[params.role] ?? params.role;

  return (
    <div className="mx-auto max-w-2xl pt-12 text-center">
      <div className="mb-4 inline-grid h-12 w-12 place-items-center rounded-full bg-primary-100 text-primary-700">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Tableau de bord {label}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        Bonjour {user.firstName} {user.lastName} — votre tableau de bord est en construction.
      </p>
      <p className="mt-1 text-[12.5px] text-ink-3">
        Le J2 livre l'architecture (sidebar, header, switch profil démo) et le squelette du
        dashboard DG. Les vues spécifiques par rôle suivront dans les prochaines sessions.
      </p>
      <p className="mt-4 text-[12.5px] text-ink-3">
        Vous pouvez basculer vers un autre profil en cliquant sur votre avatar en haut à droite.
      </p>
    </div>
  );
}
