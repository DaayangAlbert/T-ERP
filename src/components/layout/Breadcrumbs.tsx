"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Pilotage",
  dg: "Espace DG",
  daf: "Direction administrative et financière",
  sg: "Secrétariat général",
  hr: "Ressources humaines",
  "tech-director": "Direction technique",
  "works-director": "Direction des travaux",
  "works-manager": "Conduite des travaux",
  "site-manager": "Chef de chantier",
  worker: "Ouvrier",
  warehouse: "Magasin",
  accountant: "Comptabilité",
  ged: "Documentation",
  "tenant-admin": "Administration tenant",
  candidate: "Espace candidat",
  employee: "Mon espace",
  consolidation: "Consolidation groupe",
  chantiers: "Chantiers",
  finances: "Finances",
  comptabilite: "Comptabilité",
  rh: "Ressources humaines",
  paie: "Ma paie",
  bulletin: "Bulletin",
  etats: "États de salaire",
  messagerie: "Messagerie",
  profil: "Mon profil",
  validations: "Mes validations",
  rapports: "Rapports consolidés",
  achats: "Achats",
  stocks: "Stocks & matériel",
  configuration: "Configuration",
  securite: "Sécurité & rôles",
  planning: "Planning",
};

function labelFor(segment: string) {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const items = parts.map((seg, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const isLast = i === parts.length - 1;
    // Le segment 'dg' a deux significations selon le contexte :
    //   - /dashboard/dg → "Direction générale" (le tableau de bord du DG)
    //   - /dg/<fonction>   → "Espace DG" (le namespace des fonctions DG, Phase 2)
    const label =
      seg === "dg" && parts[i - 1] === "dashboard"
        ? "Direction générale"
        : labelFor(seg);
    return { seg, href, isLast, label };
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-[12.5px] text-ink-3">
      {items.map(({ href, isLast, label }, i) => (
        <span key={href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-ink-4" />}
          {isLast ? (
            <span className="font-medium text-ink-2">{label}</span>
          ) : (
            <Link href={href} className="hover:text-primary-700">
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
