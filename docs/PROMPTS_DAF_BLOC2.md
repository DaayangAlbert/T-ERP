# DAF · BLOC 2 — Pilotage financier approfondi

**3 fonctions · 3 prompts à enchaîner**

Modules transverses approfondis pour le DAF : Comptabilité (saisie + supervision),
Finances (analyse profonde), Achats (validation N2 et fournisseurs).

⚠️ RAPPEL : chaque commit doit valider le responsive sur 7 tailles d'écran
(1920 / 1440 / 1280 / 1024 / 768 / 414 / 375).

---

## 🟪 PROMPT 2.1 — Comptabilité (vue DAF supervision)

```
Module : Comptabilité · vue DAF.

CONTEXTE
========
Le DG a déjà la vue Comptabilité de haut niveau (clôtures annuelles, états SYSCOHADA).
Le DAF a une vue plus profonde au quotidien :
- Supervision des saisies du comptable
- Validation des écritures sensibles (OD, provisions, exceptionnelles)
- Rapprochements bancaires
- Suivi période en cours
- Préparation des clôtures mensuelles

PROTOTYPE HTML — ENRICHISSEMENT screen-accounting-daf
======================================================
Crée un nouvel écran screen-accounting-daf qui REMPLACE la vue Comptabilité par défaut
quand l'utilisateur courant est DAF.

1. Header : "Comptabilité — supervision DAF"
   Sélecteur de période en haut (mois courant par défaut, navigation flèches)

2. KPIs spécifiques DAF :
   - Écritures du jour saisies par le comptable (15)
   - Écritures en brouillard à valider (3)
   - Comptes non rapprochés (5 sur 12 banques)
   - Période ouverte / Jours avant clôture mensuelle (J-3)

3. Section "Écritures à valider" :
   Listview des écritures en brouillard supérieures à 5 M FCFA ou de type OD/provision
   (qui nécessitent validation DAF). Pour chaque ligne :
   référence, journal, libellé, montant, saisie par, ancienneté (heures)
   Boutons valider/rejeter/modifier.

4. Section "Rapprochements bancaires" :
   Tableau par banque :
   colonnes Banque | Solde comptable | Solde banque | Écart | Statut rapprochement |
   Actions
   Cliquer un rapprochement → outil de pointage (relevé bancaire ↔ écritures comptables)

5. Section "Préparation clôture mensuelle" :
   Checklist des opérations à valider avant clôture :
   ✓ Toutes factures fournisseurs comptabilisées (142)
   ✓ Salaires d'avril provisionnés (28 jours)
   ⏳ Charges sociales d'avril provisionnées (en cours)
   ⏳ Charges constatées d'avance (loyers, assurances) (à faire)
   ⏳ Amortissements du mois (à calculer auto)
   ⏳ Dépréciation créances douteuses (1 dossier > 90j)
   ✓ Inventaire stock effectué
   ⏳ Cut-off ventes (factures Avril émises avant 5 mai)
   Bouton "Lancer la clôture mensuelle" (désactivé tant que toutes les cases ne sont
   pas validées).

6. Liens vers grand livre, balance, journaux (existants côté DG).

PRISMA
======
Étendre Entry existant :
   model Entry {
     ...
     status        EntryStatus  @default(DRAFT)
     validatedByDaf Boolean     @default(false)
     dafValidatedAt DateTime?
     dafValidatedBy String?
     requiresDafValidation Boolean @default(false) // calculé selon montant ou type
   }
   enum EntryStatus { DRAFT VALIDATED LOCKED REVERSED }

   model BankReconciliation {
     id              String   @id @default(cuid())
     tenantId        String
     bankAccountId   String
     period          String
     bookBalance     BigInt
     bankBalance     BigInt
     gap             BigInt   // calculé
     reconciledItems Json     // ids des entries pointées
     status          ReconciliationStatus
     completedAt     DateTime?
   }
   enum ReconciliationStatus { PENDING IN_PROGRESS COMPLETED VALIDATED }

   model MonthlyClosingChecklist {
     id          String   @id @default(cuid())
     tenantId    String
     period      String
     items       Json     // [{ key, label, status, completedAt, by }]
     status      ClosingStatus
   }
   enum ClosingStatus { OPEN IN_PROGRESS READY CLOSED }

API
===
- GET /api/daf/accounting/dashboard
- GET /api/daf/accounting/entries-to-validate
- POST /api/daf/accounting/entries/:id/validate
- POST /api/daf/accounting/entries/:id/reject
- GET /api/daf/accounting/bank-reconciliations
- POST /api/daf/accounting/bank-reconciliations/:id/match (pointer items)
- GET /api/daf/accounting/monthly-closing/:period
- POST /api/daf/accounting/monthly-closing/:period/close

COMPOSANTS src/components/daf/accounting/
==========================================
- AccountingDashboardKpis.tsx
- EntriesToValidateTable.tsx ⚠️ RESPONSIVE (cards sur mobile)
- BankReconciliationsTable.tsx ⚠️ RESPONSIVE (cards sur mobile)
- ReconciliationTool.tsx (outil de pointage : 2 panneaux relevé/écritures)
- MonthlyClosingChecklist.tsx (avec progress bar globale)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Outil de rapprochement bancaire (le plus délicat) :
   - Desktop : 2 panneaux côte à côte (relevé bancaire à gauche, écritures à droite)
   - Tablette : panneaux empilés
   - Mobile : un panneau à la fois avec switcher en haut, drag-and-drop remplacé par
     bouton "associer" sur chaque ligne

2. Checklist clôture :
   - Desktop : checklist avec icônes ✓/⏳ en colonne unique
   - Mobile : conservée en liste verticale (déjà optimal)

3. KPIs du dashboard :
   - Suivent la règle générale (4 row → 2x2 → 1col)

LIVRABLES
=========
- Prototype : screen-accounting-daf
- Code complet avec outil de rapprochement bancaire fonctionnel
- Test : valider une écriture > 5M en brouillard → status passe à VALIDATED
- Test mobile : pointage rapprochement utilisable au tactile
- Commit "feat(daf): comptabilité — supervision, rapprochements, clôture — fn 2.1"
```

