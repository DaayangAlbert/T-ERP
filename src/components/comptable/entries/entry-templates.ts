/**
 * Templates d'écritures comptables SYSCOHADA pour BTP.
 *
 * Chaque template pré-remplit le journal et les lignes types pour éviter les
 * erreurs courantes (mauvais journal, mauvais compte, mauvais sens). Le
 * comptable n'a plus qu'à saisir le montant + référence + chantier.
 *
 * Cas particulier `SITUATION` : prend un montant HT et auto-éclate en
 * Clients (TTC) + Travaux (HT) + TVA collectée (19,25 %).
 */

import type { CptEntryLine } from "@/hooks/useCptEntries";

export type TemplateKey =
  | "ENCAISSEMENT_CLIENT"
  | "PAIEMENT_FOURNISSEUR"
  | "DEPENSE_CAISSE"
  | "ENTREE_CAISSE"
  | "SITUATION_TRAVAUX"
  | "SALAIRE_NET"
  | "OD_LIBRE";

export interface EntryTemplate {
  key: TemplateKey;
  label: string;
  icon: string; // emoji
  journalCode: string;
  description: string;
  /**
   * Mode "simple" : 2 lignes, le comptable saisit le débit OU le crédit sur l'une
   * et l'autre se déduit automatiquement (équilibre auto).
   *
   * Mode "vte" : 3 lignes, le comptable saisit le HT et la TVA est calculée
   * automatiquement à 19,25 %.
   */
  mode: "simple" | "vte";
  /** Quelle ligne reçoit la saisie utilisateur (côté débit ou crédit). */
  inputLine: number;
  inputSide: "debit" | "credit";
  /** Définition des lignes pré-remplies. */
  lines: Array<{
    accountCode: string;
    description: string;
    /** Si défini, fixe le côté (utile pour la TVA fixe au % en mode VTE). */
    fixedSide?: "debit" | "credit";
  }>;
  /** Aide affichée sous le sélecteur. */
  hint: string;
}

/** TVA standard Cameroun OHADA : 19,25 % (taux normal). */
export const VAT_RATE = 0.1925;

export const ENTRY_TEMPLATES: EntryTemplate[] = [
  {
    key: "ENCAISSEMENT_CLIENT",
    label: "Encaissement client",
    icon: "💵",
    journalCode: "BQ",
    description: "Encaissement règlement client",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "521000", description: "Banque — encaissement" },
      { accountCode: "411000", description: "Client — solde" },
    ],
    hint: "L'argent entre en banque. Saisis le montant reçu, le crédit client se déduit automatiquement.",
  },
  {
    key: "PAIEMENT_FOURNISSEUR",
    label: "Paiement fournisseur",
    icon: "📤",
    journalCode: "BQ",
    description: "Règlement facture fournisseur",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "401000", description: "Fournisseur — solde dû" },
      { accountCode: "521000", description: "Banque — décaissement" },
    ],
    hint: "Saisis le montant payé. La banque sera créditée du même montant (sortie).",
  },
  {
    key: "DEPENSE_CAISSE",
    label: "Dépense caisse chantier",
    icon: "🧾",
    journalCode: "CAI",
    description: "Dépense caisse",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "605000", description: "Achats divers — petites dépenses" },
      { accountCode: "532000", description: "Caisse chantier" },
    ],
    hint: "Dépense réglée depuis la caisse chantier. Le compte 605 peut être remplacé par 604, 624, 626 selon la nature.",
  },
  {
    key: "ENTREE_CAISSE",
    label: "Entrée caisse",
    icon: "💰",
    journalCode: "CAI",
    description: "Recette caisse",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "532000", description: "Caisse chantier" },
      { accountCode: "708000", description: "Produits accessoires" },
    ],
    hint: "Argent qui entre en caisse chantier (recette, remboursement, vente accessoire).",
  },
  {
    key: "SITUATION_TRAVAUX",
    label: "Situation de travaux (vente)",
    icon: "📋",
    journalCode: "VTE",
    description: "Situation de travaux",
    mode: "vte",
    inputLine: 1, // ligne HT
    inputSide: "credit",
    lines: [
      { accountCode: "411000", description: "Client — créance TTC", fixedSide: "debit" },
      { accountCode: "705000", description: "Travaux BTP — HT", fixedSide: "credit" },
      { accountCode: "443000", description: "TVA collectée 19,25 %", fixedSide: "credit" },
    ],
    hint: "Saisis le montant HT du décompte. La TVA (19,25 %) et le TTC client sont calculés automatiquement.",
  },
  {
    key: "SALAIRE_NET",
    label: "Salaire net mensuel",
    icon: "💼",
    journalCode: "PAIE",
    description: "Paiement salaire net",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "421000", description: "Personnel — rémunérations dues" },
      { accountCode: "521000", description: "Banque — virement salaire" },
    ],
    hint: "Virement du salaire net au salarié. Pour la paie brute + charges, utilise plutôt OD ou le module Paie.",
  },
  {
    key: "OD_LIBRE",
    label: "Opération diverse (OD libre)",
    icon: "🔧",
    journalCode: "OD",
    description: "",
    mode: "simple",
    inputLine: 0,
    inputSide: "debit",
    lines: [
      { accountCode: "", description: "" },
      { accountCode: "", description: "" },
    ],
    hint: "Écriture libre — toi-même choisis les comptes et le sens.",
  },
];

