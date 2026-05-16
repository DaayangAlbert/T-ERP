/**
 * Définition centrale des sections sidebar par module.
 *
 * Pour chaque module métier, on déclare :
 *   - `full`  : la section détaillée (tous les items du module) — utilisée
 *               quand l'utilisateur a un access FULL sur ce module.
 *   - `read`  : l'item d'entrée unique pour drill-down — utilisé quand
 *               l'utilisateur a un access READ (ex: DG sur DAF/RH/DT).
 *
 * La logique de composition (qui voit quoi) vit dans `getSidebarSections()`.
 * Elle remplace la cascade géante de ternaires dans Sidebar.tsx.
 */
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
import { Role } from "@prisma/client";
import { MODULES, type Module } from "@/lib/rbac/modules";
import {
  getAccess,
  getAccessibleModules,
} from "@/lib/rbac/access-matrix";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: { value: string; alert?: boolean };
  /**
   * Masque cet item quand le rôle qui consulte la sidebar est dans la liste.
   * Utile pour qu'un superviseur (ex. DAF) ne voie pas les items qui font
   * doublon avec son propre menu (ex. Tableau de bord du comptable).
   */
  hideForRoles?: Role[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
  /** Si true, indique au composant Sidebar de styliser cette section comme "lecture seule". */
  readOnly?: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Sections complètes par module (vue FULL — pour le rôle propriétaire)
// ════════════════════════════════════════════════════════════════════════

const FULL: Record<Module, NavSection> = {
  DG: {
    title: "Espace DG",
    items: [
      { label: "Tableau de bord DG", href: "/dashboard/dg", icon: Crown },
      { label: "Consolidation groupe", href: "/direction-generale/consolidation", icon: Building2 },
      { label: "Mes objectifs", href: "/direction-generale/objectifs", icon: Target },
      { label: "Trésorerie prévisionnelle", href: "/direction-generale/tresorerie-previsionnelle", icon: TrendingUp },
      { label: "Reporting CA", href: "/direction-generale/reporting-ca", icon: ClipboardList },
    ],
  },
  DAF: {
    title: "Espace DAF",
    items: [
      { label: "Tableau de bord DAF", href: "/direction-financiere", icon: Briefcase },
      { label: "Trésorerie temps réel", href: "/direction-financiere/tresorerie", icon: Coins },
      { label: "Comptabilité", href: "/direction-financiere/comptabilite", icon: FileText },
      { label: "Pilotage financier", href: "/direction-financiere/finances", icon: TrendingUp },
      { label: "Validations N2", href: "/direction-financiere/validations", icon: CheckCircle2, badge: { value: "5", alert: true } },
      { label: "Cycle de paie", href: "/direction-financiere/paie", icon: CreditCard },
      { label: "Achats & engagements", href: "/direction-financiere/achats", icon: ShoppingCart },
      { label: "Recouvrement", href: "/direction-financiere/recouvrement", icon: Receipt, badge: { value: "8", alert: true } },
      { label: "Circuits de paiement", href: "/direction-financiere/circuits-paiement", icon: GitBranch },
      { label: "RH financier", href: "/direction-financiere/rh", icon: Users },
      { label: "Fiscalité", href: "/direction-financiere/fiscal", icon: ScrollText },
      { label: "Rapports & exports", href: "/direction-financiere/rapports", icon: BarChart3 },
      { label: "Suivi paiement assigné", href: "/suivi-paiement", icon: ClipboardCheck },
      { label: "Mon espace DAF", href: "/direction-financiere/profil", icon: User },
    ],
  },
  RH: {
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
  },
  DT: {
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
    ],
  },
  SG: {
    title: "Espace SG",
    items: [
      { label: "Tableau de bord", href: "/secretaire-general", icon: LayoutDashboard },
      { label: "Marchés & contrats", href: "/secretaire-general/marches", icon: ScrollText, badge: { value: "6" } },
      { label: "CA & Gouvernance", href: "/secretaire-general/gouvernance", icon: Landmark, badge: { value: "23j", alert: true } },
      { label: "Contentieux", href: "/secretaire-general/contentieux", icon: Gavel, badge: { value: "4", alert: true } },
      { label: "Conformité", href: "/secretaire-general/conformite", icon: Scale },
      { label: "Institutionnel", href: "/secretaire-general/institutionnel", icon: Briefcase },
      { label: "Courriers officiels", href: "/secretaire-general/courriers", icon: Mail, badge: { value: "12" } },
      { label: "Suivi paiement assigné", href: "/suivi-paiement", icon: ClipboardCheck },
    ],
  },
  DTRAV: {
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
    ],
  },
  CDT: {
    title: "Espace Conducteur Travaux",
    items: [
      { label: "Tableau de bord", href: "/conducteur-travaux", icon: LayoutDashboard },
      { label: "Plan du jour", href: "/conducteur-travaux/plan", icon: ListChecks, badge: { value: "5", alert: true } },
      { label: "Contrôles qualité", href: "/conducteur-travaux/qualite", icon: ShieldCheck, badge: { value: "3" } },
      { label: "Sous-traitants", href: "/conducteur-travaux/soustraitants", icon: HardHat },
      { label: "Visites externes", href: "/conducteur-travaux/visites", icon: Briefcase },
      { label: "Réceptions techniques", href: "/conducteur-travaux/receptions", icon: ClipboardCheck },
    ],
  },
  CC: {
    title: "Espace Chef Chantier",
    items: [
      { label: "Tableau de bord", href: "/chef-chantier", icon: LayoutDashboard },
      { label: "Pointage équipes", href: "/chef-chantier/pointage", icon: ClipboardCheck },
      { label: "Production", href: "/chef-chantier/production", icon: ClipboardList },
      { label: "Réceptions", href: "/chef-chantier/livraisons", icon: Package },
      { label: "HSE & incidents", href: "/chef-chantier/hse", icon: ShieldAlert },
      { label: "Mes équipes", href: "/chef-chantier/equipes", icon: Users },
    ],
  },
  OUV: {
    title: "Espace Ouvrier",
    items: [
      { label: "Accueil", href: "/ouv/dashboard", icon: LayoutDashboard },
      { label: "Pointer", href: "/ouv/pointage", icon: ClipboardCheck },
      { label: "Ma paie", href: "/ouv/paie", icon: CreditCard },
      { label: "Mes congés", href: "/ouv/conges", icon: Calendar },
      { label: "Mes missions", href: "/ouv/missions", icon: ClipboardList },
      { label: "Mon profil", href: "/ouv/profil", icon: User },
    ],
  },
  CPT: {
    title: "Espace Comptabilité",
    items: [
      { label: "Tableau de bord", href: "/comptable", icon: LayoutDashboard, hideForRoles: [Role.DAF] },
      { label: "Saisie d'écritures", href: "/comptable/ecritures", icon: ClipboardList },
      { label: "Factures fournisseurs", href: "/comptable/factures-frns", icon: Receipt },
      { label: "Situations clients", href: "/comptable/factures-clients", icon: FileText },
      { label: "Trésorerie", href: "/comptable/tresorerie", icon: Coins },
      { label: "Actifs", href: "/comptable/actifs", icon: Package },
      { label: "Fiscalité", href: "/comptable/fiscal", icon: ScrollText, hideForRoles: [Role.DAF] },
      { label: "Grand livre", href: "/comptable/grand-livre", icon: BarChart3 },
      { label: "Validations N1", href: "/comptable/validations", icon: CheckCircle2 },
      { label: "Suivi paiement assigné", href: "/suivi-paiement", icon: ClipboardCheck },
    ],
  },
  LOG: {
    title: "Espace Logisticien",
    items: [
      { label: "Tableau de bord", href: "/logistique", icon: LayoutDashboard },
      { label: "Bons de commande", href: "/logistique/bc", icon: ClipboardList, badge: { value: "8", alert: true } },
      { label: "Fournisseurs", href: "/logistique/fournisseurs", icon: Store, badge: { value: "86" } },
      { label: "Flotte engins", href: "/logistique/flotte", icon: Truck, badge: { value: "42" } },
      { label: "Transferts", href: "/logistique/transferts", icon: ArrowLeftRight, badge: { value: "4", alert: true } },
      { label: "Statistiques achats", href: "/logistique/stats", icon: PieChart },
    ],
  },
  MAG: {
    title: "Espace Magasinier",
    items: [
      { label: "Tableau de bord", href: "/magasin", icon: LayoutDashboard },
      { label: "Entrées stock", href: "/magasin/entrees", icon: Package },
      { label: "Sorties stock", href: "/magasin/sorties", icon: ShoppingCart },
      { label: "Catalogue", href: "/magasin/catalogue", icon: ClipboardList },
      { label: "Inventaires", href: "/magasin/inventaires", icon: ClipboardCheck },
      { label: "Mouvements", href: "/magasin/mouvements", icon: ScrollText },
    ],
  },
  GED: {
    title: "Espace GED",
    items: [
      { label: "Tableau de bord", href: "/gestion-documentaire", icon: LayoutDashboard },
      { label: "Espaces documentaires", href: "/gestion-documentaire/espaces", icon: FolderOpen, badge: { value: "28" } },
      { label: "Workflows", href: "/gestion-documentaire/workflows", icon: GitBranch, badge: { value: "12", alert: true } },
      { label: "Nomenclature", href: "/gestion-documentaire/nomenclature", icon: Tags, badge: { value: "72" } },
      { label: "Recherche & archivage", href: "/gestion-documentaire/recherche", icon: Search },
      { label: "Audit & conformité", href: "/gestion-documentaire/audit", icon: Archive, badge: { value: "5", alert: true } },
    ],
  },
  IT: {
    title: "Espace Informaticien",
    items: [
      { label: "Tableau de bord IT", href: "/informatique", icon: LayoutDashboard },
      { label: "Utilisateurs", href: "/informatique/users", icon: Users },
      { label: "Paramètres tenant", href: "/informatique/settings", icon: Settings },
      { label: "Chantiers (admin)", href: "/informatique/sites", icon: Building2 },
      { label: "Intégrations", href: "/informatique/integrations", icon: Network },
    ],
  },
  EMP: {
    title: "Mon espace",
    items: [
      { label: "Mon profil", href: "/employe/profil", icon: User },
      { label: "Ma paie", href: "/employe/paie", icon: CreditCard },
      { label: "Mes congés", href: "/employe/conges", icon: Calendar },
      { label: "Messagerie", href: "/messagerie", icon: MessageSquare, badge: { value: "3" } },
    ],
  },
  CAND: {
    title: "Espace Candidat",
    items: [
      { label: "Tableau de bord", href: "/cand", icon: LayoutDashboard },
      { label: "Mon profil", href: "/cand/profil", icon: User },
      { label: "Mes candidatures", href: "/cand/candidatures", icon: ClipboardList },
      { label: "Mes entretiens", href: "/cand/entretiens", icon: Calendar },
      { label: "Offres recommandées", href: "/cand/offres", icon: Briefcase },
    ],
  },
  PLATFORM: {
    title: "Console Plateforme",
    items: [{ label: "Tenants", href: "/tenants", icon: Building2 }],
  },
};

