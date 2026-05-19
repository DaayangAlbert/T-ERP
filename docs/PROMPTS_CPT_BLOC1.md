# COMPTABLE · BLOC 1 — Espace Comptabilité (8 fonctions)

**8 fonctions à enchaîner.** Toutes les fonctions appliquent le **filtrage automatique par chantiers**
via le middleware `getAccessibleSiteIds(userId)` :
- Comptable Direction : aucun filtre
- Comptable Chantier : restriction aux `assignedSiteIds`

⚠️ Responsive vérifié par script Playwright à chaque commit.

---

## 🟪 PROMPT 1.1 — Tableau de bord comptable

```
Fonction 1.1 : tableau de bord comptable adaptatif (Direction OU Chantier).

PROTOTYPE HTML — À CRÉER
=========================
L'écran screen-cpt-dashboard n'existe pas encore. À créer.

Le titre et les KPIs s'adaptent automatiquement au rôle :
- Direction : "Tableau de bord comptable · vue globale BatimCAM"
- Chantier : "Tableau de bord comptable · 2 chantiers · Pont Mfoundi · Bastos R+8"

ÉLÉMENTS
=========
1. Bandeau d'identification du périmètre :
   - Direction : "👁 Vue globale · 23 chantiers consolidés"
   - Chantier : "📍 Périmètre limité · Pont Mfoundi + Bastos R+8 · 800 M FCFA cumulés"

2. KPIs (adaptés au périmètre) :
   - Écritures du jour saisies (par moi + par mon équipe)
   - Factures fournisseurs à comptabiliser
   - Échéances fournisseurs J+7
   - Rapprochements bancaires en attente

3. Section "Mes priorités du jour" :
   - 8 factures fournisseurs reçues à comptabiliser (PIWA, Total, SOCAVER...)
   - Situation travaux Pont Mfoundi à émettre avant 12/05 (échéance contrat)
   - 3 BC chantier à valider (montants < 5 M FCFA, seuil Comptable Chantier)
   - Rapprochement bancaire UBA caisse Pont Mfoundi (écart 240 000 FCFA)

4. Section "Activité comptable récente" :
   Timeline des 10 dernières écritures saisies (par moi)
   Avec colonne "Écritures en brouillard" en orange si non validées

5. Graphes :
   - Évolution écritures saisies 30 jours
   - Répartition par journal (achats, ventes, banque, OD, paie)

PRISMA
======
   model Entry {  // déjà existant côté DAF, étendre
     id          String   @id @default(cuid())
     tenantId    String
     siteId      String?  // CRITIQUE pour filtrage Comptable Chantier
     site        Site?    @relation(fields: [siteId], references: [id])
     journalCode String   // "ACH", "VTE", "BQ", "OD", "PAIE", "CAI"
     entryDate   DateTime
     reference   String
     description String
     lines       EntryLine[]
     status      EntryStatus
     createdBy   String
     createdAt   DateTime @default(now())
     validatedBy String?
     validatedAt DateTime?
   }

API
===
- GET /api/comptable/dashboard
  Applique getAccessibleSiteIds(session.user.id) pour filtrer toutes les requêtes.
  Renvoie kpis, priorities, recentActivity, charts adapté au périmètre.

COMPOSANTS src/components/comptable/dashboard/
================================================
- CptScopeBanner.tsx (affiche périmètre : Direction OU n chantiers)
- CptKpiRow.tsx
- CptPrioritiesList.tsx
- CptActivityTimeline.tsx
- EntriesEvolutionChart.tsx
- JournalsDistributionDonut.tsx

⚠️ RESPONSIVE
==============
- Bandeau périmètre : flex-wrap mobile, chip chantiers cliquables
- KPIs 4 col → 2x2 → 1 col
- Timeline : carte verticale mobile-friendly
- Donut : empilement légende sous le donut mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable

TESTS RBAC OBLIGATOIRES
========================
1. Connexion Sylvie ATANGANA (Comptable Direction, assignedSiteIds=[]) →
   bandeau "Vue globale 23 chantiers" + KPIs consolidés sur tous les chantiers
2. Connexion Jacques MBARGA (assignedSiteIds=[pont-mfoundi, bastos-r8]) →
   bandeau "Périmètre limité 2 chantiers" + KPIs seulement sur ces 2 chantiers
3. Test API : Jacques fait GET /api/comptable/dashboard, vérifier que la réponse
   ne contient AUCUNE donnée des autres chantiers (vérifier au niveau Network panel)

LIVRABLES
=========
- Prototype : screen-cpt-dashboard
- Code complet avec RBAC fonctionnel
- 3 tests RBAC validés
- Audit responsive 7/7 OK
- Commit "feat(comptable): tableau de bord adaptatif + RBAC — fn 1.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.2 — Saisie d'écritures

```
Fonction 1.2 : saisie d'écritures comptables au journal.

