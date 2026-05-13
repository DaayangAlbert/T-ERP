"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/ui-store";
import { useAuth } from "@/hooks/useAuth";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  Building2,
  Calendar,
  Wallet,
  FileText,
  Users,
  ShoppingCart,
  Package,
  Settings,
  Shield,
  User,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  Crown,
  Target,
  TrendingUp,
  ClipboardList,
  Briefcase,
  Coins,
  ScrollText,
  Receipt,
  GraduationCap,
  HardHat,
  ListChecks,
  Wrench,
  ClipboardCheck,
  Network,
  ShieldAlert,
  ShieldCheck,
  Truck,
  ArrowLeftRight,
  Store,
  PieChart,
  FolderOpen,
  Search,
  GitBranch,
  Tags,
  Archive,
  Scale,
  Mail,
  Landmark,
  Gavel,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: { value: string; alert?: boolean };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Section exclusive au DG, prependée au-dessus de NAV quand l'utilisateur a Role.DG.
const DG_SECTION: NavSection = {
  title: "Espace DG",
  items: [
    { label: "Tableau de bord DG", href: "/dashboard/dg", icon: Crown },
    { label: "Consolidation groupe", href: "/direction-generale/consolidation", icon: Building2 },
    { label: "Mes objectifs", href: "/direction-generale/objectifs", icon: Target },
    { label: "Trésorerie prévisionnelle", href: "/direction-generale/tresorerie-previsionnelle", icon: TrendingUp },
    { label: "Reporting CA", href: "/direction-generale/reporting-ca", icon: ClipboardList },
  ],
};

// Liens drill-down compacts : un seul lien d'entrée par espace métier pour
// le DG (au lieu de déplier 6 espaces complets soit 51 items dans la sidebar).
// Cliquer ouvre le tableau de bord de l'espace, depuis lequel le DG peut
// naviguer vers le détail s'il en a besoin.
const DG_DRILLDOWN_SECTION: NavSection = {
  title: "Drill-down métiers",
  items: [
    { label: "Vue Finance (DAF)", href: "/direction-financiere", icon: Briefcase },
    { label: "Vue RH", href: "/ressources-humaines", icon: Users },
    { label: "Vue Technique (DT)", href: "/direction-technique", icon: Wrench },
    { label: "Vue Comptabilité", href: "/comptable", icon: FileText },
    { label: "Vue Production terrain", href: "/directeur-travaux", icon: HardHat },
    { label: "Vue Stocks", href: "/magasin", icon: Package },
  ],
};

// Section exclusive à la Direction Technique (Daniel ESSOMBA).
const DT_SECTION: NavSection = {
  title: "Espace Direction Technique",
  items: [
    { label: "Tableau de bord", href: "/direction-technique", icon: LayoutDashboard },
    { label: "Portefeuille chantiers", href: "/direction-technique/portefeuille", icon: Building2, badge: { value: "23" } },
    { label: "Études et offres", href: "/direction-technique/etudes", icon: ClipboardList, badge: { value: "8" } },
    { label: "Méthodes et planification", href: "/direction-technique/methodes", icon: Wrench },
    { label: "Validation marchés", href: "/direction-technique/validations", icon: ClipboardCheck, badge: { value: "5", alert: true } },
    { label: "Plan de charge équipes", href: "/direction-technique/charge", icon: Network },
    { label: "Sous-traitance", href: "/direction-technique/sous-traitance", icon: HardHat, badge: { value: "42" } },
    { label: "QHSE", href: "/direction-technique/qhse", icon: ShieldAlert, badge: { value: "3", alert: true } },
    { label: "Rapports techniques", href: "/direction-technique/rapports", icon: BarChart3 },
    { label: "Mon espace DT", href: "/direction-technique/profil", icon: User },
  ],
};