---

## 🟪 PROMPT 2.2 — Finances (vue DAF analyse profonde)

```
Module : Finances · vue DAF.

CONTEXTE
========
Le DG a la vue stratégique (P&L synthétique, ratios). Le DAF doit pouvoir creuser :
analyse des écarts, détail par chantier, simulations.

PROTOTYPE HTML — ENRICHISSEMENT screen-finance-daf
===================================================
Crée screen-finance-daf qui remplace la vue Finances pour le DAF.

1. Onglets en haut :
   - Vue d'ensemble (existant DG)
   - Analyse des écarts (NOUVEAU)
   - Profitabilité chantiers (NOUVEAU)
   - Simulations (NOUVEAU)
   - Reporting bancaire (NOUVEAU)

2. Onglet "Analyse des écarts" :
   - Tableau écarts budget vs réalisé par poste de coût (achats, personnel, sous-traitance)
   - Pour chaque ligne : budget, réalisé, écart en valeur, écart en %, alerte si > seuil
   - Drill-down : cliquer une ligne ouvre la décomposition fournisseur ou chantier
   - Graphe waterfall : du résultat budgété au résultat réalisé, étape par étape
   - Commentaires DAF par ligne (texte libre persistant)

3. Onglet "Profitabilité chantiers" :
   - Tableau analytique 23 chantiers actifs avec :
     code | libellé | CA HT YTD | Coûts engagés | Marge | Marge % | Statut
   - Tri par marge décroissante / croissante
   - Heatmap visuelle : code couleur selon marge (rouge < 10%, ambre 10-15%, vert > 15%)
   - Drill-down chantier : détail de la formation de la marge (achats, sous-traitance,
     main d'œuvre directe, frais généraux affectés)

4. Onglet "Simulations" :
   - Outil de simulation de scénarios :
     · Sensibilité au cours de matières (ciment, fer)
     · Impact d'un retard de livraison Pont Mfoundi
     · Effet d'une revalorisation salariale 5%
   - Résultats : impact sur P&L, BFR, trésorerie
   - Sauvegarde de scénarios pour comparaison

5. Onglet "Reporting bancaire" :
   - Génération de tableaux de bord pour les 5 banques (UBA, BICEC, Afriland,
     Ecobank, SGBC) — chaque banque a ses formats de demande
   - Templates pré-remplis : situation à date, ratios, prévisionnel 6 mois
   - Bouton "Générer pour relationship manager UBA" → PDF prêt à envoyer

PRISMA
======
   model BudgetVariance {
     id          String   @id @default(cuid())
     tenantId    String
     period      String
     costCenter  String
     budgetAmount  BigInt
     actualAmount  BigInt
     variance      BigInt   // calculé
     variancePercent Float  // calculé
     comment     String?  @db.Text
     commentAuthor String?
     commentAt   DateTime?
   }

   model SiteProfitability {
     id          String   @id @default(cuid())
     siteId      String
     siteRef     String
     period      String
     revenueYtd  BigInt
     directCosts BigInt
     indirectCosts BigInt
     grossMargin BigInt
     marginPercent Float
     calculatedAt DateTime @default(now())
   }

   model FinancialScenario {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     description String?
     parameters  Json     // hypothèses
     results     Json     // P&L, BFR, treasury impact
     authorId    String
     createdAt   DateTime @default(now())
   }

   model BankingReportTemplate {
     id          String   @id @default(cuid())
     bank        BankCode
     name        String
     blocks      Json     // ratios, tableaux à inclure
   }

API
===
- GET /api/daf/finance/variances?period=...
- POST /api/daf/finance/variances/:id/comment
- GET /api/daf/finance/site-profitability?sortBy=margin&order=asc
- GET /api/daf/finance/site-profitability/:siteId
- POST /api/daf/finance/scenarios (créer simulation)
- GET /api/daf/finance/scenarios
- GET /api/daf/finance/banking-report/:bank/pdf

COMPOSANTS src/components/daf/finance/
=======================================
- VariancesTable.tsx ⚠️ RESPONSIVE
- WaterfallChart.tsx (Recharts custom ou D3)
- SiteProfitabilityHeatmap.tsx ⚠️ RESPONSIVE
- ScenarioSimulator.tsx (formulaire hypothèses + résultats)
- BankingReportGenerator.tsx (sélecteur banque + preview + bouton PDF)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Tableau écarts :
   - Desktop : 7 colonnes
   - Mobile : cards par poste avec progress bar visualisant l'écart % :
     ┌────────────────────────────┐
     │ Achats matériels           │
     │ Budget : 580 M             │
     │ Réalisé : 620 M            │
     │ Écart : +40 M (+6.9%) 🟠   │
     │ ▓▓▓▓▓▓▓░░░ +6.9%           │
     │ [💬 Commenter]             │
     └────────────────────────────┘

2. Heatmap profitabilité :
   - Desktop : tableau classique avec arrière-plan colorisé selon marge
   - Mobile : cards par chantier avec pastille couleur en haut à droite

3. Graphe waterfall :
   - Mobile : passe en vertical (cascade verticale) plutôt qu'horizontal

4. Simulateur :
   - Desktop : panneau hypothèses à gauche, résultats à droite
   - Mobile : empilé verticalement, résultats en bas avec sticky-bottom récap

LIVRABLES
=========
- Prototype : screen-finance-daf avec 5 onglets
- Code complet
- Test simulation : changer hypothèse de cours du ciment +10% → impact P&L visible
- Génération PDF reporting bancaire UBA fonctionnelle
- Commit "feat(daf): finances analyse — écarts, profitabilité, simulations, banking — fn 2.2"
```

