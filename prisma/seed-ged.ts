/**
 * Seed complémentaire — GED · Référent documentaire (Christelle EYENGA · Bloc 0).
 *
 * À lancer APRÈS le seed principal (`pnpm db:seed`) :
 *   pnpm exec tsx prisma/seed-ged.ts
 *
 * Ajoute :
 *  - Christelle EYENGA (ARCHIVIST, canReadAllDocuments=true) au tenant BatimCAM
 *  - 8 DocumentWorkflowTemplate (WF-MARCHE-V2, WF-PLAN-V3, WF-PVR, WF-DOE, …)
 *  - 72 DocumentClassification (Marchés 14, Techniques 18, RH 12, Comptables 16, Juridiques 8, QSE 4)
 *  - 28 DocumentSpace (5 transverses + 23 chantiers)
 *  - ~80 Document échantillon avec retention records + classification + space
 *  - 12 DocumentWorkflowInstance en cours (+ étapes) + 6 finalisés
 *  - 8 DocumentAccessRequest (PENDING)
 *  - Quelques GedAuditEvent (consultations, downloads, 1 anomalie)
 *
 * Volumes réduits : ~80 documents au lieu de 14 280. Les KPIs réels du
 * dashboard utiliseront ces comptages directs (donc le dashboard affichera
 * "80 documents actifs" plutôt que "14 280" — les chiffres cibles du
 * prototype sont des objectifs futurs, pas un blocage Bloc 0).
 */