// ════════════════════════════════════════════════════════════════════════
// Entrée drill-down compacte (vue READ — un seul lien par module)
// ════════════════════════════════════════════════════════════════════════

const READ_ITEM: Record<Module, NavItem> = {
  DG: { label: "Vue Direction Générale", href: "/direction-generale", icon: Crown },
  DAF: { label: "Vue Finance (DAF)", href: "/direction-financiere", icon: Briefcase },
  RH: { label: "Vue RH", href: "/ressources-humaines", icon: Users },
  DT: { label: "Vue Technique (DT)", href: "/direction-technique", icon: Wrench },
  SG: { label: "Vue Gouvernance (SG)", href: "/secretaire-general", icon: Landmark },
  DTRAV: { label: "Vue Production terrain", href: "/directeur-travaux", icon: HardHat },
  CDT: { label: "Vue Conduite Travaux", href: "/conducteur-travaux", icon: ListChecks },
  CC: { label: "Vue Chefs Chantier", href: "/chef-chantier", icon: ClipboardCheck },
  OUV: { label: "Vue Ouvriers", href: "/ouv/dashboard", icon: HardHat },
  CPT: { label: "Vue Comptabilité", href: "/comptable", icon: FileText },
  LOG: { label: "Vue Logistique", href: "/logistique", icon: Truck },
  MAG: { label: "Vue Stocks (Magasin)", href: "/magasin", icon: Package },
  GED: { label: "Vue Documentaire", href: "/gestion-documentaire", icon: FolderOpen },
  IT: { label: "Vue IT", href: "/informatique", icon: Settings },
  EMP: { label: "Espace personnel", href: "/employe", icon: User },
  CAND: { label: "Espace candidat", href: "/cand", icon: User },
  PLATFORM: { label: "Console plateforme", href: "/tenants", icon: Building2 },
};

