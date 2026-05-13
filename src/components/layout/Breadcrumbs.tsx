"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTenantStore } from "@/stores/tenant-store";

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
  objectifs: "Mes objectifs",
  "tresorerie-previsionnelle": "Trésorerie prévisionnelle",
  "reporting-ca": "Reporting CA",
  nouveau: "Nouveau",
  chantiers: "Chantiers",
  finances: "Finances",
  comptabilite: "Comptabilité",
  rh: "Ressources humaines",
  bulletin: "Bulletin",
  etats: "États de salaire",
  messagerie: "Messagerie",
  profil: "Mon profil",
  validations: "Mes validations",
  rapports: "Rapports consolidés",
  achats: "Achats",
  stocks: "Stocks & matériel",
  tresorerie: "Trésorerie temps réel",
  recouvrement: "Recouvrement",
  fiscal: "Fiscalité",
  configuration: "Configuration",
  entreprise: "Identité entreprise",
  modules: "Modules",
  comptable: "Plan comptable",
  paie: "Paramètres paie",
  workflows: "Workflows",
  integrations: "Intégrations",
  securite: "Sécurité & rôles",
  planning: "Planning",
};

function labelFor(segment: string) {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const tenant = useTenantStore((s) => s.tenant);
  const allParts = pathname.split("/").filter(Boolean);

  if (allParts.length === 0) return null;

  // Le 1ʳᵉ segment est le slug du tenant (ex: "batimcam-sa") — on l'affiche
  // sous forme du nom complet de l'entreprise et on construit les href
  // suivants relatifs en l'incluant.
  const isTenantPath = tenant && allParts[0] === tenant.slug;
  const tenantSegments = isTenantPath ? 1 : 0;
  const parts = allParts.slice(tenantSegments);

  const items: { href: string; isLast: boolean; label: string }[] = [];
  if (isTenantPath) {
    items.push({
      href: `/${tenant.slug}/dashboard`,
      isLast: parts.length === 0,
      label: tenant.name,
    });
  }
  parts.forEach((seg, i) => {
    const href = "/" + allParts.slice(0, tenantSegments + i + 1).join("/");
    const isLast = i === parts.length - 1;
    // Le segment 'dg' a deux significations selon le contexte :
    //   - /dashboard/dg → "Direction générale" (le tableau de bord du DG)
    //   - /dg/<fonction>   → "Espace DG" (le namespace des fonctions DG, Phase 2)
    const label =
      seg === "dg" && parts[i - 1] === "dashboard"
        ? "Direction générale"
        : seg === "daf" && i === 0
          ? "Espace DAF"
          : labelFor(seg);
    items.push({ href, isLast, label });
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-[12.5px] text-ink-3">
      {items.map(({ href, isLast, label }, i) => (
        <span key={`${href}-${i}`} className="flex items-center gap-1">
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