// Section exclusive au Conducteur de Travaux (Samuel MBARGA · Pont Mfoundi · terrain).
const CDT_SECTION: NavSection = {
  title: "Espace Conducteur Travaux",
  items: [
    { label: "Tableau de bord", href: "/conducteur-travaux", icon: LayoutDashboard },
    { label: "Plan du jour", href: "/conducteur-travaux/plan", icon: ListChecks, badge: { value: "5", alert: true } },
    { label: "Contrôles qualité", href: "/conducteur-travaux/qualite", icon: ShieldCheck, badge: { value: "3" } },
    { label: "Sous-traitants", href: "/conducteur-travaux/soustraitants", icon: HardHat },
    { label: "Visites externes", href: "/conducteur-travaux/visites", icon: Briefcase },
    { label: "Réceptions techniques", href: "/conducteur-travaux/receptions", icon: ClipboardCheck },
  ],
};

// Section exclusive au Chef de Chantier (Jean KAMGA · PWA offline-first absolu).
const CC_SECTION: NavSection = {
  title: "Espace Chef Chantier",
  items: [
    { label: "Tableau de bord", href: "/chef-chantier", icon: LayoutDashboard },
    { label: "Pointage équipes", href: "/chef-chantier/pointage", icon: ClipboardCheck },
    { label: "Production", href: "/chef-chantier/production", icon: ClipboardList },
    { label: "Réceptions", href: "/chef-chantier/livraisons", icon: Package },
    { label: "HSE & incidents", href: "/chef-chantier/hse", icon: ShieldAlert },
    { label: "Mes équipes", href: "/chef-chantier/equipes", icon: Users },
  ],
};

// Section exclusive au Directeur de Travaux (Paul ETOUNDI · terrain mobile-first).
const DTRAV_SECTION: NavSection = {
  title: "Espace Directeur Travaux",
  items: [
    { label: "Tableau de bord chantier", href: "/directeur-travaux", icon: LayoutDashboard },
    { label: "Production journalière", href: "/directeur-travaux/production", icon: ClipboardList },
    { label: "Équipe chantier", href: "/directeur-travaux/equipe", icon: Users },
    { label: "Planning", href: "/directeur-travaux/planning", icon: Calendar },
    { label: "Marché et avenants", href: "/directeur-travaux/marche", icon: FileText },
    { label: "Approvisionnements", href: "/directeur-travaux/appros", icon: Package },
    { label: "Documents chantier", href: "/directeur-travaux/documents", icon: FileText },
    { label: "Validations N1", href: "/directeur-travaux/validations", icon: CheckCircle2 },
    { label: "Reporting MOA", href: "/directeur-travaux/reporting", icon: BarChart3 },
    { label: "Mon espace", href: "/directeur-travaux/profil", icon: User },
  ],
};

// Section exclusive à la RH (Sandrine ONANA).
const RH_SECTION: NavSection = {
  title: "Espace RH",
  items: [
    { label: "Tableau de bord RH", href: "/ressources-humaines", icon: LayoutDashboard },
    { label: "Personnel", href: "/ressources-humaines/personnel", icon: Users, badge: { value: "487" } },
    { label: "Saisie de paie", href: "/ressources-humaines/paie", icon: CreditCard, badge: { value: "Avr", alert: true } },
    { label: "Recrutement", href: "/ressources-humaines/recrutement", icon: Briefcase, badge: { value: "12" } },
    { label: "Congés & absences", href: "/ressources-humaines/conges", icon: Calendar, badge: { value: "7", alert: true } },
    { label: "Formations", href: "/ressources-humaines/formations", icon: GraduationCap },
    { label: "Visites médicales", href: "/ressources-humaines/medical", icon: ScrollText, badge: { value: "5", alert: true } },
    { label: "Disciplinaire", href: "/ressources-humaines/disciplinaire", icon: Shield, badge: { value: "3" } },
    { label: "Validations N1 RH", href: "/ressources-humaines/validations", icon: CheckCircle2 },
    { label: "Rapports RH", href: "/ressources-humaines/rapports", icon: BarChart3 },
  ],
};

// Section exclusive au Candidat externe (compte CANDIDATE).
const CAND_SECTION: NavSection = {
  title: "Espace Candidat",
  items: [
    { label: "Tableau de bord", href: "/cand", icon: LayoutDashboard },
    { label: "Mon profil", href: "/cand/profil", icon: User },
    { label: "Mes candidatures", href: "/cand/candidatures", icon: ClipboardList },
    { label: "Mes entretiens", href: "/cand/entretiens", icon: Calendar },
    { label: "Offres recommandées", href: "/cand/offres", icon: Briefcase },
  ],
};