/**
 * Construit la sidebar pour un rôle donné en lisant la matrice d'accès.
 *
 * Composition :
 *   1) Section(s) FULL pour les modules dont le rôle est propriétaire.
 *   2) Une section "Drill-down" regroupant les vues READ (si ≥ 1 module READ).
 *   3) Section "Mon espace" (EMP) si le rôle a OWN sur EMP — déjà inclus
 *      en FULL si applicable.
 *
 * Exemple — DG :
 *   - FULL : DG → section "Espace DG" (5 items)
 *   - READ : DAF, RH, DT, SG, DTRAV, CDT, CC, CPT, LOG, MAG, GED → section
 *     "Drill-down métiers" (11 items condensés)
 */
export function getSidebarSections(role: Role | null | undefined): NavSection[] {
  if (!role) return [];

  const accessible = getAccessibleModules(role);
  const fullModules: Module[] = [];
  const readModules: Module[] = [];
  const ownModules: Module[] = [];

  for (const m of accessible) {
    const a = getAccess(role, m);
    if (a.level === "FULL" || a.level === "SCOPE") fullModules.push(m);
    else if (a.level === "READ") readModules.push(m);
    else if (a.level === "OWN") ownModules.push(m);
  }

  const sections: NavSection[] = [];

  // 1) Sections complètes pour les modules propriétaires. Filtre les items
  //    marqués `hideForRoles` quand le rôle visiteur y est listé (anti-doublon
  //    superviseur — ex: le DAF voit Espace Comptabilité sans son "Tableau de
  //    bord" puisqu'il a déjà le sien dans /direction-financiere).
  for (const m of fullModules) {
    const section = FULL[m];
    const filteredItems = section.items.filter(
      (item) => !item.hideForRoles?.includes(role)
    );
    sections.push({ ...section, items: filteredItems });
  }

  // 2) Drill-down compact (si rôle lit ≥ 1 module autre que les siens)
  if (readModules.length > 0) {
    sections.push({
      title: "Drill-down (lecture)",
      readOnly: true,
      items: readModules.map((m) => READ_ITEM[m]),
    });
  }

  // 3) "Mon espace" personnel pour les rôles qui ont OWN sur EMP (mais pas FULL)
  if (ownModules.includes(MODULES.EMP) && !fullModules.includes(MODULES.EMP)) {
    sections.push(FULL.EMP);
  }

  return sections;
}
