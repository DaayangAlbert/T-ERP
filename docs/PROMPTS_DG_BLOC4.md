# DG · BLOC 4 — Pilotage financier

**3 modules · 3 prompts à enchaîner**

---

## 🟣 PROMPT 4.1 — Finances (vue DG)

```
Module : Finances · vue DG.

CONTEXTE
========
L'écran screen-finance existe avec KPIs et donut. On l'enrichit pour le DG :
ratios financiers, BFR, engagements, relations bancaires.

PROTOTYPE HTML — ENRICHISSEMENT screen-finance
===============================================

1. Garde la structure existante, ajoute des onglets :
   - Vue d'ensemble (existant)
   - Compte de résultat (nouveau)
   - Bilan synthétique (nouveau)
   - BFR et trésorerie (nouveau)
   - Engagements (nouveau)
   - Banques (nouveau)

2. Onglet "Compte de résultat" :
   P&L mensuel et cumulé YTD avec :
   - Produits (chiffre d'affaires, autres produits)
   - Charges (achats, personnel, sous-traitance, dotations, autres)
   - Résultat d'exploitation
   - Résultat financier
   - Résultat exceptionnel
   - Résultat net
   Comparaison N vs N-1 vs Budget.
   Drill-down sur chaque poste.

3. Onglet "Bilan synthétique" :
   Bilan simplifié à la dernière clôture :
   ACTIF : Immobilisations, Stocks, Créances clients, Trésorerie
   PASSIF : Capitaux propres, Dettes financières, Dettes fournisseurs, Autres
   Ratios : autonomie financière, liquidité, endettement.

4. Onglet "BFR et trésorerie" :
   - Évolution BFR sur 24 mois
   - Décomposition : DSO clients (jours), DPO fournisseurs (jours), rotation stocks
   - Comparaison avec norme secteur BTP Cameroun
   - Trésorerie nette mois par mois (2 ans glissant)
   - Lien vers la trésorerie prévisionnelle 12 semaines (déjà dev en bloc 1.4)

5. Onglet "Engagements" :
   Liste des engagements financiers :
   - Cautions bancaires émises (montants, banques, échéances, chantiers)
   - Garanties à première demande
   - Crédits documentaires
   - Engagements d'achat fermes (BC > 6 mois d'avance)
   Total engagements / Capitaux propres (ratio de risque).

6. Onglet "Banques" :
   Tableau des relations bancaires :
   colonnes Banque | N° compte | Solde au jour le jour | Lignes accordées |
   Lignes utilisées | Lignes disponibles | Échéances renouvellement
   Pour chaque banque : historique 12 mois, contact relationship manager,
   évaluation qualité de la relation.

CODE
====

a) PRISMA :
   model FinancialPeriod {
     id        String   @id @default(cuid())
     tenantId  String
     period    String   @unique  // "2026-04"
     pnl       Json     // produits, charges, résultats
     balance   Json     // actif, passif
     bfr       Json     // dso, dpo, stock rotation
     locked    Boolean  @default(false) // verrouillé après clôture
     createdAt DateTime @default(now())
   }

   model FinancialCommitment {
     id        String   @id @default(cuid())
     tenantId  String
     type      CommitmentType
     bank      String?
     beneficiary String?
     amount    BigInt
     siteId    String?
     issueDate DateTime
     maturityDate DateTime
     status    CommitmentStatus
     createdAt DateTime @default(now())
   }
   enum CommitmentType { BANK_GUARANTEE FIRST_DEMAND_GUARANTEE LETTER_CREDIT PURCHASE_COMMITMENT }
   enum CommitmentStatus { ACTIVE EXPIRED RELEASED CALLED }

   model BankAccount {
     id        String   @id @default(cuid())
     tenantId  String
     bank      String   // UBA, BICEC, AFRILAND, ECOBANK, SGBC...
     accountNumber String
     accountType String  // CURRENT, ESCROW, SAVING
     balance   BigInt
     creditLineGranted BigInt @default(0)
     creditLineUsed    BigInt @default(0)
     renewalDate DateTime?
     contact     Json?  // { name, phone, email }
     createdAt   DateTime @default(now())
   }

b) API :
   - GET /api/finance/pnl?period=...&compare=YOY|BUDGET
   - GET /api/finance/balance
   - GET /api/finance/bfr
   - GET /api/finance/commitments
   - POST /api/finance/commitments
   - GET /api/finance/banks
   - PATCH /api/finance/banks/:id
   - GET /api/finance/banks/:id/history

c) Pages :
   - /finances/page.tsx (refonte avec onglets)
   - /finances/banques/[id]/page.tsx (détail banque)

d) Composants src/components/finance/ :
   - PnLTable.tsx (avec drill-down)
   - BalanceSheetView.tsx
   - BfrEvolution.tsx
   - CommitmentsTable.tsx
   - BanksTable.tsx
   - BankRelationshipDetail.tsx

SEED
====
- 24 mois de FinancialPeriod historiques + budget 2026
- 8 engagements actifs (cautions sur chantiers en cours)
- 5 comptes bancaires (UBA, BICEC, Afriland, Ecobank, SGBC) avec historique

TESTS
=====
- P&L avril 2026 : drill-down sur "personnel" → liste agrégée par catégorie
- Bilan : vérifier que actif = passif
- BFR : ratios cohérents avec données
- Engagements : la création d'un BC > 50M génère automatiquement un engagement
- Banques : modifier solde manuellement (avant intégration API)

LIVRABLES
=========
- Prototype : screen-finance enrichi avec 6 onglets
- Code complet
- Commit "feat(dg): finances — P&L, bilan, BFR, engagements, banques"
```

