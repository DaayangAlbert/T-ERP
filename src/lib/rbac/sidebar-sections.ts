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
  FolderArchive,
  Scale,
  Mail,
  Landmark,
  Gavel,
  History,
  Clock,
  Lock,
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

// Sous-sections DG — la sidebar DG est split en 3 thématiques pour
// rester lisible (la composition est faite dans `getSidebarSections`).
const DG_PILOTAGE: NavSection = {
  title: "Pilotage",
  items: [
    { label: "Tableau de bord DG", href: "/dashboard/dg", icon: Crown },
    { label: "Consolidation groupe", href: "/direction-generale/consolidation", icon: Building2 },
    { label: "Mes objectifs", href: "/direction-generale/objectifs", icon: Target },
  ],
};

const DG_FINANCE: NavSection = {
  title: "Finance & trésorerie",
  items: [
    { label: "Trésorerie prévisionnelle", href: "/direction-generale/tresorerie-previsionnelle", icon: TrendingUp },
    { label: "Reporting CA", href: "/direction-generale/reporting-ca", icon: ClipboardList },
    { label: "Recouvrements en cours", href: "/direction-generale/recouvrements", icon: Receipt },
    { label: "Personnel & coûts", href: "/direction-generale/personnel", icon: Users },
    { label: "Historique trésorerie", href: "/historique-tresorerie", icon: History },
  ],
};

const DG_VALIDATIONS: NavSection = {
  title: "Validations & rapports",
  items: [
    { label: "Validations N3", href: "/direction-generale/validations", icon: CheckCircle2, badge: { value: "0", alert: true } },
    { label: "Rapports DAF à valider", href: "/direction-generale/rapports-daf", icon: Coins },
    { label: "Rapports DT à valider", href: "/direction-generale/rapports-dt", icon: FileText },
    { label: "Rapports DTrav à valider", href: "/direction-generale/rapports-dtrav", icon: FileText },
    { label: "Rapports QHSE à valider", href: "/direction-generale/rapports-qhse", icon: ShieldAlert },
  ],
};

const DG_STRATEGIE: NavSection = {
  title: "Stratégie & risques",
  items: [
    { label: "Calendrier & décisions", href: "/direction-generale/gouvernance", icon: Landmark },
    { label: "Suivi contentieux", href: "/direction-generale/contentieux-consolide", icon: Gavel },
    { label: "Engagements financiers", href: "/direction-generale/engagements", icon: Wallet },
    { label: "Conformité & agréments", href: "/direction-generale/conformite-synthese", icon: ShieldCheck },
    { label: "Pipeline commercial", href: "/direction-generale/pipeline-commercial", icon: Target },
    { label: "Fournisseurs", href: "/direction-generale/fournisseurs", icon: Building2 },
  ],
};

// Sous-sections DAF — même logique que DG : sidebar split en 4 thématiques
// pour rester lisible. La composition est faite dans `getSidebarSections`.
const DAF_PILOTAGE: NavSection = {
  title: "Pilotage",
  items: [
    { label: "Tableau de bord DAF", href: "/direction-financiere", icon: Briefcase },
    { label: "Pilotage financier", href: "/direction-financiere/finances", icon: TrendingUp },
    { label: "Mon espace DAF", href: "/direction-financiere/profil", icon: User },
  ],
};

const DAF_TRESORERIE: NavSection = {
  title: "Trésorerie",
  items: [
    { label: "Trésorerie temps réel", href: "/direction-financiere/tresorerie", icon: Coins },
    { label: "Historique trésorerie", href: "/historique-tresorerie", icon: History },
    { label: "Recouvrement", href: "/direction-financiere/recouvrement", icon: Receipt, badge: { value: "8", alert: true } },
  ],
};

const DAF_COMPTA: NavSection = {
  title: "Comptabilité",
  items: [
    { label: "Comptabilité analytique", href: "/direction-financiere/comptes-projets", icon: PieChart },
    { label: "Comptabilité générale", href: "/direction-financiere/comptabilite", icon: FileText },
    { label: "Fiscalité", href: "/direction-financiere/fiscal", icon: ScrollText },
  ],
};