// Section exclusive à l'Informaticien d'entreprise (Étienne ONANA).
const IT_SECTION: NavSection = {
  title: "Espace Informaticien",
  items: [
    { label: "Tableau de bord IT", href: "/informatique", icon: LayoutDashboard },
    { label: "Utilisateurs", href: "/informatique/users", icon: Users },
    { label: "Paramètres tenant", href: "/informatique/settings", icon: Settings },
    { label: "Chantiers (admin)", href: "/informatique/sites", icon: Building2 },
    { label: "Intégrations", href: "/informatique/integrations", icon: Network },
  ],
};

// Section exclusive au Magasinier (Lucas TIENTCHEU). PWA mobile-first.
const MAG_SECTION: NavSection = {
  title: "Espace Magasinier",
  items: [
    { label: "Tableau de bord", href: "/magasin", icon: LayoutDashboard },
    { label: "Entrées stock", href: "/magasin/entrees", icon: Package },
    { label: "Sorties stock", href: "/magasin/sorties", icon: ShoppingCart },
    { label: "Catalogue", href: "/magasin/catalogue", icon: ClipboardList },
    { label: "Inventaires", href: "/magasin/inventaires", icon: ClipboardCheck },
    { label: "Mouvements", href: "/magasin/mouvements", icon: ScrollText },
  ],
};

// Section exclusive au Logisticien (Robert ETONDÉ · siège, vue 23 chantiers).
const LOG_SECTION: NavSection = {
  title: "Espace Logisticien",
  items: [
    { label: "Tableau de bord", href: "/logistique", icon: LayoutDashboard },
    { label: "Bons de commande", href: "/logistique/bc", icon: ClipboardList, badge: { value: "8", alert: true } },
    { label: "Fournisseurs", href: "/logistique/fournisseurs", icon: Store, badge: { value: "86" } },
    { label: "Flotte engins", href: "/logistique/flotte", icon: Truck, badge: { value: "42" } },
    { label: "Transferts", href: "/logistique/transferts", icon: ArrowLeftRight, badge: { value: "4", alert: true } },
    { label: "Statistiques achats", href: "/logistique/stats", icon: PieChart },
  ],
};

// Section exclusive au Référent documentaire / GED (Christelle EYENGA · ARCHIVIST).
// Profil transverse au siège : structure les 28 espaces documentaires de l'entreprise.
const GED_SECTION: NavSection = {
  title: "Espace GED",
  items: [
    { label: "Tableau de bord", href: "/gestion-documentaire", icon: LayoutDashboard },
    { label: "Espaces documentaires", href: "/gestion-documentaire/espaces", icon: FolderOpen, badge: { value: "28" } },
    { label: "Workflows", href: "/gestion-documentaire/workflows", icon: GitBranch, badge: { value: "12", alert: true } },
    { label: "Nomenclature", href: "/gestion-documentaire/nomenclature", icon: Tags, badge: { value: "72" } },
    { label: "Recherche & archivage", href: "/gestion-documentaire/recherche", icon: Search },
    { label: "Audit & conformité", href: "/gestion-documentaire/audit", icon: Archive, badge: { value: "5", alert: true } },
  ],
};

// Section exclusive au Secrétaire Général (Élisabeth NDONGMO · SECRETARY_GENERAL).
// Profil cadre dirigeant au siège : gouvernance corporate + marchés clients +
// contentieux + conformité OHADA + courriers officiels.
const SG_SECTION: NavSection = {
  title: "Espace SG",
  items: [
    { label: "Tableau de bord", href: "/secretaire-general", icon: LayoutDashboard },
    { label: "Marchés & contrats", href: "/secretaire-general/marches", icon: ScrollText, badge: { value: "6" } },
    { label: "CA & Gouvernance", href: "/secretaire-general/gouvernance", icon: Landmark, badge: { value: "23j", alert: true } },
    { label: "Contentieux", href: "/secretaire-general/contentieux", icon: Gavel, badge: { value: "4", alert: true } },
    { label: "Conformité", href: "/secretaire-general/conformite", icon: Scale },
    { label: "Institutionnel", href: "/secretaire-general/institutionnel", icon: Briefcase },
    { label: "Courriers officiels", href: "/secretaire-general/courriers", icon: Mail, badge: { value: "12" } },
  ],
};