PROTOTYPE HTML — À CRÉER : screen-cpt-ecritures
================================================

ÉLÉMENTS
=========
1. Sélecteur de journal en haut (chips cliquables) :
   - Achats (ACH)
   - Ventes (VTE)
   - Banque (BQ) — désactivé si Comptable Chantier sauf caisse chantier
   - OD (Opérations diverses) — désactivé si Comptable Chantier
   - Paie (PAIE) — désactivé si Comptable Chantier
   - Caisse chantier (CAI)
2. Sélecteur de période (mois courant par défaut)
3. Bouton "+ Nouvelle écriture" (ouvre modale saisie)
4. KPIs :
   - Écritures du mois : 142
   - En brouillard : 8
   - Validées : 134
   - Montant cumulé : 218 M FCFA
5. Tableau écritures du journal sélectionné :
   N° pièce, Date, Référence, Libellé, Compte débit, Compte crédit, Montant,
   Chantier (visible uniquement si Comptable Direction), Statut
6. Footer : totaux débit / crédit / équilibre OK

Modale "Nouvelle écriture" :
- Date écriture (par défaut aujourd'hui)
- Journal (préselectionné)
- Référence (auto-incrément ou manuel)
- Libellé
- Tableau lignes d'écriture (au moins 2 lignes, débit = crédit) :
  Compte | Tiers (si compte de tiers) | Libellé ligne | Débit | Crédit | Chantier analytique
- Vérification équilibre en temps réel (vert si OK, rouge sinon)
- Bouton "Enregistrer en brouillard" / "Enregistrer et valider"

PRISMA
======
Le model Entry existe (fn 1.1). Ajouter :
   model EntryLine {
     id          String   @id @default(cuid())
     entryId     String
     entry       Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
     accountCode String   // ex: "401001", "604000", "445660"
     thirdPartyId String?
     description String
     debit       BigInt   @default(0)
     credit      BigInt   @default(0)
     siteId      String?  // analytique
   }

   model ChartOfAccounts {  // plan comptable SYSCOHADA
     id          String   @id @default(cuid())
     tenantId    String
     code        String
     name        String
     class       Int      // 1-9
     type        AccountType
     requiresThirdParty Boolean @default(false)
     active      Boolean  @default(true)
     @@unique([tenantId, code])
   }
   enum AccountType { ASSET LIABILITY EQUITY REVENUE EXPENSE OFF_BALANCE }

API
===
- GET /api/comptable/entries?journal=ACH&period=2026-05
  Filtré par getAccessibleSiteIds
- POST /api/comptable/entries (création avec lignes, transaction)
- PATCH /api/comptable/entries/:id (modification si DRAFT)
- DELETE /api/comptable/entries/:id (annulation, crée extournes si déjà validée)
- POST /api/comptable/entries/:id/validate (passer en VALIDATED)
- GET /api/comptable/accounts (plan comptable)

COMPOSANTS src/components/comptable/entries/
==============================================
- JournalSelector.tsx (chips, désactivation selon RBAC)
- EntriesKpis.tsx
- EntriesTable.tsx ⚠️ RESPONSIVE
- EntryFormModal.tsx (multi-lignes, équilibre temps réel)
- AccountAutocomplete.tsx (recherche compte)
- AnalyticalSiteSelect.tsx (chantier analytique, filtré RBAC)

⚠️ RESPONSIVE
==============
- Sélecteur de journal : scroll horizontal mobile
- Tableau écritures : cards mobile avec lignes débit/crédit empilées
- Modale saisie : plein écran mobile, lignes en cards séparées sur mobile

RBAC
=====
- Comptable Chantier ne peut saisir QUE journaux ACH, VTE, CAI sur SES chantiers
- Toute écriture créée par un Comptable Chantier a obligatoirement un siteId dans son périmètre
- API rejette avec 403 si tentative de saisie sur compte non-autorisé

LIVRABLES
=========
- Prototype : screen-cpt-ecritures
- Code complet
- Plan comptable SYSCOHADA Cameroun seedé (300+ comptes)
- Test : Jacques saisit une écriture ACH pour facture PIWA Pont Mfoundi → OK
- Test : Jacques tente de saisir une écriture pour Voirie Bonabéri → 403
- Test : équilibre débit/crédit en temps réel
- Audit responsive 7/7 OK
- Commit "feat(comptable): saisie écritures + journaux + RBAC — fn 1.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.3 — Factures fournisseurs

```
Fonction 1.3 : réception, comptabilisation et suivi factures fournisseurs.

PROTOTYPE HTML — À CRÉER : screen-cpt-factures-frns

ÉLÉMENTS
=========
1. KPIs : Factures à comptabiliser, échéant J+7, en litige, payées ce mois
2. Onglets : À comptabiliser / Comptabilisées / À payer J+7 / En litige / Payées
3. Tableau factures avec colonnes adaptatives RBAC :
   N° facture frns, Fournisseur, Date facture, Échéance, Montant TTC,
   BC d'origine, Chantier (si Direction), Statut
4. Modale "Comptabiliser facture" :
   - Upload facture PDF avec OCR pré-rempli (date, montant, TVA)
   - Validation contre BC d'origine (3-way matching avec BL)
   - Génération auto de l'écriture comptable (compte 401 fournisseur + 60x charges
     + 4456 TVA)
   - Affectation analytique chantier obligatoire (filtrée RBAC)

PRISMA
======
   model SupplierInvoice {
     id              String   @id @default(cuid())
     tenantId        String
     supplierId      String
     supplier        Supplier @relation(fields: [supplierId], references: [id])
     invoiceNumber   String
     invoiceDate     DateTime
     dueDate         DateTime
     amountHt        BigInt
     vatAmount       BigInt
     amountTtc       BigInt
     siteId          String?
     site            Site?    @relation(fields: [siteId], references: [id])
     poRef           String?  // BC d'origine
     deliveryRef     String?  // BL réception
     status          InvoiceStatus
     entryId         String?  // écriture comptable liée
     attachments     String[]
     receivedAt      DateTime @default(now())
     accountedAt     DateTime?
     accountedBy     String?
     paidAt          DateTime?
   }
   enum InvoiceStatus { RECEIVED PENDING_3WAY_MATCH ACCOUNTED PENDING_PAYMENT PAID DISPUTED REJECTED }

API
===
- GET /api/comptable/supplier-invoices (filtré RBAC)
- POST /api/comptable/supplier-invoices (upload + OCR)
- POST /api/comptable/supplier-invoices/:id/account (déclenche création Entry liée)
- POST /api/comptable/supplier-invoices/:id/dispute (mise en litige + motif)
- POST /api/comptable/supplier-invoices/:id/pay (marque payée)

⚠️ RESPONSIVE
==============
Tableau → cards mobile avec échéance en couleur (rouge si dépassée).

RBAC
=====
- Comptable Chantier : voit uniquement les factures liées à ses chantiers
- Comptable Direction : voit toutes + peut comptabiliser celles sans chantier (frais
  généraux siège)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/factures-frns

LIVRABLES
=========
- Prototype : screen-cpt-factures-frns
- Code complet avec OCR (tesseract.js ou API externe)
- Test : upload facture PIWA → OCR extrait montant 4 200 000 + TVA →
  écriture générée (compte 604 Achats matériels / 401 PIWA / 4456 TVA)
- Audit responsive 7/7 OK
- Commit "feat(comptable): factures fournisseurs + OCR + 3-way matching — fn 1.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.4 — Factures clients (situations de travaux)

```
Fonction 1.4 : émission et suivi des situations de travaux clients.

PROTOTYPE HTML — À CRÉER : screen-cpt-factures-clients

ÉLÉMENTS
=========
1. KPIs : à émettre, émises ce mois, encaissées, en retard de paiement
2. Onglets : Situations en cours / Émises / Encaissées / En retard / Balance âgée
3. Tableau situations :
   N° situation, Chantier, Client (MOA), Période, Montant cumulé, %
   d'avancement, État (brouillon, validée, envoyée, payée), Échéance
4. Modale "Nouvelle situation de travaux" (wizard) :
   Étape 1 : Sélection chantier (filtré RBAC) + période
   Étape 2 : Tableau métré avec quantités exécutées cumulées par poste BPU
   Étape 3 : Calcul automatique HT (prix BPU × qté), TVA 19,25%, retenue de
   garantie 5%, retenue à la source 2,2%
   Étape 4 : Récapitulatif et émission PDF officiel

PRISMA
======
   model ProgressBilling {
     id              String   @id @default(cuid())
     tenantId        String
     siteId          String
     site            Site     @relation(fields: [siteId], references: [id])
     billingNumber   String   @unique
     period          String   // "2026-05"
     amountHt        BigInt
     vatAmount       BigInt
     amountTtc       BigInt
     guaranteeRetention BigInt @default(0)
     sourceWithholding BigInt @default(0)
     netToReceive    BigInt
     dueDate         DateTime
     status          BillingStatus
     items           Json     // [{ bpu_code, designation, unit, cumQty, prevCumQty, periodQty, unitPrice, total }]
     pdfUrl          String?
     paidAt          DateTime?
     paidAmount      BigInt?
   }
   enum BillingStatus { DRAFT VALIDATED ISSUED PARTIALLY_PAID PAID OVERDUE DISPUTED }

API
===
- GET /api/comptable/progress-billings (filtré RBAC)
- POST /api/comptable/progress-billings (création wizard)
- POST /api/comptable/progress-billings/:id/issue (génération PDF + email MOA)
- POST /api/comptable/progress-billings/:id/payment (saisie encaissement)

⚠️ RESPONSIVE
==============
Wizard 4 étapes : stepper horizontal desktop, vertical mobile.
Tableau métré : scroll horizontal mobile (trop de colonnes pour cards).

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/factures-clients

LIVRABLES
=========
- Prototype : screen-cpt-factures-clients
- Code complet
- Génération PDF situation travaux conforme à la norme camerounaise
- Test : Jacques émet situation S3 Pont Mfoundi 78% → 218 M HT → 259,9 M TTC →
  net à recevoir 240,1 M (après retenues)
- Audit responsive 7/7 OK
- Commit "feat(comptable): situations de travaux + métré + PDF — fn 1.4
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.5 — Trésorerie comptable

```
Fonction 1.5 : trésorerie comptable + rapprochements bancaires.

CONTEXTE RBAC
=============
- Comptable Direction : accès aux 5 comptes bancaires de BatimCAM + caisses chantiers
- Comptable Chantier : accès UNIQUEMENT aux caisses de ses chantiers (pas aux banques)

PROTOTYPE HTML — À CRÉER : screen-cpt-tresorerie

ÉLÉMENTS (vue Direction)
=========================
1. KPIs trésorerie : encaissements jour, décaissements jour, soldes consolidés
2. Onglets : Banques (5) / Caisses chantiers / Rapprochements / Virements
3. Tableau banques (déjà fait côté DAF, ici on consulte + on rapproche)
4. Outil de rapprochement :
   Panneau gauche : relevé bancaire (import CSV ou OFX)
   Panneau droit : écritures comptables de la période
   Glisser-déposer pour matcher
   Surlignage automatique des suggestions

ÉLÉMENTS (vue Chantier Comptable Chantier)
============================================
1. KPIs caisse chantier : solde, mouvements jour, à régulariser
2. Liste des caisses (1 par chantier assigné)
3. Saisie d'un mouvement de caisse (entrée/sortie avec justificatif)

PRISMA
======
Réutilise BankAccount et BankMovement (DAF fn 1.2).
Ajouter :
   model SiteCashbox {
     id          String   @id @default(cuid())
     siteId      String   @unique
     site        Site     @relation(fields: [siteId], references: [id])
     balance     BigInt   @default(0)
     custodianId String   // chef de chantier ou comptable chantier
   }

   model CashboxMovement {
     id          String   @id @default(cuid())
     cashboxId   String
     cashbox     SiteCashbox @relation(fields: [cashboxId], references: [id])
     direction   MovementDirection
     amount      BigInt
     reason      String
     reference   String?
     attachments String[]
     occurredAt  DateTime
     recordedBy  String
     createdAt   DateTime @default(now())
   }

API
===
- GET /api/comptable/treasury/banks (Direction uniquement)
- GET /api/comptable/treasury/cashboxes (filtré RBAC)
- POST /api/comptable/treasury/reconciliation (pour Direction)
- POST /api/comptable/treasury/cashbox-movements (entrée/sortie)

⚠️ RESPONSIVE
==============
Outil de rapprochement : 2 panneaux côte à côte desktop → empilés mobile avec switcher.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/tresorerie

LIVRABLES
=========
- Prototype : screen-cpt-tresorerie (avec affichage adaptatif RBAC)
- Code complet
- Test Direction : Sylvie rapproche UBA mars (écart 2,1 M) → 8 mouvements matchés
- Test Chantier : Jacques voit uniquement caisses Pont Mfoundi + Bastos R+8
- Audit responsive 7/7 OK
- Commit "feat(comptable): trésorerie + rapprochements + caisses RBAC — fn 1.5
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.6 — Stocks et immobilisations

```
Fonction 1.6 : valorisation comptable des stocks et immobilisations.

PROTOTYPE HTML — À CRÉER : screen-cpt-actifs

CONTEXTE
========
Le Comptable a une vue comptable des stocks (PMP, valorisation, écritures
mouvements) et immobilisations (amortissements, sorties).

ÉLÉMENTS
=========
1. KPIs : valeur stock 412 M, immobilisations brutes 1,8 Md, amortissements
   cumulés -640 M, valeur nette 1,16 Md
2. Onglets : Stocks (valorisation) / Inventaires / Immobilisations / Amortissements
3. Tableau stocks valorisés (filtré RBAC : Chantier ne voit que stocks de ses chantiers)
4. Tableau immobilisations :
   Code, Désignation, Date acquisition, Valeur acquisition, Méthode amort.
   (linéaire/dégressif), Durée, VNC actuelle, Affectation chantier
5. Calcul mensuel amortissements automatique → génération écriture OD

PRISMA
======
Stock existe côté Magasinier. Ajouter ici l'aspect comptable :
   model FixedAsset {
     id          String   @id @default(cuid())
     tenantId    String
     code        String
     designation String
     category    AssetCategory
     acquisitionDate DateTime
     acquisitionValue BigInt
     depreciationMethod DepreciationMethod
     usefulLifeYears Int
     residualValue BigInt @default(0)
     currentNetValue BigInt
     siteId      String?  // chantier où il est affecté
     site        Site?    @relation(fields: [siteId], references: [id])
     status      AssetStatus
     disposalDate DateTime?
     disposalValue BigInt?
   }
   enum AssetCategory { LAND BUILDING MACHINERY VEHICLE FURNITURE COMPUTER TOOLS OTHER }
   enum DepreciationMethod { STRAIGHT_LINE DECLINING_BALANCE }
   enum AssetStatus { ACTIVE IDLE UNDER_REPAIR DISPOSED }

API
===
- GET /api/comptable/stock-valuation (filtré RBAC)
- GET /api/comptable/fixed-assets (filtré RBAC)
- POST /api/comptable/fixed-assets (création)
- POST /api/comptable/fixed-assets/depreciation-run (calcul mensuel auto)

⚠️ RESPONSIVE
==============
Tableaux → cards mobile.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/actifs

LIVRABLES
=========
- Prototype : screen-cpt-actifs
- Code complet
- Test : run amortissement mai 2026 → 23 immobilisations amorties →
  écriture OD générée (compte 6811 / 2815)
- Audit responsive 7/7 OK
- Commit "feat(comptable): stocks valorisés + immobilisations + amortissements — fn 1.6
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.7 — Déclarations fiscales et sociales (Direction uniquement)

```
Fonction 1.7 : déclarations fiscales et sociales.

⚠️ RESTRICTION RBAC
====================
Cette fonction n'est accessible QUE par le Comptable Direction.
Le Comptable Chantier voit l'item dans la sidebar grisé avec tooltip "Réservé au
Comptable Direction".
Côté API : 403 systématique pour tout Comptable Chantier.

PROTOTYPE HTML — À CRÉER : screen-cpt-fiscal

CONTEXTE
========
Cette fonction reproduit en grande partie l'écran screen-daf-fiscal (déjà côté DAF),
mais avec un focus opérationnel : préparation des déclarations, génération PDFs
officiels, soumission via téléprocédure.

Le DAF supervise et signe, le Comptable Direction prépare et soumet.

ÉLÉMENTS
=========
1. Tableau échéances 30 jours (cf. screen-daf-fiscal)
2. Onglets : À préparer / À soumettre / Soumises / Payées / Audits en cours
3. Pour chaque type de déclaration, génération automatique pré-remplie :
   - TVA mensuelle (formulaire DGI)
   - DIPE CNPS (Déclaration Informatisée des Personnels Employés)
   - IRPP mensuel (retenues à la source salariés)
   - Acompte IS trimestriel
   - DSF annuelle (Déclaration Statistique et Fiscale)
4. Workflow : préparation comptable → revue DAF → signature → soumission →
   accusé de réception → paiement

PRISMA
======
TaxDeadline et TaxAudit existent côté DAF (fn 1.6).

API
===
- GET /api/comptable/tax/preparation
- POST /api/comptable/tax/declarations/:id/prepare (génère PDF pré-rempli)
- POST /api/comptable/tax/declarations/:id/submit (soumission après signature DAF)

⚠️ RESPONSIVE
==============
Standard.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/fiscal

LIVRABLES
=========
- Prototype : screen-cpt-fiscal
- Code complet avec génération PDF DIPE, TVA, IRPP conformes
- RBAC strict : Comptable Chantier reçoit 403
- Audit responsive 7/7 OK
- Commit "feat(comptable): déclarations fiscales et sociales (Direction) — fn 1.7
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.8 — Grand livre et balance

```
Fonction 1.8 : consultation grand livre, balance, lettrage.

PROTOTYPE HTML — À CRÉER : screen-cpt-grand-livre

ÉLÉMENTS
=========
1. Onglets : Grand livre / Balance générale / Balance auxiliaire / Lettrage /
   Justification comptes
2. Onglet "Grand livre" :
   - Sélecteur compte (autocomplete plan SYSCOHADA)
   - Période (mois courant par défaut)
   - Tableau mouvements compte : date, journal, libellé, débit, crédit, solde
   - Pagination si > 100 lignes
3. Onglet "Balance générale" :
   - Vue de la balance toutes classes 1-7
   - Soldes débiteurs / créditeurs
   - Export Excel
4. Onglet "Balance auxiliaire" :
   - Comptes 401 (fournisseurs) et 411 (clients) avec détail par tiers
5. Onglet "Lettrage" :
   - Liste des écritures non lettrées d'un compte de tiers
   - Sélection multiple → "Lettrer ensemble" si total équilibre

RBAC
=====
Le Comptable Chantier voit le grand livre **filtré par siteId** :
seules les écritures de ses chantiers apparaissent dans le grand livre.
Sa balance est partielle (vue analytique chantier, pas la balance générale).

PRISMA
======
Pas de nouveau model nécessaire. Utilise Entry + EntryLine.
Ajouter sur EntryLine :
   lettering   String?  // code lettrage si lettré

API
===
- GET /api/comptable/general-ledger?account=&period=&siteId=
- GET /api/comptable/balance?period=&type=general|auxiliary
- GET /api/comptable/unmatched/:thirdPartyId (écritures non lettrées)
- POST /api/comptable/lettering (lettrage multi-écritures)

⚠️ RESPONSIVE
==============
Tableau mouvements : scroll horizontal mobile (trop de colonnes pour cards).
Balance : pivotée en cards mobile avec compte + solde.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /comptable/grand-livre

LIVRABLES
=========
- Prototype : screen-cpt-grand-livre
- Code complet
- Test Direction : Sylvie consulte compte 401 → 142 mouvements toutes opérations
- Test Chantier : Jacques consulte compte 401 → 38 mouvements (uniquement Pont
  Mfoundi + Bastos R+8)
- Test lettrage : sélectionner facture PIWA 4,2 M + règlement 4,2 M → lettré "A001"
- Audit responsive 7/7 OK
- Commit "feat(comptable): grand livre + balance + lettrage RBAC — fn 1.8
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ FIN BLOC 1 — Espace Comptabilité (8 fonctions)

Une fois les 8 fonctions livrées, demande :
"Bloc 1 Comptable terminé. Tu peux me livrer le Bloc 2."

Le Bloc 2 couvrira les modules transverses (Validations, Rapports comptables,
Mon espace personnel).