---

## 🟪 PROMPT 2.3 — Achats (vue DAF validation N2 + fournisseurs)

```
Module : Achats · vue DAF.

CONTEXTE
========
Le DG valide les BC > 50 M (N3). Le DAF valide N2 entre 5 M et 50 M. Il a aussi
la responsabilité du suivi fournisseurs et des contrats-cadres au niveau financier.

PROTOTYPE HTML — ENRICHISSEMENT screen-purchase-daf
====================================================
Crée screen-purchase-daf qui enrichit la vue achats pour le DAF.

1. Onglets :
   - À valider N2 (NOUVEAU, prioritaire)
   - Bons de commande (existant)
   - Fournisseurs et conditions (NOUVEAU)
   - Contrats-cadres (existant DG, vue DAF négociation)
   - Engagements et provisions (NOUVEAU)

2. Onglet "À valider N2" :
   Listview BC entre 5 M et 50 M en attente de validation N2 DAF.
   Pour chaque BC :
   - Réf, fournisseur, libellé, montant, demandeur, ancienneté demande
   - Justification (texte du demandeur)
   - Comparaison avec budget chantier (consomme X% du budget restant)
   - Comparaison avec prix marché (si lié à un référentiel d'articles)
   - Boutons valider / rejeter / demander complément

3. Onglet "Fournisseurs et conditions" :
   - Listview enrichie avec colonnes financières :
     fournisseur | volume YTD | % du total achats | délai paiement contrat |
     délai effectif moyen | encours | rating financier
   - Drill-down fournisseur : conditions négociées, retards de paiement de notre part,
     incidents, alertes sur la santé financière du fournisseur

4. Onglet "Engagements et provisions" :
   - Tableau des engagements fermes (BC validés mais non livrés/facturés) :
     fournisseur | montant engagé | livraisons attendues | impact tréso prévisionnelle
   - Provisions à constituer (services en cours non facturés)
   - Liens vers les écritures d'OD correspondantes

PRISMA
======
Étendre Supplier existant :
   model Supplier {
     ...
     paymentTermsContract Int  @default(45) // jours négociés
     paymentTermsActual   Int  @default(0)  // moyenne réelle calculée
     financialRating  String?  // "AAA", "BB+", etc
     financialRatingSource String?
     incidentsCount   Int      @default(0)
   }

   model Commitment {
     id          String   @id @default(cuid())
     tenantId    String
     supplierId  String
     supplier    Supplier @relation(fields: [supplierId], references: [id])
     poRef       String
     amount      BigInt
     deliveredAmount BigInt @default(0)
     invoicedAmount BigInt @default(0)
     expectedDeliveryDate DateTime?
     status      CommitmentStatus
   }
   enum CommitmentStatus { ACTIVE PARTIAL_DELIVERY FULFILLED CANCELLED }

API
===
- GET /api/daf/purchase/n2-pending
- POST /api/daf/purchase/n2-validate/:id
- GET /api/daf/purchase/suppliers-financial
- GET /api/daf/purchase/suppliers/:id/payment-history
- GET /api/daf/purchase/commitments
- GET /api/daf/purchase/provisions-to-book

COMPOSANTS src/components/daf/purchase/
========================================
- PoN2PendingTable.tsx ⚠️ RESPONSIVE
- SuppliersFinancialTable.tsx ⚠️ RESPONSIVE
- CommitmentsTable.tsx
- ProvisionsList.tsx

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Tableau BC à valider :
   - Mobile : cards avec montant en gros, justification expandable :
     ┌────────────────────────────┐
     │ BC-202605-0058             │
     │ Total Cameroun · 12 350 000│
     │ Carburant flotte mai       │
     │ Service achats · 2 jours   │
     │ ──────────────────────     │
     │ Conso budget : 8% restant  │
     │ Prix : conforme marché     │
     │ ──────────────────────     │
     │ [✓ Valider] [✗] [Compl.]   │
     └────────────────────────────┘

2. Tableau fournisseurs :
   - Mobile : cards par fournisseur avec mini-graphique délai paiement

LIVRABLES
=========
- Prototype : screen-purchase-daf avec 5 onglets
- Code complet
- Test : valider BC 12 350 000 → status passe à validated, notif demandeur
- Commit "feat(daf): achats — validation N2, fournisseurs financiers, engagements — fn 2.3"
```

---

## ✅ FIN BLOC 2

Format : "Bloc 2 DAF terminé. Tu peux me livrer le Bloc 3."