// Section exclusive au Comptable (Direction OU Chantier — adapté côté UI via assignedSiteIds).
const CPT_SECTION: NavSection = {
  title: "Espace Comptabilité",
  items: [
    { label: "Tableau de bord", href: "/comptable", icon: LayoutDashboard },
    { label: "Saisie d'écritures", href: "/comptable/ecritures", icon: ClipboardList },
    { label: "Factures fournisseurs", href: "/comptable/factures-frns", icon: Receipt },
    { label: "Situations clients", href: "/comptable/factures-clients", icon: FileText },
    { label: "Trésorerie", href: "/comptable/tresorerie", icon: Coins },
    { label: "Actifs", href: "/comptable/actifs", icon: Package },
    { label: "Fiscalité", href: "/comptable/fiscal", icon: ScrollText },
    { label: "Grand livre", href: "/comptable/grand-livre", icon: BarChart3 },
    { label: "Validations N1", href: "/comptable/validations", icon: CheckCircle2 },
    { label: "Rapports comptables", href: "/comptable/rapports", icon: FileText },
    { label: "Mon espace", href: "/comptable/profil", icon: User },
  ],
};

// Section exclusive au DAF (visible aussi au DG en lecture).
const DAF_SECTION: NavSection = {
  title: "Espace DAF",
  items: [
    { label: "Tableau de bord DAF", href: "/direction-financiere", icon: Briefcase },
    { label: "Trésorerie temps réel", href: "/direction-financiere/tresorerie", icon: Coins },
    { label: "Validations N2", href: "/direction-financiere/validations", icon: CheckCircle2, badge: { value: "5", alert: true } },
    { label: "Cycle de paie", href: "/direction-financiere/paie", icon: CreditCard },
    { label: "Recouvrement", href: "/direction-financiere/recouvrement", icon: Receipt, badge: { value: "8", alert: true } },
    { label: "Fiscalité", href: "/direction-financiere/fiscal", icon: ScrollText },
    { label: "Comptabilité (DAF)", href: "/direction-financiere/comptabilite", icon: FileText },
    { label: "Finances (DAF)", href: "/direction-financiere/finances", icon: Wallet },
    { label: "Achats (DAF)", href: "/direction-financiere/achats", icon: ShoppingCart },
    { label: "Rapports financiers", href: "/direction-financiere/rapports", icon: BarChart3 },
    { label: "RH financier", href: "/direction-financiere/rh", icon: Users },
    { label: "Ma rémunération DAF", href: "/direction-financiere/paie-perso", icon: CreditCard },
  ],
};

const NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Rapports consolidés", href: "/rapports", icon: BarChart3 },
      { label: "Mes validations", href: "/validations", icon: CheckCircle2, badge: { value: "7", alert: true } },
    ],
  },
  {
    title: "Activité",
    items: [
      { label: "Chantiers", href: "/chantiers", icon: Building2, badge: { value: "23" } },
      { label: "Planning", href: "/planning", icon: Calendar },
      { label: "Finances", href: "/finances", icon: Wallet },
      { label: "Comptabilité", href: "/comptabilite", icon: FileText },
      { label: "Ressources humaines", href: "/ressources-humaines", icon: Users },
      { label: "Achats", href: "/achats", icon: ShoppingCart },
      { label: "Stocks & matériel", href: "/stocks", icon: Package },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Configuration", href: "/configuration", icon: Settings },
      { label: "Sécurité & rôles", href: "/securite", icon: Shield },
    ],
  },
  {
    title: "Mon espace",
    items: [
      { label: "Mon profil", href: "/profil", icon: User },
      { label: "Ma paie", href: "/paie", icon: CreditCard },
      { label: "Messagerie", href: "/messagerie", icon: MessageSquare, badge: { value: "3" } },
    ],
  },
];