const DAF_CYCLES: NavSection = {
  title: "Cycles de gestion",
  items: [
    { label: "Cycle de paie", href: "/direction-financiere/paie", icon: CreditCard },
    { label: "Achats & engagements", href: "/direction-financiere/achats", icon: ShoppingCart },
    { label: "Engagements financiers", href: "/direction-financiere/engagements", icon: Wallet },
    { label: "Circuits de paiement", href: "/direction-financiere/circuits-paiement", icon: GitBranch },
    { label: "RH financier", href: "/direction-financiere/rh", icon: Users },
  ],
};

const DAF_VALIDATIONS: NavSection = {
  title: "Validations & rapports",
  items: [
    { label: "Validations N2", href: "/direction-financiere/validations", icon: CheckCircle2, badge: { value: "5", alert: true } },
    { label: "Rapports mensuels (DG)", href: "/direction-financiere/rapports-mensuels", icon: FileText },
    { label: "Rapports & exports", href: "/direction-financiere/rapports", icon: BarChart3 },
    { label: "Suivi paiement assigné", href: "/suivi-paiement", icon: ClipboardCheck },
  ],
};

// ─── Propriétaire / PCA — sidebar volontairement simple ────────────────────
const OWNER_COCKPIT: NavSection = {
  title: "Pilotage",
  items: [
    { label: "Vue d'ensemble", href: "/proprietaire", icon: Crown },
    { label: "Décisions à valider", href: "/proprietaire/decisions", icon: CheckCircle2 },
    { label: "Rapports reçus", href: "/proprietaire/rapports", icon: FileText },
    { label: "Agenda", href: "/proprietaire/reunions", icon: Gavel },
    { label: "Présences (pointage)", href: "/presence", icon: Clock },
    { label: "Messagerie", href: "/messagerie", icon: MessageSquare },
  ],
};

const OWNER_CONSULTER: NavSection = {
  title: "Consulter (lecture)",
  readOnly: true,
  items: [
    { label: "Finances", href: "/proprietaire/finances", icon: Coins },
    { label: "Recouvrement & paiements", href: "/proprietaire/recouvrement", icon: Receipt },
    { label: "Suivi des décomptes", href: "/proprietaire/decomptes", icon: ClipboardCheck },
    { label: "Chantiers", href: "/proprietaire/chantiers", icon: HardHat },
    { label: "Planning des chantiers", href: "/proprietaire/planning", icon: Calendar },
    { label: "Stocks", href: "/proprietaire/stocks", icon: Package },
    { label: "Logistique & engins", href: "/proprietaire/logistique", icon: Truck },
    { label: "Personnel", href: "/proprietaire/personnel", icon: Users },
    { label: "Fournisseurs", href: "/proprietaire/fournisseurs", icon: Store },
    { label: "Gouvernance", href: "/proprietaire/gouvernance", icon: Landmark },
  ],
};