---

## 🟣 PROMPT 4.2 — Comptabilité (vue DG)

```
Module : Comptabilité · vue DG (validation comptes annuels).

CONTEXTE
========
L'écran screen-accounting existe avec écritures et journaux. La saisie est déjà
prévue (screen-accounting-entry). On enrichit pour le DG : situation comptable,
clôtures, validation des comptes annuels, états financiers SYSCOHADA.

PROTOTYPE HTML — ENRICHISSEMENT screen-accounting
==================================================

1. Garde la structure existante (KPIs, écritures, états réglementaires).
2. Ajoute des onglets en haut :
   - Écritures (existant)
   - Grand livre (nouveau, vraiment fonctionnel)
   - Balance (nouveau)
   - Clôtures (nouveau)
   - États SYSCOHADA (nouveau)

3. Onglet "Grand livre" :
   Sélecteur de compte (autocomplete sur les 6 chiffres SYSCOHADA).
   Pour le compte sélectionné : tableau des mouvements avec
   colonnes Date | Pièce | Journal | Libellé | Débit | Crédit | Solde progressif
   Total débit, total crédit, solde au pied.
   Filtres période. Export Excel.

4. Onglet "Balance" :
   Balance générale par classe de comptes (1 à 9).
   Mode "balance des comptes" (tous les comptes mouvementés) ou "balance par classe".
   Comparaison N vs N-1.
   Détection automatique des comptes anormaux (ex: compte client créditeur).

5. Onglet "Clôtures" :
   Tableau des périodes :
   période | écritures | équilibre | dernière modif | statut (ouverte / clôturée / verrouillée)
   Bouton "Clôturer la période" qui :
   - Vérifie que toutes les écritures sont équilibrées
   - Vérifie que les rapprochements bancaires sont faits
   - Génère les écritures d'OD de fin de période (provisions, charges constatées d'avance)
   - Verrouille la période (plus de modif sauf via OD de réouverture)

6. Onglet "États SYSCOHADA" :
   Cards pour générer les états officiels :
   - Bilan SYSCOHADA (modèle officiel)
   - Compte de résultat
   - Tableau des flux de trésorerie
   - État annexé (notes)
   - Liasse fiscale DSF complète
   Chaque card → wizard avec choix période, format (PDF officiel ou Excel travail),
   options (consolidé groupe ou non), génération.

7. Section "Validation comptes annuels" (visible quand exercice à clôturer) :
   Workflow pour le DG :
   - Étape 1 : revue des grandes masses (P&L + Bilan)
   - Étape 2 : ajustements proposés par expert-comptable (à valider)
   - Étape 3 : génération projet d'états financiers
   - Étape 4 : validation pour AG
   - Étape 5 : transmission CGI/DGI

CODE
====

a) PRISMA :
   model AccountingPeriod {
     id        String   @id @default(cuid())
     tenantId  String
     period    String   @unique  // "2026-04" ou "2026" pour annuel
     status    PeriodStatus
     closedAt  DateTime?
     closedBy  String?
     totalEntries Int   @default(0)
     totalDebit BigInt @default(0)
     totalCredit BigInt @default(0)
   }
   enum PeriodStatus { OPEN CLOSING CLOSED LOCKED }

   model AnnualClosure {
     id              String   @id @default(cuid())
     tenantId        String
     fiscalYear      Int
     status          ClosureStatus
     pnlValidated    Boolean  @default(false)
     balanceValidated Boolean @default(false)
     adjustments     Json[]   // ajustements expert-comptable
     dgValidatedAt   DateTime?
     dgValidatedBy   String?
     submittedToDgi  Boolean  @default(false)
     dsfFileUrl      String?
   }
   enum ClosureStatus { IN_PROGRESS PENDING_DG_VALIDATION VALIDATED SUBMITTED }

b) API :
   - GET /api/accounting/general-ledger/:account?period=...
   - GET /api/accounting/balance?level=class|account
   - GET /api/accounting/periods
   - POST /api/accounting/periods/:period/close
   - GET /api/accounting/syscohada/:state (balance|pnl|bs|cashflow|notes)
   - GET /api/accounting/syscohada/:state/pdf (génération PDF officiel)
   - GET /api/accounting/closures/:year
   - POST /api/accounting/closures/:year/validate-step

c) Pages :
   - /comptabilite/page.tsx (refonte avec 5 onglets)
   - /comptabilite/cloture/[year]/page.tsx (workflow validation annuelle)

d) Composants src/components/accounting/ :
   - GeneralLedger.tsx (avec autocomplete compte)
   - BalanceSheet.tsx
   - PeriodsTable.tsx
   - SyscohadaStateCard.tsx
   - AnnualClosureWizard.tsx (5 étapes)
   - PnLValidationStep.tsx
   - AdjustmentsList.tsx

⚠️ NOTE IMPORTANTE
==================
La conformité SYSCOHADA détaillée nécessite la validation d'un expert-comptable
agréé OHADA. Pour cette V1, livrer :
- Structure de données conforme
- Génération PDF avec mise en page proche du modèle officiel
- Mention "Document brouillon — validation expert-comptable requise" sur les PDF
- Marquer dans le commit "V1 conformité SYSCOHADA en cours de validation"

SEED
====
- 12 mois de AccountingPeriod ouvertes pour 2026
- 4 mois clôturés pour 2025
- 1 AnnualClosure 2025 en statut PENDING_DG_VALIDATION

LIVRABLES
=========
- Prototype : screen-accounting enrichi avec 5 onglets
- Code complet avec PDF SYSCOHADA générable
- Workflow clôture annuelle fonctionnel
- Commit "feat(dg): comptabilité — grand livre, balance, clôtures, SYSCOHADA"
```