/**
 * Effective sidebar width:
 *   < md (768)  → mobile drawer (260px) overlaying content, hidden by default
 *   md to xl-1  → always compact (64px), no toggle
 *   xl+ (1280)  → respects sidebarCompact toggle
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCompact, toggleSidebarCompact, mobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const { user } = useAuth();
  // Chaque rôle dispose d'un espace dédié prepended (DG, DAF, RH, DT, CPT, DTRAV, CC, MAG).
  // On élague la NAV générique pour éviter doublons et items hors-périmètre.
  //
  // Règles :
  // - "Tableau de bord" (Pilotage) retiré pour tout rôle qui a son propre tableau de bord dédié.
  // - "Activité" : chaque rôle masque les sphères qui ne sont pas dans son périmètre métier ou
  //   qui sont déjà couvertes par son espace dédié.
  //   • Tout le monde garde "Chantiers" et "Planning" (transverse).
  // - "Administration" (Configuration + Sécurité & rôles) : réservé TENANT_ADMIN et SUPER_ADMIN.
  //   Le DG la conserve pour supervision.
  const ROLES_WITH_DEDICATED_DASHBOARD = new Set([
    "DG", "DAF", "HR", "TECH_DIRECTOR", "ACCOUNTANT",
    "WORKS_DIRECTOR", "SITE_MANAGER", "WAREHOUSE", "LOGISTICS", "ARCHIVIST", "SECRETARY_GENERAL",
  ]);
  const ACTIVITY_HIDDEN_BY_ROLE: Record<string, Set<string>> = {
    DG:             new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    DAF:            new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    HR:             new Set(["/ressources-humaines", "/finances", "/comptabilite", "/achats", "/stocks"]),
    TECH_DIRECTOR:  new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    ACCOUNTANT:     new Set(["/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    LOGISTICS:      new Set(["/finances", "/comptabilite", "/ressources-humaines"]),
    ARCHIVIST:      new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    SECRETARY_GENERAL: new Set(["/finances", "/comptabilite", "/achats", "/stocks"]),
    WORKS_DIRECTOR: new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    SITE_MANAGER:   new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
    WAREHOUSE:      new Set(["/finances", "/comptabilite", "/ressources-humaines", "/achats", "/stocks"]),
  };
  const HIDES_ADMIN_SECTION = new Set([
    "DAF", "HR", "TECH_DIRECTOR", "ACCOUNTANT",
    "WORKS_DIRECTOR", "SITE_MANAGER", "WAREHOUSE", "LOGISTICS", "ARCHIVIST", "SECRETARY_GENERAL",
  ]);
  const role = user?.role ?? "";
  const cleanedNav = NAV.map((section) => {
    if (section.title === "Pilotage" && ROLES_WITH_DEDICATED_DASHBOARD.has(role)) {
      return { ...section, items: section.items.filter((i) => i.href !== "/dashboard") };
    }
    if (section.title === "Activité") {
      const hidden = ACTIVITY_HIDDEN_BY_ROLE[role];
      if (hidden) {
        return { ...section, items: section.items.filter((i) => !hidden.has(i.href)) };
      }
    }
    if (section.title === "Administration" && HIDES_ADMIN_SECTION.has(role)) {
      return { ...section, items: [] };
    }
    return section;
  }).filter((s) => s.items.length > 0);
  const sections: NavSection[] =
    user?.role === "HR"
      ? [RH_SECTION, ...cleanedNav]
      : user?.role === "DAF"
        ? [DAF_SECTION, CPT_SECTION, ...cleanedNav]
        : user?.role === "DG"
          ? [DG_SECTION, DG_DRILLDOWN_SECTION, ...cleanedNav]
          : user?.role === "TECH_DIRECTOR"
            ? [DT_SECTION, DTRAV_SECTION, CDT_SECTION, CC_SECTION, MAG_SECTION, ...cleanedNav]
            : user?.role === "ACCOUNTANT"
              ? [CPT_SECTION, ...cleanedNav]
              : user?.role === "WORKS_DIRECTOR"
                ? [DTRAV_SECTION, CDT_SECTION, CC_SECTION, MAG_SECTION, ...cleanedNav]
                : user?.role === "WORKS_MANAGER"
                  ? [CDT_SECTION, CC_SECTION, MAG_SECTION, ...cleanedNav]
                  : user?.role === "SITE_MANAGER"
                    ? [CC_SECTION, MAG_SECTION, ...cleanedNav]
                    : user?.role === "WAREHOUSE"
                      ? [MAG_SECTION, ...cleanedNav]
                      : user?.role === "LOGISTICS"
                        ? [LOG_SECTION, ...cleanedNav]
                        : user?.role === "TENANT_ADMIN"
                          ? [IT_SECTION, ...cleanedNav]
                          : user?.role === "ARCHIVIST"
                            ? [GED_SECTION, ...cleanedNav]
                            : user?.role === "SECRETARY_GENERAL"
                              ? [SG_SECTION, ...cleanedNav]
                              : user?.role === "CANDIDATE"
                                ? [CAND_SECTION]
                                : NAV;

  // SSR-safe: assume widescreen until client measures
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = windowWidth !== null && windowWidth < 768;
  // Sidebar toujours étendue par défaut sur md+ ; mode compact uniquement si l'utilisateur
  // l'a explicitement activé via le toggle (visible sur xl+).
  const visualCompact = !isMobile && sidebarCompact;

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileSidebarOpen) closeMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          "fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileSidebar}
        aria-hidden
      />

      <aside
        className={clsx(
          "z-40 overflow-y-auto overflow-x-hidden bg-sidebar-bg text-sidebar-text border-r border-[#1F1230]",
          "transition-[width,transform] duration-200",
          // Mobile: fixed drawer
          "fixed inset-y-0 left-0 top-14 h-[calc(100vh-3.5rem)] w-[260px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          // md+ : sticky, never translated
          "md:sticky md:top-14 md:translate-x-0 md:h-[calc(100vh-3.5rem)]",
          // md+ : largeur pleine par défaut (libellés visibles)
          // xl+ : respecte le toggle compact si l'utilisateur l'active
          sidebarCompact ? "md:w-16" : "md:w-[220px]"
        )}
        aria-label="Navigation principale"
      >
        {/* Toggle disponible dès md+ (la sidebar n'est plus auto-compactée) */}
        <div
          className={clsx(
            "hidden items-center border-b border-white/8 py-1.5 px-2.5 md:flex",
            sidebarCompact && "justify-center px-0"
          )}
        >
          <button
            onClick={toggleSidebarCompact}
            className="ml-auto grid h-7 w-7 place-items-center rounded text-white/50 hover:bg-white/8 hover:text-white"
            aria-label="Réduire/étendre"
          >
            <ChevronLeft
              className={clsx("h-4 w-4 transition-transform", sidebarCompact && "rotate-180")}
            />
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            {visualCompact ? (
              // Mode compact (64 px) : on remplace le titre par un simple séparateur
              // (les classes text-[0px]/text-transparent étaient écrasées par
              // text-[10px]/text-white/45 — les libellés restaient tronqués).
              <div
                className="mt-2 border-t border-white/8 first:mt-0 first:border-t-0"
                aria-label={section.title}
              />
            ) : (
              <div className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={visualCompact ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group relative flex items-center gap-2.5 px-4 py-1.5 text-[13px]",
                    "border-l-[3px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-inset",
                    active
                      ? "border-primary-500 bg-white/8 font-medium text-white"
                      : "border-transparent text-white/78 hover:bg-white/8 hover:text-white",
                    visualCompact && "justify-center px-0 py-2.5"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 opacity-85" />
                  {!visualCompact && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge && (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 text-[10px] font-semibold",
                        visualCompact && "absolute right-2 top-1 px-1 text-[9px]",
                        item.badge.alert
                          ? "bg-red-500 text-white"
                          : "bg-white/10 text-white/85"
                      )}
                    >
                      {item.badge.value}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}