const FULL: Record<Module, NavSection> = {
  OWNER: { title: "Espace Propriétaire", items: [...OWNER_COCKPIT.items, ...OWNER_CONSULTER.items] },
  ACHATS: {
    title: "Espace Achats",
    items: [{ label: "Espace Achats", href: "/achats", icon: ShoppingCart }],
  },
  DG: {
    // Section "plate" — utilisée comme fallback. La sidebar DG réelle est
    // composée des 3 sub-sections `DG_PILOTAGE`, `DG_FINANCE`,
    // `DG_VALIDATIONS` dans `getSidebarSections`.
    title: "Espace DG",
    items: [
      ...DG_PILOTAGE.items,
      ...DG_FINANCE.items,
      ...DG_VALIDATIONS.items,
      ...DG_STRATEGIE.items,
    ],
  },
  DAF: {
    // Section "plate" — fallback. La sidebar DAF réelle est composée
    // des 4 sub-sections `DAF_PILOTAGE`, `DAF_TRESORERIE`, `DAF_CYCLES`,
    // `DAF_VALIDATIONS` dans `getSidebarSections`.
    title: "Espace DAF",
    items: [
      ...DAF_PILOTAGE.items,
      ...DAF_TRESORERIE.items,
      ...DAF_COMPTA.items,
      ...DAF_CYCLES.items,
      ...DAF_VALIDATIONS.items,
    ],
  },
  RH: {
    title: "Espace RH",
    items: [
      { label: "Tableau de bord RH", href: "/ressources-humaines", icon: LayoutDashboard },
      { label: "Personnel", href: "/ressources-humaines/personnel", icon: Users, badge: { value: "487" } },
      { label: "Contrats de travail", href: "/ressources-humaines/contrats", icon: ScrollText },
      { label: "Saisie de paie", href: "/ressources-humaines/paie", icon: CreditCard, badge: { value: "Avr", alert: true } },
      { label: "Recrutement", href: "/ressources-humaines/recrutement", icon: Briefcase, badge: { value: "12" } },
      { label: "Congés & absences", href: "/ressources-humaines/conges", icon: Calendar, badge: { value: "7", alert: true } },
      { label: "Avances sur salaire", href: "/ressources-humaines/avances", icon: Wallet },
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
      { label: "Rapports mensuels", href: "/direction-technique/rapports-mensuels", icon: FileText },
      { label: "Rapports QHSE", href: "/direction-technique/rapports-qhse", icon: ShieldAlert },
      { label: "Recouvrements en cours", href: "/direction-technique/recouvrements", icon: Receipt },
      { label: "Trésorerie chantiers", href: "/historique-tresorerie", icon: History },
    ],
  },
  SG: {
    title: "Espace SG",
    items: [
      { label: "Tableau de bord", href: "/secretaire-general", icon: LayoutDashboard },
      // Badges alimentés dynamiquement par useSidebarBadges → /api/sg/sidebar-badges
      { label: "Marchés & contrats", href: "/secretaire-general/marches", icon: ScrollText },
      { label: "CA & Gouvernance", href: "/secretaire-general/gouvernance", icon: Landmark },
      { label: "Contentieux", href: "/secretaire-general/contentieux", icon: Gavel },
      { label: "Conformité", href: "/secretaire-general/conformite", icon: Scale },
      { label: "Institutionnel", href: "/secretaire-general/institutionnel", icon: Briefcase },
      { label: "Courriers officiels", href: "/secretaire-general/courriers", icon: Mail },
      { label: "Rapports chantiers", href: "/secretaire-general/rapports-chantiers", icon: ClipboardList },
      { label: "Annuaire personnel", href: "/secretaire-general/annuaire", icon: Users },
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
      { label: "Rapports CDT à valider", href: "/directeur-travaux/rapports-cdt", icon: FileText },
      { label: "Mes rapports mensuels", href: "/directeur-travaux/rapports-mensuels", icon: FileText },
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
      { label: "Rapports hebdomadaires", href: "/conducteur-travaux/rapports", icon: FileText },
    ],
  },
  CC: {
    title: "Espace Chef Chantier",
    items: [
      { label: "Tableau de bord", href: "/chef-chantier", icon: LayoutDashboard },
      { label: "Pointage équipes", href: "/chef-chantier/pointage", icon: ClipboardCheck },
      { label: "Production", href: "/chef-chantier/production", icon: ClipboardList },
      { label: "Réceptions", href: "/chef-chantier/livraisons", icon: Package },
      { label: "Documents chantier", href: "/chef-chantier/documents", icon: FolderOpen },
      { label: "Rapports d'avancement", href: "/chef-chantier/rapports", icon: FileText },
      { label: "HSE & incidents", href: "/chef-chantier/hse", icon: ShieldAlert },
      { label: "Mes équipes", href: "/chef-chantier/equipes", icon: Users },
      { label: "Planning & équipes", href: "/chef-chantier/planning", icon: Calendar },
      { label: "Validations équipe", href: "/chef-chantier/validations", icon: CheckCircle2 },
      { label: "Heures supplémentaires", href: "/chef-chantier/heures-sup", icon: Clock },
      { label: "Mon espace CC", href: "/chef-chantier/profil", icon: User },
    ],
  },
  QHSE: {
    title: "Espace Responsable QHSE",
    items: [
      { label: "Tableau de bord QHSE", href: "/responsable-qhse", icon: ShieldAlert },
      // Onglets internes au tableau (Incidents / Audits / NC / Certifs).
      { label: "Rapports mensuels QHSE", href: "/direction-technique/rapports-qhse", icon: FileText },
    ],
  },
  // Section "chantier" uniquement (l'espace personnel ouvrier vit dans
  // OUV_PERSONAL, ajouté séparément par getSidebarSections quand WORKER
  // a OUV en OWN — voir plus bas).
  OUV: {
    title: "Espace Ouvrier",
    items: [
      { label: "Accueil", href: "/ouv/dashboard", icon: LayoutDashboard },
      { label: "Pointer", href: "/ouv/pointage", icon: ClipboardCheck },
      { label: "Mes missions", href: "/ouv/missions", icon: ClipboardList },
      { label: "Mon équipe", href: "/ouv/equipe", icon: HardHat },
      { label: "Mes outils & EPI", href: "/ouv/outils", icon: Wrench },
      { label: "Sécurité (HSE)", href: "/ouv/hse", icon: ShieldAlert },
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
      { label: "Comptes projet", href: "/comptable/comptes-projets", icon: PieChart },
      { label: "Historique trésorerie", href: "/historique-tresorerie", icon: History },
      { label: "Actifs", href: "/comptable/actifs", icon: Package },
      { label: "Fiscalité", href: "/comptable/fiscal", icon: ScrollText, hideForRoles: [Role.DAF] },
      { label: "Grand livre", href: "/comptable/grand-livre", icon: BarChart3 },
      { label: "Échéancier tiers", href: "/comptable/echeancier", icon: Clock },
      { label: "Rapprochement bancaire", href: "/comptable/rapprochement", icon: Coins },
      { label: "Écritures récurrentes", href: "/comptable/recurrentes", icon: History },
      { label: "Clôtures", href: "/comptable/clotures", icon: Lock },
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
      { label: "Demandes chantier", href: "/magasin/demandes", icon: ListChecks },
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
      { label: "Tous les documents", href: "/gestion-documentaire/documents", icon: FolderArchive },
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
      { label: "Demandes modif. profil", href: "/informatique/change-requests", icon: ClipboardList },
      { label: "Paramètres tenant", href: "/informatique/settings", icon: Settings },
      { label: "Chantiers (admin)", href: "/informatique/sites", icon: Building2 },
      { label: "Pointage (GPS)", href: "/informatique/pointage", icon: Clock },
      { label: "Intégrations", href: "/informatique/integrations", icon: Network },
    ],
  },
  EMP: {
    title: "Mon espace",
    items: [
      { label: "Mon profil", href: "/employe/profil", icon: User },
      { label: "Ma paie", href: "/employe/paie", icon: CreditCard },
      { label: "Mes congés", href: "/employe/conges", icon: Calendar },
      { label: "Présence", href: "/presence", icon: Clock },
      { label: "Messagerie", href: "/messagerie", icon: MessageSquare, badge: { value: "3" } },
    ],
  },
  PRESENCE: {
    title: "Présence",
    items: [{ label: "Pointage de présence", href: "/presence", icon: Clock }],
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
  OWNER: { label: "Vue Propriétaire / PCA", href: "/proprietaire", icon: Crown },
  ACHATS: { label: "Vue Achats", href: "/achats", icon: ShoppingCart },
  DG: { label: "Vue Direction Générale", href: "/direction-generale", icon: Crown },
  DAF: { label: "Vue Finance (DAF)", href: "/direction-financiere", icon: Briefcase },
  RH: { label: "Vue RH", href: "/ressources-humaines", icon: Users },
  DT: { label: "Vue Technique (DT)", href: "/direction-technique", icon: Wrench },
  SG: { label: "Vue Gouvernance (SG)", href: "/secretaire-general", icon: Landmark },
  DTRAV: { label: "Vue Production terrain", href: "/directeur-travaux", icon: HardHat },
  CDT: { label: "Vue Conduite Travaux", href: "/conducteur-travaux", icon: ListChecks },
  CC: { label: "Vue Chefs Chantier", href: "/chef-chantier", icon: ClipboardCheck },
  OUV: { label: "Vue Ouvriers", href: "/ouv/dashboard", icon: HardHat },
  QHSE: { label: "Vue QHSE", href: "/responsable-qhse", icon: ShieldAlert },
  CPT: { label: "Vue Comptabilité", href: "/comptable", icon: FileText },
  LOG: { label: "Vue Logistique", href: "/logistique", icon: Truck },
  MAG: { label: "Vue Stocks (Magasin)", href: "/magasin", icon: Package },
  GED: { label: "Vue Documentaire", href: "/gestion-documentaire", icon: FolderOpen },
  IT: { label: "Vue IT", href: "/informatique", icon: Settings },
  EMP: { label: "Espace personnel", href: "/employe", icon: User },
  PRESENCE: { label: "Présence", href: "/presence", icon: Clock },
  CAND: { label: "Espace candidat", href: "/cand", icon: User },
  PLATFORM: { label: "Console plateforme", href: "/tenants", icon: Building2 },
};

/**
 * Section "Mon espace" pour l'ouvrier — items "personnels" séparés de la
 * section "Espace Ouvrier" (qui regroupe les outils chantier). Pointe
 * vers les routes /ouv/* (PWA mobile-first) plutôt que /employe/*.
 *
 * Affichée par getSidebarSections() quand le rôle est WORKER (OUV=OWN).
 */
const OUV_PERSONAL: NavSection = {
  title: "Mon espace",
  items: [
    { label: "Mon profil", href: "/ouv/profil", icon: User },
    { label: "Ma paie", href: "/ouv/paie", icon: CreditCard },
    { label: "Mes congés", href: "/ouv/conges", icon: Calendar },
    { label: "Messagerie", href: "/messagerie", icon: MessageSquare },
  ],
};

/**
 * Construit la sidebar pour un rôle donné en lisant la matrice d'accès.
 *
 * Composition :
 *   1) Section(s) FULL pour les modules dont le rôle est propriétaire.
 *   2) Une section "Drill-down" regroupant les vues READ (si ≥ 1 module READ).
 *   3) Section "Mon espace" (EMP) si le rôle a OWN sur EMP — déjà inclus
 *      en FULL si applicable.
 *   4) Cas particulier OUV en OWN (WORKER) : la sidebar n'affiche
 *      normalement rien (OWN ≠ FULL/SCOPE), donc on ajoute manuellement
 *      la section "Espace Ouvrier" (chantier) + "Mon espace" (perso).
 *
 * Exemple — DG :
 *   - FULL : DG → section "Espace DG" (5 items)
 *   - READ : DAF, RH, DT, SG, DTRAV, CDT, CC, CPT, LOG, MAG, GED → section
 *     "Drill-down métiers" (11 items condensés)
 */
export function getSidebarSections(role: Role | null | undefined): NavSection[] {
  if (!role) return [];

  // Propriétaire / PCA : sidebar curatée et volontairement simple (cockpit +
  // file de décisions + quelques vues lecture), au lieu d'exposer les ~12
  // modules en lecture qui la rendraient illisible.
  if (role === Role.OWNER) {
    return [OWNER_COCKPIT, OWNER_CONSULTER];
  }

  // Chargé des achats : espace Achats (page à onglets) + consultation lecture.
  if (role === Role.PURCHASING_OFFICER) {
    return [
      {
        title: "Achats",
        items: [{ label: "Espace Achats", href: "/achats", icon: ShoppingCart }],
      },
      {
        title: "Consulter (lecture)",
        readOnly: true,
        items: [
          { label: "Stocks (magasin)", href: "/magasin", icon: Package },
          { label: "Comptabilité", href: "/comptable", icon: FileText },
        ],
      },
      // « Mon espace » identique aux cadres (profil, paie, congés, messagerie).
      FULL.EMP,
    ];
  }

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
  //
  // Cas particulier : le SITE_MANAGER (Chef de Chantier) a MAG=SCOPE dans
  // la matrice (pour permettre l'accès lecture aux stocks de son
  // chantier), mais on ne veut PAS lui afficher la section "Espace
  // Magasinier" complète dans la sidebar — ce n'est pas son métier.
  for (const m of fullModules) {
    if (role === Role.SITE_MANAGER && m === MODULES.MAG) continue;

    // Cas particulier DG : la section "Espace DG" est split en 4
    // sous-sections thématiques pour rester lisible.
    if (role === Role.DG && m === MODULES.DG) {
      sections.push(DG_PILOTAGE, DG_FINANCE, DG_VALIDATIONS, DG_STRATEGIE);
      continue;
    }
    // Même logique pour le DAF : sidebar split en sous-sections
    // (Pilotage, Trésorerie, Comptabilité, Cycles de gestion,
    // Validations & rapports).
    if (role === Role.DAF && m === MODULES.DAF) {
      sections.push(DAF_PILOTAGE, DAF_TRESORERIE, DAF_COMPTA, DAF_CYCLES, DAF_VALIDATIONS);
      continue;
    }

    const section = FULL[m];
    const filteredItems = section.items.filter(
      (item) => !item.hideForRoles?.includes(role)
    );
    sections.push({ ...section, items: filteredItems });
  }

  // 2) Drill-down compact (si rôle lit ≥ 1 module autre que les siens)
  //    Exceptions :
  //    - SITE_MANAGER (CC) a READ sur CDT/LOG/GED par cohérence métier
  //      (remontée vers Conducteur Travaux) mais ces vues ne sont pas
  //      son métier — on les retire de sa sidebar pour rester focalisé.
  //    - ARCHIVIST (Référent Documentaire) a READ sur 10 modules métier
  //      uniquement pour supporter canReadAllDocuments (lecture des docs
  //      de toutes les directions). Sa sidebar reste 100% documentaire.
  if (
    readModules.length > 0 &&
    role !== Role.SITE_MANAGER &&
    role !== Role.ARCHIVIST
  ) {
    // Pour le DG, Vue Stocks/Logistique/Documentaire pointent vers des
    // pages condensées dédiées (`/direction-generale/vue-*`) plutôt que
    // vers les écrans bruts des autres profils.
    const dgOverrides: Partial<Record<Module, NavItem>> =
      role === Role.DG
        ? {
            MAG: { ...READ_ITEM.MAG, label: "Vue Stocks", href: "/direction-generale/vue-stocks" },
            LOG: { ...READ_ITEM.LOG, label: "Vue Logistique", href: "/direction-generale/vue-logistique" },
            GED: { ...READ_ITEM.GED, label: "Vue Documentaire", href: "/direction-generale/vue-documentaire" },
          }
        : {};

    sections.push({
      title: "Drill-down (lecture)",
      readOnly: true,
      items: readModules.map((m) => dgOverrides[m] ?? READ_ITEM[m]),
    });
  }

  // 3) "Mon espace" personnel pour les rôles qui ont OWN sur EMP (mais pas FULL)
  //    Cas particulier WORKER : skip — il a son propre OUV_PERSONAL qui
  //    pointe vers /ouv/* (PWA), évite le doublon avec FULL.EMP qui
  //    pointe vers /employe/*.
  if (
    ownModules.includes(MODULES.EMP) &&
    !fullModules.includes(MODULES.EMP) &&
    role !== Role.WORKER
  ) {
    sections.push(FULL.EMP);
  }

  // 4) Cas WORKER (ouvrier) — OUV=OWN ne déclencherait rien sinon.
  //    Affiche la section chantier puis l'espace perso ouvrier.
  if (ownModules.includes(MODULES.OUV) && !fullModules.includes(MODULES.OUV)) {
    sections.push(FULL.OUV);
    sections.push(OUV_PERSONAL);
  }

  return sections;
}