---

## 🟣 PROMPT 4.3 — Achats (vue DG validations)

```
Module : Achats · vue DG.

CONTEXTE
========
L'écran screen-purchase existe en lecture. On l'enrichit pour le DG :
validation BC > seuil, fournisseurs stratégiques, contrats-cadres.

PROTOTYPE HTML — ENRICHISSEMENT screen-purchase
================================================

1. Garde la structure existante, ajoute des onglets :
   - Bons de commande (existant)
   - À valider (nouveau, mes BC en attente)
   - Fournisseurs stratégiques (nouveau)
   - Contrats-cadres (nouveau)
   - Analyse achats (nouveau)

2. Onglet "À valider" :
   Listview des BC > seuil DG (50 M FCFA par défaut, configurable) en attente.
   Pour chaque BC : workflow visuel (initiateur → DAF ✓ → moi en attente),
   actions Valider / Rejeter / Demander complément.
   KPI en haut : nombre BC en attente, montant cumulé, ancienneté moyenne.

3. Onglet "Fournisseurs stratégiques" :
   Listview des 20 plus gros fournisseurs (par volume YTD) avec :
   nom | catégorie | volume YTD | nb BC | délai paiement moyen | rating qualité |
   contrat-cadre actif | contact commercial
   Drill-down par fournisseur : historique 24 mois, taux de litiges, conformité.
   Bouton "Évaluer fournisseur" (notation 1-5 étoiles + commentaires).

4. Onglet "Contrats-cadres" :
   Listview des contrats-cadres en cours :
   référence | fournisseur | objet | montant max | période validité |
   utilisé YTD | reste disponible | conditions
   Bouton "Nouveau contrat-cadre" (wizard avec négociation, validation, signature).

5. Onglet "Analyse achats" :
   - Évolution volume achats 24 mois
   - Répartition par catégorie (matériaux, sous-traitance, services, énergie, autres)
   - Top 10 fournisseurs (donut)
   - Évolution prix moyens des principales matières (ciment, fer, gravier, gasoil)
   - Indicateurs de performance achats (économies réalisées vs budget)

CODE
====

a) PRISMA :
   model Supplier {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     category    String
     taxId       String?  // NIU
     rccm        String?
     phone       String?
     email       String?
     address     String?
     paymentTerms Int     @default(45) // jours
     ratingQuality Float? // 1-5
     ratingDelay   Float?
     ratingPrice   Float?
     strategic   Boolean  @default(false)
     blocked     Boolean  @default(false)
     blockReason String?
   }

   model FrameworkContract {
     id          String   @id @default(cuid())
     tenantId    String
     supplierId  String
     supplier    Supplier @relation(fields: [supplierId], references: [id])
     reference   String
     subject     String
     maxAmount   BigInt
     usedAmount  BigInt   @default(0)
     startDate   DateTime
     endDate     DateTime
     conditions  Json?
     status      ContractStatus
   }
   enum ContractStatus { DRAFT ACTIVE EXPIRED TERMINATED }

   model SupplierEvaluation {
     id           String   @id @default(cuid())
     supplierId   String
     supplier     Supplier @relation(fields: [supplierId], references: [id])
     evaluatorId  String
     period       String
     ratingQuality Float
     ratingDelay   Float
     ratingPrice   Float
     comments     String?  @db.Text
     createdAt    DateTime @default(now())
   }

b) API :
   - GET /api/purchase/orders/pending-dg
   - POST /api/purchase/orders/:id/dg-approve
   - POST /api/purchase/orders/:id/dg-reject
   - GET /api/purchase/suppliers (avec filtre strategic=true)
   - GET /api/purchase/suppliers/:id (détail + historique)
   - POST /api/purchase/suppliers/:id/evaluate
   - GET /api/purchase/framework-contracts
   - POST /api/purchase/framework-contracts
   - GET /api/purchase/analytics

c) Pages :
   - /achats/page.tsx (refonte avec 5 onglets)
   - /achats/fournisseurs/[id]/page.tsx (détail fournisseur)
   - /achats/contrats-cadres/[id]/page.tsx

d) Composants src/components/purchase/ :
   - PendingPosTable.tsx (BC en attente DG)
   - SuppliersTable.tsx (avec filtres et tri)
   - SupplierDetail.tsx
   - SupplierEvaluationForm.tsx
   - FrameworkContractsTable.tsx
   - PurchaseAnalytics.tsx

SEED
====
- 86 fournisseurs avec données réalistes camerounaises (CIMENCAM, SOCATAM, METALCAM, Total Cameroun, CFAO Motors, Caterpillar Cameroun, etc.)
- 10 marqués strategic=true
- 5 contrats-cadres actifs
- 30 évaluations historiques
- 5 BC en attente de validation DG (montants > 50 M FCFA)

LIVRABLES
=========
- Prototype : screen-purchase enrichi avec 5 onglets
- Code complet
- Commit "feat(dg): achats — validations DG, fournisseurs, contrats-cadres, analytics"
```

---

## ✅ Fin Bloc 4

Format : "Bloc 4 terminé. Tu peux me livrer le Bloc 5."