import {
  PrismaClient,
  Role,
  SpaceType,
  Confidentiality,
  ClassificationCategory,
  DuaTrigger,
  WorkflowStatus,
  StepStatus,
  ArchivalStatus,
  AccessStatus,
  GedAuditAction,
  DocStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ============================================================================
// 1. 8 WORKFLOW TEMPLATES
// ============================================================================
const WORKFLOW_TEMPLATES = [
  {
    code: "WF-MARCHE-V2",
    name: "Validation marché",
    description: "Pipeline de validation des marchés travaux (DAF → DG)",
    slaDays: 7,
    steps: [
      { stepIndex: 0, name: "Revue financière DAF", role: "DAF", mandatory: true, slaHours: 96 },
      { stepIndex: 1, name: "Approbation DG", role: "DG", mandatory: true, slaHours: 72 },
    ],
  },
  {
    code: "WF-AVENANT",
    name: "Validation avenant",
    description: "Pipeline avenant contractuel (DAF → DG → MOA)",
    slaDays: 14,
    steps: [
      { stepIndex: 0, name: "Revue financière DAF", role: "DAF", mandatory: true, slaHours: 120 },
      { stepIndex: 1, name: "Approbation DG", role: "DG", mandatory: true, slaHours: 96 },
      { stepIndex: 2, name: "Acceptation MOA", role: "EXTERNAL", mandatory: true, slaHours: 120 },
    ],
  },
  {
    code: "WF-PLAN-V3",
    name: "Validation plan exécution",
    description: "Pipeline plan d'exécution (BET → CondTrav → BCT → MOA → Diffusion)",
    slaDays: 21,
    steps: [
      { stepIndex: 0, name: "Conception BET", role: "TECH_DIRECTOR", mandatory: true, slaHours: 168 },
      { stepIndex: 1, name: "Visa Conducteur travaux", role: "WORKS_MANAGER", mandatory: true, slaHours: 72 },
      { stepIndex: 2, name: "Visa BCT", role: "EXTERNAL", mandatory: true, slaHours: 168 },
      { stepIndex: 3, name: "Visa MOA", role: "EXTERNAL", mandatory: true, slaHours: 96 },
      { stepIndex: 4, name: "Diffusion", role: "ARCHIVIST", mandatory: true, slaHours: 24 },
    ],
  },
  {
    code: "WF-PVR",
    name: "Validation PV réception",
    description: "PV de réception travaux (CondTrav → BCT → MOA → Signature)",
    slaDays: 7,
    steps: [
      { stepIndex: 0, name: "Préparation CondTrav", role: "WORKS_MANAGER", mandatory: true, slaHours: 48 },
      { stepIndex: 1, name: "Visa BCT", role: "EXTERNAL", mandatory: true, slaHours: 72 },
      { stepIndex: 2, name: "Visa MOA", role: "EXTERNAL", mandatory: true, slaHours: 48 },
      { stepIndex: 3, name: "Signature DG", role: "DG", mandatory: true, slaHours: 24 },
    ],
  },
  {
    code: "WF-DOE",
    name: "Constitution DOE",
    description: "Dossier ouvrage exécuté (Compilation → CondTrav → DTrav → DT → Diffusion)",
    slaDays: 30,
    steps: [
      { stepIndex: 0, name: "Compilation ARCHIVIST", role: "ARCHIVIST", mandatory: true, slaHours: 168 },
      { stepIndex: 1, name: "Revue Conducteur travaux", role: "WORKS_MANAGER", mandatory: true, slaHours: 96 },
      { stepIndex: 2, name: "Revue Directeur travaux", role: "WORKS_DIRECTOR", mandatory: true, slaHours: 96 },
      { stepIndex: 3, name: "Approbation Directeur technique", role: "TECH_DIRECTOR", mandatory: true, slaHours: 96 },
      { stepIndex: 4, name: "Diffusion finale", role: "ARCHIVIST", mandatory: true, slaHours: 24 },
    ],
  },
  {
    code: "WF-POL",
    name: "Validation politique RH",
    description: "Politiques RH (RH → DG → CSE → Diffusion)",
    slaDays: 14,
    steps: [
      { stepIndex: 0, name: "Rédaction RH", role: "HR", mandatory: true, slaHours: 168 },
      { stepIndex: 1, name: "Approbation DG", role: "DG", mandatory: true, slaHours: 72 },
      { stepIndex: 2, name: "Avis CSE", role: "EXTERNAL", mandatory: true, slaHours: 96 },
      { stepIndex: 3, name: "Diffusion", role: "ARCHIVIST", mandatory: true, slaHours: 24 },
    ],
  },
  {
    code: "WF-BCC",
    name: "Validation BC-cadre",
    description: "Bon de commande cadre (LOG → DAF → DG)",
    slaDays: 5,
    steps: [
      { stepIndex: 0, name: "Émission LOG", role: "LOGISTICS", mandatory: true, slaHours: 48 },
      { stepIndex: 1, name: "Contrôle DAF", role: "DAF", mandatory: true, slaHours: 48 },
      { stepIndex: 2, name: "Signature DG", role: "DG", mandatory: true, slaHours: 24 },
    ],
  },
  {
    code: "WF-LAB",
    name: "Validation essai labo",
    description: "Rapport d'essai laboratoire (LABO → CondTrav)",
    slaDays: 3,
    steps: [
      { stepIndex: 0, name: "Émission LABO", role: "EXTERNAL", mandatory: true, slaHours: 48 },
      { stepIndex: 1, name: "Acceptation CondTrav", role: "WORKS_MANAGER", mandatory: true, slaHours: 24 },
    ],
  },
] as const;

// ============================================================================
// 2. 72 CLASSIFICATIONS
// ============================================================================
type ClassifSeed = {
  prefix: string;
  code: string;
  name: string;
  category: ClassificationCategory;
  dua: string;
  duaYears: number | null;
  duaTrigger: DuaTrigger;
  confidentiality: Confidentiality;
  workflowCode?: string;
  requiredValidators?: string[];
};

const CLASSIFICATIONS: ClassifSeed[] = [
  // ────────────────────────────────────────────────────────────────────────
  // MARCHÉS (14)
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "CTR", code: "CONTRAT_MARCHE", name: "Contrat marché travaux", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED", workflowCode: "WF-MARCHE-V2", requiredValidators: ["DAF", "DG"] },
  { prefix: "AVE", code: "AVENANT", name: "Avenant contrat", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED", workflowCode: "WF-AVENANT", requiredValidators: ["DAF", "DG"] },
  { prefix: "CON", code: "CONVENTION", name: "Convention partenariat", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED", workflowCode: "WF-MARCHE-V2", requiredValidators: ["DAF", "DG"] },
  { prefix: "BCC", code: "BC_CADRE", name: "Bon de commande cadre", category: "MARKETS", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL", workflowCode: "WF-BCC", requiredValidators: ["DAF", "DG"] },
  { prefix: "CSC", code: "CAHIER_SPEC", name: "Cahier spécifications techniques", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", requiredValidators: ["TECH_DIRECTOR"] },
  { prefix: "AMI", code: "AMI", name: "Appel manifestation intérêt", category: "MARKETS", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "AOE", code: "APPEL_OFFRE", name: "Appel d'offres entrant", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "RPS", code: "REPONSE_OFFRE", name: "Réponse appel d'offres", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED" },
  { prefix: "PLG", code: "PLI_GARANTIE", name: "Pli de garantie / caution", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED" },
  { prefix: "CAU", code: "CAUTION_BANCAIRE", name: "Caution bancaire", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED" },
  { prefix: "OS_", code: "ORDRE_SERVICE", name: "Ordre de service", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", workflowCode: "WF-MARCHE-V2" },
  { prefix: "MOA", code: "ECHANGES_MOA", name: "Échanges officiels MOA", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "BCT", code: "VISAS_BCT", name: "Visas Bureau Contrôle Technique", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "SBI", code: "SOUS_TRAITANCE_INSCR", name: "Inscription sous-traitance", category: "MARKETS", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },

  // ────────────────────────────────────────────────────────────────────────
  // TECHNIQUES (18)
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "PEX", code: "PLAN_EXECUTION", name: "Plan d'exécution", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", workflowCode: "WF-PLAN-V3" },
  { prefix: "DOE", code: "DOSSIER_OUVRAGE", name: "Dossier d'ouvrage exécuté", category: "TECHNICAL", dua: "30 ans", duaYears: 30, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", workflowCode: "WF-DOE" },
  { prefix: "PVR", code: "PV_RECEPTION", name: "PV de réception travaux", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED", workflowCode: "WF-PVR" },
  { prefix: "PVB", code: "PV_BCT", name: "PV de visite BCT", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "CR_", code: "COMPTE_RENDU", name: "Compte-rendu de réunion", category: "TECHNICAL", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "LAB", code: "ESSAI_LABO", name: "Rapport essai laboratoire", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", workflowCode: "WF-LAB" },
  { prefix: "PBE", code: "PLAN_BET", name: "Plan d'origine BET", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "PDC", code: "PLAN_DOE", name: "Plan conforme DOE", category: "TECHNICAL", dua: "30 ans", duaYears: 30, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL", workflowCode: "WF-DOE" },
  { prefix: "PHA", code: "PHOTO_AVANCEMENT", name: "Photo d'avancement chantier", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "NCM", code: "NON_CONFORMITE", name: "Fiche non-conformité", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "AVT", code: "AVT_TECHNIQUE", name: "Avis technique externe", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "FCT", code: "FICHE_CONTROLE", name: "Fiche contrôle qualité", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "PVL", code: "PV_LIVRAISON", name: "PV de livraison matériau", category: "TECHNICAL", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "JOC", code: "JOURNAL_CHANTIER", name: "Journal de chantier", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "REX", code: "RETOUR_EXP", name: "Retour d'expérience chantier", category: "TECHNICAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL" },
  { prefix: "MOP", code: "MODE_OPERATOIRE", name: "Mode opératoire / process", category: "TECHNICAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL" },
  { prefix: "EXE", code: "EXECUTION_SCHEMA", name: "Schéma d'exécution détaillé", category: "TECHNICAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "STO", code: "STAB_OUVRAGE", name: "Note de calcul stabilité ouvrage", category: "TECHNICAL", dua: "30 ans", duaYears: 30, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },

  // ────────────────────────────────────────────────────────────────────────
  // RH (12) — confidentialité élevée
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "CDT", code: "CONTRAT_TRAVAIL", name: "Contrat de travail", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },
  { prefix: "BS_", code: "BULLETIN_SALAIRE", name: "Bulletin de salaire individuel", category: "HR", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "CONFIDENTIAL" },
  { prefix: "EVA", code: "EVALUATION", name: "Entretien d'évaluation", category: "HR", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "CONFIDENTIAL" },
  { prefix: "POL", code: "POLITIQUE_RH", name: "Politique RH (diffusable)", category: "HR", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL", workflowCode: "WF-POL" },
  { prefix: "FOR", code: "FORMATION_RH", name: "Attestation de formation", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "RESTRICTED" },
  { prefix: "VM_", code: "VISITE_MEDICALE", name: "Visite médicale individuelle", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },
  { prefix: "DSC", code: "SANCTION_DISCIPL", name: "Sanction disciplinaire individuelle", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },
  { prefix: "DPT", code: "DOSSIER_DEPART", name: "Dossier départ (solde tout compte)", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },
  { prefix: "CNG", code: "CONGES", name: "Demande congé / absence", category: "HR", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "RESTRICTED" },
  { prefix: "REC", code: "RECRUTEMENT", name: "Dossier candidat retenu", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },
  { prefix: "CNP", code: "DECL_CNPS", name: "Déclaration CNPS", category: "HR", dua: "30 ans", duaYears: 30, duaTrigger: "CREATION_DATE", confidentiality: "RESTRICTED" },
  { prefix: "DRH_CTX", code: "CONTENTIEUX_RH", name: "Dossier contentieux RH", category: "HR", dua: "+5 ans après départ", duaYears: 5, duaTrigger: "EMPLOYEE_DEPARTURE", confidentiality: "CONFIDENTIAL" },

  // ────────────────────────────────────────────────────────────────────────
  // COMPTABLES (16)
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "FAC", code: "FACTURE_FRN", name: "Facture fournisseur", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "AVO", code: "AVOIR_FRN", name: "Avoir fournisseur", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "BIL", code: "BILAN", name: "Bilan annuel", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "RESTRICTED" },
  { prefix: "DEC", code: "DECL_FISCALE", name: "Déclaration fiscale", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "CONFIDENTIAL" },
  { prefix: "GLI", code: "GRAND_LIVRE", name: "Grand-livre comptable", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "RESTRICTED" },
  { prefix: "JOU", code: "JOURNAL_COMPTABLE", name: "Journal comptable", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "RESTRICTED" },
  { prefix: "CPT", code: "RESULTAT", name: "Compte de résultat", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "RESTRICTED" },
  { prefix: "BCM", code: "BC_INTERNE", name: "Bon de commande interne", category: "ACCOUNTING", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "FCC", code: "FACTURE_CLIENT", name: "Facture client (situation/finale)", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "REL", code: "RELEVE_BANCAIRE", name: "Relevé bancaire mensuel", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "RESTRICTED" },
  { prefix: "RAP", code: "RAPPROCHEMENT", name: "État de rapprochement bancaire", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "TVA", code: "DECL_TVA", name: "Déclaration TVA", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "CONFIDENTIAL" },
  { prefix: "IS_", code: "DECL_IS", name: "Déclaration IS / IRPP", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "CONFIDENTIAL" },
  { prefix: "ANL", code: "ANALYTIQUE", name: "État comptable analytique chantier", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "PV_C", code: "PV_CAISSE", name: "PV caisse chantier", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },
  { prefix: "AMT", code: "AMORTISSEMENT", name: "Tableau d'amortissement", category: "ACCOUNTING", dua: "10 ans", duaYears: 10, duaTrigger: "END_OF_FISCAL_YEAR", confidentiality: "INTERNAL" },

  // ────────────────────────────────────────────────────────────────────────
  // JURIDIQUES (8)
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "STA", code: "STATUTS", name: "Statuts société", category: "LEGAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL" },
  { prefix: "AG_", code: "ASSEMBLEE_GENERALE", name: "PV assemblée générale", category: "LEGAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "RESTRICTED" },
  { prefix: "RC_", code: "REGISTRE_COMMERCE", name: "Registre du commerce", category: "LEGAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL" },
  { prefix: "ATD", code: "ATTESTATION_DGI", name: "Attestation fiscale DGI", category: "LEGAL", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "ASS", code: "ASSURANCE", name: "Police d'assurance (décennale, multirisques)", category: "LEGAL", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "RESTRICTED" },
  { prefix: "AUT", code: "AUTORISATION", name: "Autorisation administrative", category: "LEGAL", dua: "10 ans", duaYears: 10, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
  { prefix: "JUG", code: "JUGEMENT", name: "Jugement / décision contentieux", category: "LEGAL", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "CONFIDENTIAL" },
  { prefix: "DEL", code: "DELEGATION", name: "Délégation de pouvoir", category: "LEGAL", dua: "5 ans", duaYears: 5, duaTrigger: "CREATION_DATE", confidentiality: "RESTRICTED" },

  // ────────────────────────────────────────────────────────────────────────
  // QSE (4)
  // ────────────────────────────────────────────────────────────────────────
  { prefix: "QSE", code: "POLITIQUE_QSE", name: "Politique QSE", category: "QSE", dua: "Permanente", duaYears: null, duaTrigger: "OTHER", confidentiality: "INTERNAL" },
  { prefix: "ENV", code: "ETUDE_IMPACT_ENV", name: "Étude impact environnemental", category: "QSE", dua: "30 ans", duaYears: 30, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "SEC", code: "PLAN_SECURITE", name: "Plan de sécurité chantier", category: "QSE", dua: "10 ans", duaYears: 10, duaTrigger: "PROJECT_CLOSURE", confidentiality: "INTERNAL" },
  { prefix: "FRO", code: "FORMATION_QSE", name: "Formation sécurité collective", category: "QSE", dua: "10 ans", duaYears: 10, duaTrigger: "CREATION_DATE", confidentiality: "INTERNAL" },
];

// ============================================================================
// 3. 5 ESPACES TRANSVERSES (les 23 chantiers seront créés à partir de la table sites)
// ============================================================================
type TransverseSeed = {
  code: string;
  name: string;
  icon: string;
  description: string;
  spaceType: SpaceType;
  confidentiality: Confidentiality;
};

const TRANSVERSE_SPACES: TransverseSeed[] = [
  { code: "MARCHES", name: "Marchés & contrats", icon: "📜", description: "Tous les contrats, avenants, conventions, BC-cadres et garanties", spaceType: "MARKETS_CONTRACTS", confidentiality: "RESTRICTED" },
  { code: "RH", name: "Ressources humaines", icon: "👥", description: "Dossiers individuels, paie, politiques, formations, contentieux RH", spaceType: "HR", confidentiality: "CONFIDENTIAL" },
  { code: "COMPTA", name: "Comptable & fiscal", icon: "💰", description: "Pièces comptables, fiscalité, bilans, banque, analytique", spaceType: "ACCOUNTING", confidentiality: "RESTRICTED" },
  { code: "JURIDIQUE", name: "Juridique", icon: "⚖", description: "Statuts, AG, assurances, autorisations, contentieux société", spaceType: "LEGAL", confidentiality: "RESTRICTED" },
  { code: "QSE", name: "Qualité Sécurité Environnement", icon: "🛡", description: "Politique QSE, plans sécurité, études d'impact, formations", spaceType: "QSE", confidentiality: "INTERNAL" },
];

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log("🌱 Seed GED (Christelle EYENGA · Référent documentaire)...");

  // 0) Tenant BatimCAM groupe
  const albert = await prisma.user.findFirst({
    where: { email: "albert@batimcam.cm" },
    select: { id: true, tenantId: true },
  });
  if (!albert?.tenantId) {
    console.error("DG Albert introuvable — lancez d'abord pnpm db:seed");
    return;
  }
  const tenantId = albert.tenantId;

  // 1) Christelle EYENGA — ARCHIVIST + canReadAllDocuments
  const passwordHash = await bcrypt.hash("Demo2026!", 10);
  const christelle = await prisma.user.upsert({
    where: { email: "christelle@batimcam.cm" },
    update: {
      role: Role.ARCHIVIST,
      canReadAllDocuments: true,
      tenantId,
    },
    create: {
      email: "christelle@batimcam.cm",
      passwordHash,
      firstName: "Christelle",
      lastName: "EYENGA",
      phone: "+237699112233",
      role: Role.ARCHIVIST,
      tenantId,
      position: "Documentaliste-Archiviste",
      category: "Cadre",
      canReadAllDocuments: true,
      assignedSiteIds: [],
      emailVerified: true,
    },
    select: { id: true },
  });
  console.log(`  ✓ Christelle EYENGA (ARCHIVIST · canReadAllDocuments=true)`);

  // 2) 8 Workflow templates
  const templateIdsByCode = new Map<string, string>();
  for (const tpl of WORKFLOW_TEMPLATES) {
    const t = await prisma.documentWorkflowTemplate.upsert({
      where: { tenantId_code: { tenantId, code: tpl.code } },
      update: {
        name: tpl.name,
        description: tpl.description,
        steps: tpl.steps as any,
      },
      create: {
        tenantId,
        code: tpl.code,
        name: tpl.name,
        description: tpl.description,
        steps: tpl.steps as any,
      },
      select: { id: true },
    });
    templateIdsByCode.set(tpl.code, t.id);
  }
  console.log(`  ✓ ${WORKFLOW_TEMPLATES.length} workflow templates`);

  // 3) 72 Classifications
  const classificationIdsByPrefix = new Map<string, string>();
  for (const c of CLASSIFICATIONS) {
    const workflowId = c.workflowCode ? templateIdsByCode.get(c.workflowCode) ?? null : null;
    const cls = await prisma.documentClassification.upsert({
      where: { tenantId_prefix: { tenantId, prefix: c.prefix } },
      update: {
        code: c.code,
        name: c.name,
        category: c.category,
        dua: c.dua,
        duaYears: c.duaYears,
        duaTrigger: c.duaTrigger,
        confidentiality: c.confidentiality,
        workflowId,
        requiredValidators: c.requiredValidators ?? [],
      },
      create: {
        tenantId,
        prefix: c.prefix,
        code: c.code,
        name: c.name,
        category: c.category,
        dua: c.dua,
        duaYears: c.duaYears,
        duaTrigger: c.duaTrigger,
        confidentiality: c.confidentiality,
        workflowId,
        requiredValidators: c.requiredValidators ?? [],
      },
      select: { id: true },
    });
    classificationIdsByPrefix.set(c.prefix, cls.id);
  }
  console.log(`  ✓ ${CLASSIFICATIONS.length} classifications`);

  // 4) 5 espaces transverses
  for (const sp of TRANSVERSE_SPACES) {
    await prisma.documentSpace.upsert({
      where: { tenantId_code: { tenantId, code: sp.code } },
      update: {
        name: sp.name,
        icon: sp.icon,
        description: sp.description,
        spaceType: sp.spaceType,
        confidentiality: sp.confidentiality,
        responsibleId: christelle.id,
      },
      create: {
        tenantId,
        code: sp.code,
        name: sp.name,
        icon: sp.icon,
        description: sp.description,
        spaceType: sp.spaceType,
        confidentiality: sp.confidentiality,
        responsibleId: christelle.id,
        active: true,
      },
    });
  }
  console.log(`  ✓ ${TRANSVERSE_SPACES.length} espaces transverses`);

  // 5) 23 espaces chantiers (1 par site)
  const sites = await prisma.site.findMany({ select: { id: true, code: true, name: true } });
  for (const s of sites) {
    const code = `SITE_${s.code.replace(/[^A-Z0-9]/gi, "_")}`;
    await prisma.documentSpace.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: {
        name: s.name,
        icon: "🏗",
        description: `Espace documentaire du chantier ${s.name} (${s.code})`,
        siteId: s.id,
        responsibleId: christelle.id,
      },
      create: {
        tenantId,
        code,
        name: s.name,
        icon: "🏗",
        description: `Espace documentaire du chantier ${s.name} (${s.code})`,
        spaceType: SpaceType.CONSTRUCTION_SITE,
        confidentiality: Confidentiality.INTERNAL,
        siteId: s.id,
        responsibleId: christelle.id,
        active: true,
      },
    });
  }
  console.log(`  ✓ ${sites.length} espaces chantiers`);

  // 6) ~80 documents échantillon répartis sur les espaces
  // Récupère espaces et personnes pour répartir
  const allSpaces = await prisma.documentSpace.findMany({
    where: { tenantId },
    select: { id: true, code: true, spaceType: true, siteId: true },
  });
  const usersForAuth = await prisma.user.findMany({
    where: { tenantId, role: { in: [Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.WORKS_MANAGER, Role.HR, Role.ACCOUNTANT, Role.LOGISTICS, Role.ARCHIVIST] } },
    select: { id: true, role: true },
  });
  const authorByRole = new Map<Role, string>();
  for (const u of usersForAuth) authorByRole.set(u.role, u.id);
  const defaultAuthor = christelle.id;

  // Définit quelques doc-types à seeder par espace (préfixe → quantité)
  type DocPlan = { prefix: string; count: number; spaceCode?: string };
  const SAMPLE_DOCS: DocPlan[] = [
    { prefix: "CTR", count: 4, spaceCode: "MARCHES" },
    { prefix: "AVE", count: 3, spaceCode: "MARCHES" },
    { prefix: "BCC", count: 5, spaceCode: "MARCHES" },
    { prefix: "OS_", count: 2, spaceCode: "MARCHES" },
    { prefix: "BIL", count: 2, spaceCode: "COMPTA" },
    { prefix: "DEC", count: 4, spaceCode: "COMPTA" },
    { prefix: "FAC", count: 8, spaceCode: "COMPTA" },
    { prefix: "TVA", count: 3, spaceCode: "COMPTA" },
    { prefix: "GLI", count: 2, spaceCode: "COMPTA" },
    { prefix: "POL", count: 3, spaceCode: "RH" },
    { prefix: "CDT", count: 6, spaceCode: "RH" },
    { prefix: "BS_", count: 4, spaceCode: "RH" }, // confidentiel — exclu ARCHIVIST
    { prefix: "FOR", count: 3, spaceCode: "RH" },
    { prefix: "STA", count: 1, spaceCode: "JURIDIQUE" },
    { prefix: "AG_", count: 2, spaceCode: "JURIDIQUE" },
    { prefix: "ASS", count: 2, spaceCode: "JURIDIQUE" },
    { prefix: "QSE", count: 1, spaceCode: "QSE" },
    { prefix: "SEC", count: 4, spaceCode: "QSE" },
    { prefix: "ENV", count: 2, spaceCode: "QSE" },
    // sur Pont Mfoundi (CHT-2025-031) et autres chantiers
    { prefix: "PEX", count: 8 },
    { prefix: "PVR", count: 3 },
    { prefix: "PVB", count: 4 },
    { prefix: "LAB", count: 3 },
    { prefix: "PHA", count: 6 },
    { prefix: "DOE", count: 1 },
  ];

  const transverseByCode = new Map<string, string>();
  const siteSpaces: { id: string; code: string; siteId: string | null }[] = [];
  for (const s of allSpaces) {
    if (s.spaceType !== SpaceType.CONSTRUCTION_SITE) transverseByCode.set(s.code, s.id);
    else siteSpaces.push({ id: s.id, code: s.code, siteId: s.siteId });
  }

  let createdDocs = 0;
  let docIndex = 1;
  const sampleDocIds: string[] = [];
  const sampleDocBySpace: Record<string, string[]> = {};

  for (const plan of SAMPLE_DOCS) {
    const classificationId = classificationIdsByPrefix.get(plan.prefix);
    if (!classificationId) continue;
    const targetSpaceId = plan.spaceCode
      ? transverseByCode.get(plan.spaceCode)
      : undefined;

    for (let i = 0; i < plan.count; i++) {
      const spaceId =
        targetSpaceId ??
        siteSpaces[(docIndex + i) % Math.max(1, siteSpaces.length)].id;
      const sourceSite = siteSpaces.find((s) => s.id === spaceId);
      const cls = CLASSIFICATIONS.find((c) => c.prefix === plan.prefix)!;
      const author = authorByRole.get(roleForCategory(cls.category)) ?? defaultAuthor;
      const ref = `${plan.prefix}-2026-${String(docIndex).padStart(4, "0")}`;
      const sizeBytes = BigInt(50_000 + Math.floor(Math.random() * 2_000_000));
      const createdAt = randomDateBefore(180);

      // Calcule fin de DUA
      const duaEnd = cls.duaYears
        ? new Date(createdAt.getFullYear() + cls.duaYears, createdAt.getMonth(), createdAt.getDate())
        : new Date(createdAt.getFullYear() + 99, createdAt.getMonth(), createdAt.getDate());

      // Choisit un statut archival selon ancienneté et DUA
      const yearsOld = (Date.now() - createdAt.getTime()) / (365 * 24 * 3600 * 1000);
      let archivalStatus: ArchivalStatus = ArchivalStatus.ACTIVE;
      if (cls.duaYears && yearsOld > cls.duaYears) archivalStatus = ArchivalStatus.PENDING_DESTRUCTION;
      else if (yearsOld > 2) archivalStatus = ArchivalStatus.SEMI_ACTIVE;

      const doc = await prisma.document.create({
        data: {
          tenantId,
          name: `${cls.name} · ${ref}`,
          category: cls.name,
          folder: plan.spaceCode ? `/${plan.spaceCode}` : `/${sourceSite?.code ?? "DIVERS"}`,
          mimeType: "application/pdf",
          sizeBytes,
          url: `https://terp-storage.local/sample/${ref}.pdf`,
          siteId: sourceSite?.siteId ?? null,
          authorId: author,
          status: archivalStatus === ArchivalStatus.PENDING_DESTRUCTION ? DocStatus.ARCHIVED : DocStatus.PUBLISHED,
          spaceId,
          classificationId,
          internalReference: ref,
          confidentiality: cls.confidentiality,
          createdAt,
          retentionRecord: {
            create: {
              duaEndDate: duaEnd,
              archivalStatus,
              legalHold: plan.prefix === "DRH_CTX",
            },
          },
        },
        select: { id: true, spaceId: true },
      });
      sampleDocIds.push(doc.id);
      if (doc.spaceId) {
        sampleDocBySpace[doc.spaceId] ??= [];
        sampleDocBySpace[doc.spaceId].push(doc.id);
      }
      createdDocs++;
      docIndex++;
    }
  }
  console.log(`  ✓ ${createdDocs} documents échantillon + retention records`);

  // 7) Workflows : 12 en cours (variés) + 6 finalisés YTD
  // Récupère utilisateurs pour assigner étapes
  const userByRole = (role: Role) => authorByRole.get(role) ?? christelle.id;

  // Documents PEX pour workflows plan exécution
  const pexDocs = await prisma.document.findMany({
    where: { tenantId, classification: { prefix: "PEX" } },
    select: { id: true, internalReference: true },
    take: 5,
  });
  const pvrDocs = await prisma.document.findMany({
    where: { tenantId, classification: { prefix: "PVR" } },
    select: { id: true, internalReference: true },
    take: 3,
  });
  const aveDocs = await prisma.document.findMany({
    where: { tenantId, classification: { prefix: "AVE" } },
    select: { id: true, internalReference: true },
    take: 2,
  });
  const polDocs = await prisma.document.findMany({
    where: { tenantId, classification: { prefix: "POL" } },
    select: { id: true, internalReference: true },
    take: 2,
  });
  const bccDocs = await prisma.document.findMany({
    where: { tenantId, classification: { prefix: "BCC" } },
    select: { id: true, internalReference: true },
    take: 3,
  });

  type WfPlan = {
    templateCode: string;
    docs: { id: string; internalReference: string | null }[];
    currentStep: number; // étape en cours
    status: WorkflowStatus;
    overdueDays?: number; // négatif = en retard
  };

  const wfPlans: WfPlan[] = [
    { templateCode: "WF-PLAN-V3", docs: pexDocs.slice(0, 3), currentStep: 2, status: "IN_PROGRESS" },
    { templateCode: "WF-PVR", docs: pvrDocs.slice(0, 2), currentStep: 1, status: "IN_PROGRESS", overdueDays: -2 },
    { templateCode: "WF-AVENANT", docs: aveDocs, currentStep: 1, status: "IN_PROGRESS" },
    { templateCode: "WF-POL", docs: polDocs, currentStep: 2, status: "IN_PROGRESS" },
    { templateCode: "WF-BCC", docs: bccDocs.slice(0, 2), currentStep: 1, status: "IN_PROGRESS" },
  ];

  let wfRefIndex = 142;
  let activeWf = 0;
  for (const plan of wfPlans) {
    const templateId = templateIdsByCode.get(plan.templateCode);
    if (!templateId) continue;
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.code === plan.templateCode)!;

    for (const doc of plan.docs) {
      const reference = `WF-2026-${String(wfRefIndex++).padStart(4, "0")}`;
      const startedAt = randomDateBefore(20);
      const dueAt = new Date(startedAt.getTime() + tpl.slaDays * 24 * 3600 * 1000 + (plan.overdueDays ?? 0) * 24 * 3600 * 1000);

      const inst = await prisma.documentWorkflowInstance.create({
        data: {
          reference,
          templateId,
          documentId: doc.id,
          status: plan.status,
          currentStep: plan.currentStep,
          initiatorId: userByRole(Role.TECH_DIRECTOR),
          startedAt,
          dueAt,
        },
        select: { id: true },
      });

      // Crée les étapes : étapes < currentStep = APPROVED, étape currentStep = PENDING
      for (let i = 0; i < tpl.steps.length; i++) {
        const step = tpl.steps[i];
        const assigneeRole = mapWfRoleToPrismaRole(step.role);
        const assignedToId = assigneeRole ? userByRole(assigneeRole) : christelle.id;
        await prisma.documentWorkflowStep.create({
          data: {
            instanceId: inst.id,
            stepIndex: step.stepIndex,
            stepName: step.name,
            assignedToId,
            status: i < plan.currentStep ? StepStatus.APPROVED : i === plan.currentStep ? StepStatus.PENDING : StepStatus.PENDING,
            decidedAt: i < plan.currentStep ? new Date(startedAt.getTime() + i * 24 * 3600 * 1000) : null,
            comment: i < plan.currentStep ? "OK" : null,
          },
        });
      }
      activeWf++;
    }
  }
  console.log(`  ✓ ${activeWf} workflows en cours`);

  // Workflows COMPLETED — 6 finalisés
  const completedDocs = await prisma.document.findMany({
    where: { tenantId, status: DocStatus.PUBLISHED },
    select: { id: true },
    take: 6,
  });
  let completedWf = 0;
  for (const doc of completedDocs) {
    const templateId = templateIdsByCode.get("WF-PLAN-V3");
    if (!templateId) break;
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.code === "WF-PLAN-V3")!;
    const reference = `WF-2026-${String(wfRefIndex++).padStart(4, "0")}`;
    const startedAt = randomDateBefore(60);
    const completedAt = new Date(startedAt.getTime() + tpl.slaDays * 24 * 3600 * 1000 * 0.8);

    const inst = await prisma.documentWorkflowInstance.create({
      data: {
        reference,
        templateId,
        documentId: doc.id,
        status: WorkflowStatus.COMPLETED,
        currentStep: tpl.steps.length,
        initiatorId: userByRole(Role.TECH_DIRECTOR),
        startedAt,
        dueAt: new Date(startedAt.getTime() + tpl.slaDays * 24 * 3600 * 1000),
        completedAt,
      },
      select: { id: true },
    });
    for (const step of tpl.steps) {
      const assigneeRole = mapWfRoleToPrismaRole(step.role);
      const assignedToId = assigneeRole ? userByRole(assigneeRole) : christelle.id;
      await prisma.documentWorkflowStep.create({
        data: {
          instanceId: inst.id,
          stepIndex: step.stepIndex,
          stepName: step.name,
          assignedToId,
          status: StepStatus.APPROVED,
          decidedAt: new Date(startedAt.getTime() + step.stepIndex * 24 * 3600 * 1000),
          comment: "Approuvé",
        },
      });
    }
    completedWf++;
  }
  console.log(`  ✓ ${completedWf} workflows finalisés`);

  // 8) 8 Demandes d'accès PENDING
  const accessTargets = await prisma.document.findMany({
    where: { tenantId, confidentiality: { in: [Confidentiality.CONFIDENTIAL, Confidentiality.RESTRICTED] } },
    select: { id: true },
    take: 8,
  });
  const otherUsers = await prisma.user.findMany({
    where: { tenantId, role: { notIn: [Role.ARCHIVIST] } },
    select: { id: true },
    take: 8,
  });
  let createdAccessRequests = 0;
  for (let i = 0; i < Math.min(accessTargets.length, otherUsers.length); i++) {
    await prisma.documentAccessRequest.create({
      data: {
        requesterId: otherUsers[i].id,
        documentId: accessTargets[i].id,
        reason: "Besoin opérationnel — vérification dans le cadre de l'audit interne ISO 9001",
        status: AccessStatus.PENDING,
      },
    });
    createdAccessRequests++;
  }
  console.log(`  ✓ ${createdAccessRequests} demandes d'accès PENDING`);

  // 9) Quelques audit events (consultations + 1 anomalie)
  let auditCount = 0;
  for (let i = 0; i < 20; i++) {
    const doc = sampleDocIds[i % sampleDocIds.length];
    const actor = otherUsers[i % otherUsers.length].id;
    await prisma.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: actor,
        action: i % 4 === 0 ? GedAuditAction.DOWNLOAD : GedAuditAction.CONSULTATION,
        documentId: doc,
        ipAddress: `10.0.${i % 256}.${(i * 7) % 256}`,
        userAgent: "Mozilla/5.0 (T-ERP)",
        createdAt: randomDateBefore(2),
      },
    });
    auditCount++;
  }
  // 1 anomalie
  await prisma.gedAuditEvent.create({
    data: {
      tenantId,
      actorId: otherUsers[0]?.id ?? null,
      action: GedAuditAction.ANOMALY,
      documentId: sampleDocIds[0],
      metadata: { detail: "Modification document après diffusion (workflow COMPLETED)" },
      ipAddress: "10.0.0.42",
      userAgent: "Mozilla/5.0 (T-ERP)",
      anomaly: true,
      createdAt: randomDateBefore(1),
    },
  });
  auditCount++;
  console.log(`  ✓ ${auditCount} événements audit (1 anomalie)`);

  console.log("\n✅ Seed GED terminé.");
  console.log("   Compte : christelle@batimcam.cm / Demo2026!");
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function randomDateBefore(maxDaysAgo: number): Date {
  const offset = Math.floor(Math.random() * maxDaysAgo) * 24 * 3600 * 1000;
  return new Date(Date.now() - offset);
}

function roleForCategory(cat: ClassificationCategory): Role {
  switch (cat) {
    case "MARKETS":
      return Role.DAF;
    case "TECHNICAL":
      return Role.TECH_DIRECTOR;
    case "HR":
      return Role.HR;
    case "ACCOUNTING":
      return Role.ACCOUNTANT;
    case "LEGAL":
      return Role.DG;
    case "QSE":
      return Role.TECH_DIRECTOR;
    default:
      return Role.DG;
  }
}

function mapWfRoleToPrismaRole(wfRole: string): Role | null {
  switch (wfRole) {
    case "DG":
      return Role.DG;
    case "DAF":
      return Role.DAF;
    case "HR":
      return Role.HR;
    case "TECH_DIRECTOR":
      return Role.TECH_DIRECTOR;
    case "WORKS_DIRECTOR":
      return Role.WORKS_DIRECTOR;
    case "WORKS_MANAGER":
      return Role.WORKS_MANAGER;
    case "LOGISTICS":
      return Role.LOGISTICS;
    case "ARCHIVIST":
      return Role.ARCHIVIST;
    case "EXTERNAL":
      // externe (BCT, MOA, CSE) — assigne à l'ARCHIVIST par défaut pour relance
      return Role.ARCHIVIST;
    default:
      return null;
  }
}

main()
  .catch((e) => {
    console.error("Erreur seed GED :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