export function findTemplate(key: TemplateKey | string): EntryTemplate | undefined {
  return ENTRY_TEMPLATES.find((t) => t.key === key);
}

/**
 * Construit les lignes initiales d'un template avec, le cas échéant, le
 * montant pré-rempli (utile en mode VTE où la TVA est dérivée).
 */
export function buildLinesFromTemplate(
  template: EntryTemplate,
  amount: number = 0
): CptEntryLine[] {
  if (template.mode === "vte") {
    const ht = amount;
    const tva = Math.round(ht * VAT_RATE);
    const ttc = ht + tva;
    return [
      // Ligne 411 — Client TTC (débit)
      {
        accountCode: template.lines[0].accountCode,
        description: template.lines[0].description,
        debit: ttc,
        credit: 0,
        siteId: null,
      },
      // Ligne 705 — Travaux HT (crédit)
      {
        accountCode: template.lines[1].accountCode,
        description: template.lines[1].description,
        debit: 0,
        credit: ht,
        siteId: null,
      },
      // Ligne 443 — TVA collectée (crédit)
      {
        accountCode: template.lines[2].accountCode,
        description: template.lines[2].description,
        debit: 0,
        credit: tva,
        siteId: null,
      },
    ];
  }

  // Mode simple — pré-remplit comptes et libellés ; l'utilisateur saisit
  // sur la inputLine, l'autre côté s'équilibrera automatiquement.
  return template.lines.map((l, idx) => {
    const isInputLine = idx === template.inputLine;
    return {
      accountCode: l.accountCode,
      description: l.description,
      debit: isInputLine && template.inputSide === "debit" ? amount : 0,
      credit: isInputLine && template.inputSide === "credit" ? amount : 0,
      siteId: null,
    };
  });
}

/**
 * Recalcule les lignes d'un template "simple" pour maintenir l'équilibre
 * automatique : quand on saisit le débit (ou crédit) sur la ligne d'entrée,
 * l'autre ligne reçoit le même montant sur le sens opposé.
 */
export function rebalanceSimple(
  template: EntryTemplate,
  lines: CptEntryLine[],
  inputAmount: number
): CptEntryLine[] {
  if (template.mode !== "simple") return lines;
  return lines.map((l, idx) => {
    if (idx === template.inputLine) {
      return {
        ...l,
        debit: template.inputSide === "debit" ? inputAmount : 0,
        credit: template.inputSide === "credit" ? inputAmount : 0,
      };
    }
    // Ligne d'équilibrage — sens inverse, même montant
    return {
      ...l,
      debit: template.inputSide === "credit" ? inputAmount : 0,
      credit: template.inputSide === "debit" ? inputAmount : 0,
    };
  });
}

/**
 * Recalcule TVA + TTC pour le template Situation de travaux à partir d'un HT.
 */
export function rebalanceVte(
  template: EntryTemplate,
  ht: number
): CptEntryLine[] {
  return buildLinesFromTemplate(template, ht);
}
