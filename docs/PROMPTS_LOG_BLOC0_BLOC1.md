# LOGISTICIEN · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Logisticien d'entreprise (Robert ETONDÉ · siège BatimCAM Yaoundé)

**Position hiérarchique :** rapporte au DG (Albert DAAYANG). Travaille étroitement
avec le DAF (Marie NGONO) pour les validations N2 et le DT (Daniel ESSOMBA) pour
les besoins chantiers. Bras armé des achats et de la flotte côté siège.

**Architecture RBAC** : `role: LOGISTICS` + `assignedSiteIds: []` (vue globale)

**Pas de PWA absolue** : profil bureau au siège. Responsive obligatoire pour
consultation mobile en déplacement. Tap targets standards (40-44px), tableaux
denses acceptés.

---

## ⚠️ PROTOCOLE RESPONSIVE

Tap targets standards (pas 48px stricts comme les profils terrain) :
- Boutons standards : 36-40px hauteur
- Inputs : font 14px (pas anti-zoom iOS 16px car desktop principalement)
- Tableaux denses acceptés (vue agrégée multi-chantiers)

```bash
pnpm exec tsx scripts/audit-responsive.ts /log/<route>
```

Format commit : "✅ Audit : 7/7 responsive OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE LOGISTICIEN

```
Phase de développement du profil Logisticien (Robert ETONDÉ).

CONTEXTE
========
- Le prototype HTML contient 6 écrans Espace LOG :
  screen-log-dashboard, screen-log-bc, screen-log-fournisseurs,
  screen-log-flotte, screen-log-transferts, screen-log-stats
- Tous ont les attributs data-rh-screen + data-log-screen
- Robert ETONDÉ a assignedSiteIds=[] → vue globale 23 chantiers
- Il rapporte au DG (Albert DAAYANG)
- Il valide N1 les BC en complétude, le DAF valide N2 si > 5M FCFA
- Il consolide les besoins des 23 chantiers et négocie centralement
- Il gère la flotte 42 engins/véhicules (2,8 Md FCFA valorisation)

CONVENTIONS
============
- Écrans prototype : id="screen-log-<fonction>"
- Pages Next.js : src/app/(app)/log/<fonction>/page.tsx
- Composants : src/components/log/<NomFonction>.tsx
- API routes : src/app/api/log/<fonction>/route.ts
- Hooks : src/hooks/useLog<Fonction>.ts

DIFFÉRENCE AVEC MAGASINIER
===========================
| Aspect | Magasinier (Lucas) | Logisticien (Robert) |
|--------|-------------------|---------------------|
| Périmètre | 1 chantier | 23 chantiers consolidés |
| Localisation | Sur chantier (magasin) | Bureau siège Yaoundé |
| Stocks vus | Son magasin uniquement | Tous chantiers agrégés |
| BC initiés | Demande consommables locaux | Émet gros BC + contrats-cadres |
| Validation BC | Réception physique | Validation N1 émission |
| Flotte engins | Voit les engins de son chantier | Gère toute la flotte |
| Transferts | Subit ou demande | Arbitre et organise |
| Fournisseurs | Connaît les habituels | Négocie contrats-cadres |
| PWA offline | Indispensable | Pas nécessaire |
| Tap targets | 48px stricts terrain | Standards desktop |

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     LOGISTICS
   }

2. Créer le layout dédié src/app/(app)/log/layout.tsx :
   - Vérifie Role.LOGISTICS (sinon redirect /dashboard)
   - assignedSiteIds doit être [] (sinon redirect)
   - Charge le LogisticsContext (vue globale 23 chantiers)
   - Wrap children dans <div data-log-screen data-rh-screen className="rh-page">

3. Étendre Prisma — 6 nouveaux/étendus models (cf détail complet dans le code) :
   - PurchaseOrder (étendu) avec workflow N1/N2 et statuts détaillés
   - Supplier (étendu) avec conformité fiscale Cameroun (NIU, attestations)
   - FrameworkAgreement (nouveau) pour contrats-cadres
   - SupplierEvaluation (nouveau) évaluations trimestrielles 3 axes
   - Equipment (nouveau) + EquipmentAssignment + MaintenanceSchedule
   - InterSiteTransfer (nouveau) avec arbitrage et économie estimée

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 6 nouveaux/étendus models
- Layout LOG protégé par rôle LOGISTICS + assignedSiteIds=[]
- Seed : 86 fournisseurs dont 18 contrats-cadres (BICAM/ALUCAM/Total/STRABAG/STI/
  Carrière Mfou et 68 autres ponctuels)
- Seed : 42 engins répartis (18 engins TP, 12 camions, 6 bétonnières, 6 véhicules
  de service) sur 23 chantiers + siège
- Seed : 142 BC YTD dont 38 en cours, 8 à valider (3 nécessitent N2 DAF > 5M)
- Seed : 4 demandes de transfert en attente + 3 validés récents
- Seed : Robert ETONDÉ robert@batimcam.cm / Demo2026!
- Test : Robert se connecte → dashboard logistique consolidé
- Test RBAC : Robert tente d'accéder /cdt → 403, /dg → 403
- Audit responsive 7/7 OK
- Commit "chore(log): bootstrap logisticien + Prisma achats/flotte/transferts"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 6 fonctions Espace Logisticien

### PROMPT 1.1 — Tableau de bord logistique

```
Fonction 1.1 : tableau de bord consolidé multi-chantiers.

PROTOTYPE HTML
==============
L'écran screen-log-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau gradient violet "🚚 Siège · vue consolidée 23 chantiers" + chip
  "Stocks tous chantiers · 218 M FCFA"
- Salutation "Bonjour Robert · 142 BC suivis · 86 fournisseurs · 42 engins ·
  8 BC à valider"
- KPIs (BC en cours 38, À valider 8 ambré dont 3 N2 DAF, Engins 36/42 vert,
  Économies achats 62 M vert)
- Section "Alertes logistique" : 5 alertes hiérarchisées
  * 14 ruptures imminentes consolidées tous chantiers (rouge)
  * Pelle CAT 320 panne moteur Bastos (rouge)
  * 4 demandes transfert inter-chantiers en attente (ambré)
  * Contrat-cadre BICAM expire dans 45j (ambré)
  * 8 BC à valider dont 3 nécessitent N2 DAF (bleu)
- 2 graphes côte à côte :
  * Donut "Achats YTD par catégorie 948 M FCFA" (Ciment 38% violet, Acier 26%,
    Carburants 18%, Coffrage 10%, Granulats 8%)
  * Top 5 fournisseurs YTD en barres horizontales (BICAM 372M, ALUCAM 246M,
    Total 170M, STRABAG 88M, Carrière Mfou 42M)
- Tableau "Stocks par chantier (top 6)" avec valeur + ruptures + statut

API
===
- GET /api/log/dashboard
  → KPIs consolidés tous chantiers
  → alertes hiérarchisées par priorité
  → top 6 chantiers par valeur stock
- GET /api/log/dashboard/charts (achats par catégorie + top fournisseurs)

COMPOSANTS src/components/log/dashboard/
==========================================
- LogHeaderBanner.tsx
- LogGreeting.tsx
- LogKpiRow.tsx (4 KPIs)
- LogisticsAlertsList.tsx (5 alertes avec border-left coloré)
- PurchasesByCategoryDonut.tsx (donut SVG 5 catégories)
- TopSuppliersBarChart.tsx (barres horizontales)
- StocksByConstructionSiteTable.tsx

⚠️ RESPONSIVE
==============
- KPIs : 4 col desktop → 2x2 tablet → 1 col mobile
- Graphes : 2 col → 1 col empilé < 768px
- Tableau stocks chantiers : transformation en cards mobile via ::before content
- Alertes : items 60px avec wrap mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log

LIVRABLES
=========
- Code complet
- Test : Robert se connecte → dashboard avec 218 M valorisation + 5 alertes
- Test : tap sur alerte "14 ruptures imminentes" → navigation /log/ruptures-plan
- Audit responsive 7/7 OK
- Commit "feat(log): tableau de bord logistique consolidé — fn 1.1"
```

---

### PROMPT 1.2 — Bons de commande

```
Fonction 1.2 : émission et suivi des bons de commande avec workflow N1/N2.

PROTOTYPE HTML
==============
L'écran screen-log-bc existe. Reproduire avec :
- Header avec actions "Export Excel" + "+ Nouveau BC"
- KPIs (En cours 38, À valider 8 ambré, N2 DAF 3 rouge, Reçus mois 42 vert
  dont 4 écarts)
- Card filtres 5 colonnes (Recherche, Statut, Fournisseur, Chantier, Catégorie)
- Tableau 8 BC avec colonnes (Réf BC mono, Fournisseur, Articles, Chantier,
  Montant HT mono, Livraison, Statut chip, action Voir)

WORKFLOW MÉTIER
================
**Émission BC** :
1. Robert reçoit demande achat (depuis Magasinier ou DT)
2. Tape "+ Nouveau BC" → wizard 4 étapes :
   - Étape 1 : Fournisseur + chantier destination
   - Étape 2 : Articles + quantités (depuis catalogue)
   - Étape 3 : Prix unitaires (pré-remplis depuis contrats-cadres si applicable)
     + conditions paiement
   - Étape 4 : Récap + livraison souhaitée + notes
3. Robert valide N1 (émission directe)
4. Si montant > 5M FCFA : statut PENDING_N2_DAF, notification DAF (Marie NGONO)
5. DAF valide N2 → statut EMITTED, PDF généré + envoyé fournisseur

**Suivi BC** :
- Fournisseur confirme → CONFIRMED
- Livraison partielle → PARTIALLY_DELIVERED (lien avec Magasinier qui réceptionne)
- Livraison complète → DELIVERED
- Facture reçue Compta → INVOICED
- BL conforme + facture payée → CLOSED

CALCUL TVA
===========
- TVA Cameroun standard 19,25%
- Exonérations possibles selon convention chantier (champ Site.vatExempt)

API
===
- GET /api/log/purchase-orders?status=&supplier=&site=&category=&search=&page=
- GET /api/log/purchase-orders/:id
- POST /api/log/purchase-orders (création DRAFT)
- POST /api/log/purchase-orders/:id/submit-for-validation
- POST /api/log/purchase-orders/:id/validate-n1
- POST /api/log/purchase-orders/:id/validate-n2 (DAF only)
- POST /api/log/purchase-orders/:id/emit (génère PDF + envoi email fournisseur)
- POST /api/log/purchase-orders/:id/cancel
- GET /api/log/purchase-orders/:id/pdf
- GET /api/log/purchase-orders/export?format=xlsx&filters=

COMPOSANTS src/components/log/bc/
===================================
- BcKpiRow.tsx
- BcFiltersCard.tsx (5 colonnes)
- BcListTable.tsx ⚠️ avec statuts colorés
- NewBcWizard.tsx (wizard 4 étapes)
  - Step1SupplierSite.tsx
  - Step2Articles.tsx
  - Step3PricingTerms.tsx
  - Step4RecapValidation.tsx
- BcDetailDrawer.tsx
- BcPdfGenerator.tsx (React-PDF)

⚠️ RESPONSIVE
==============
- Filtres 5 col → 3 col → 1 col
- Tableau BC : ::before content labels mobile
- Wizard : étapes verticales mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log/bc

LIVRABLES
=========
- Code complet
- Test : émission BC BICAM 1 200 sacs Ciment 14,4 M FCFA → > 5M → PENDING_N2_DAF
- Test : Marie valide N2 → EMITTED + PDF envoyé BICAM
- Test : génération PDF BC avec en-tête BatimCAM, articles, conditions
- Test : export Excel 142 BC YTD avec filtres appliqués
- Audit responsive 7/7 OK
- Commit "feat(log): bons de commande + workflow validation N1/N2 — fn 1.2"
```

---

### PROMPT 1.3 — Fournisseurs

```
Fonction 1.3 : catalogue fournisseurs avec contrats-cadres et conformité fiscale.

PROTOTYPE HTML
==============
L'écran screen-log-fournisseurs existe. Reproduire avec :
- Header "86 fournisseurs actifs · 18 contrats-cadres · 1,2 Md FCFA engagements YTD"
- Onglets (Contrats-cadres 18 / Tous fournisseurs 86 / Conformité fiscale /
  Évaluations)
- Tableau "Contrats-cadres actifs" 6 lignes :
  * BICAM SA · Ciment HPC + CPJ · 600M · -8% · Tx liv. 96% · qualité 4,5/5 · J-45
  * ALUCAM · Acier HA 8 à 32 · 320M · -12% · Tx liv. 92% · qualité 4,8/5 · 18/12/26
  * Total Cameroun · Gasoil + lubrifiants · 240M · prix marché · 98% · 5/5 · 30/04/27
  * STRABAG · Coffrage métallique · 120M · -5% · 88% · 4,2/5 · 15/09/26
  * STI Étanchéité · Membranes · 80M · +3% · 90% · 4,6/5 · 22/11/26
  * Carrière Mfou · Granulats · 60M · -15% · 94% · 4,3/5 · 10/02/27

WORKFLOW MÉTIER
================
**Contrats-cadres** : engagement annuel volume FCFA → meilleurs prix négociés
vs achat ponctuel. Renouvellement à anticiper 60 jours avant échéance.

**Conformité fiscale Cameroun** (critique en marché public) :
- NIU (Numéro Identifiant Unique DGI) valide
- Attestation de non-redevance fiscale (valide 1 an)
- Patente professionnelle à jour
- CNPS à jour
- Quitus fiscal pour gros marchés

**Évaluations trimestrielles** sur 3 axes :
- Livraison (ponctualité, conformité quantité)
- Qualité (produit conforme aux spécifications)
- Administratif (factures justes, délai règlement respecté)

API
===
- GET /api/log/suppliers (avec onglets)
- GET /api/log/suppliers/:id (fiche complète)
- POST /api/log/suppliers (création)
- PATCH /api/log/suppliers/:id
- GET /api/log/framework-agreements
- POST /api/log/framework-agreements
- POST /api/log/framework-agreements/:id/renew
- GET /api/log/suppliers/fiscal-compliance
- POST /api/log/suppliers/:id/evaluation
- GET /api/log/suppliers/:id/performance

COMPOSANTS src/components/log/fournisseurs/
=============================================
- SuppliersHeader.tsx
- SuppliersTabs.tsx (4 onglets)
- FrameworkAgreementsTable.tsx ⚠️ tableau performance
- AllSuppliersTable.tsx (86 lignes paginées)
- FiscalComplianceTable.tsx (statuts conformité avec alertes)
- EvaluationsHistoryTable.tsx
- SupplierDetailDrawer.tsx
- NewSupplierForm.tsx (avec validation NIU)
- FrameworkRenewalWizard.tsx

⚠️ RESPONSIVE
==============
- Tableaux : transformation en cards mobile
- Onglets : scroll horizontal mobile
- Drawer fournisseur : 480px desktop / plein écran mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log/fournisseurs

LIVRABLES
=========
- Code complet avec 86 fournisseurs seedés
- Test : onglet Contrats-cadres → 18 lignes avec BICAM expire J-45 en ambré
- Test : tap "BICAM SA" → drawer avec historique BC, performance, contrat-cadre
- Test : évaluation Q1 2026 STI Étanchéité (4,5/5 global) enregistrée
- Test : rapport conformité fiscale → 84 valides + 2 expiring soon
- Audit responsive 7/7 OK
- Commit "feat(log): fournisseurs + contrats-cadres + évaluations — fn 1.3"
```

---

### PROMPT 1.4 — Flotte d'engins

```
Fonction 1.4 : registre et gestion de la flotte 42 engins/véhicules.

PROTOTYPE HTML
==============
L'écran screen-log-flotte existe. Reproduire avec :
- Header "42 unités · 36 en service · 4 maintenance · 2 panne · valorisation 2,8 Md"
- KPIs (En service 36 vert avec 86% dispo, Maintenance 4 ambré, En panne 2 rouge,
  Conso gasoil semaine 4,8k L = 3,7 M FCFA)
- Onglets type (Tous 42, Engins TP 18, Camions 12, Bétonnières 6, Véhicules
  service 6)
- Tableau 8 engins avec colonnes (Immat mono, Désignation, Chantier, Compteur,
  Conducteur, État statut, Prochaine maintenance)

WORKFLOW MÉTIER
================
**Cycle de vie d'un engin** :
1. Acquisition : enregistrement (immat, valeur, assurance, kit maintenance
   préventive selon plan constructeur)
2. Affectation : engin envoyé sur chantier X avec conducteur Y
3. Suivi quotidien : compteur (heures pour engins TP, km pour camions) reporté
4. Maintenance préventive :
   - Petite révision : tous les 250h ou 5 000 km
   - Grande révision : tous les 1 000h ou 20 000 km
   - Visite technique annuelle pour véhicules
5. Maintenance curative : pannes signalées → garage externe ou interne
6. Transfert : changement chantier (passe par fn 1.5 Transferts)
7. Fin de vie : vente ou réforme

**Indicateur clé : taux de disponibilité** = engins en service / total flotte
Cible BatimCAM : > 90%. Actuel : 86% (impact panne pelle CAT 320 + 4 maintenances)

API
===
- GET /api/log/equipment?type=&status=&site=&search=
- GET /api/log/equipment/:id (fiche complète avec historique)
- POST /api/log/equipment (ajout nouvel engin)
- PATCH /api/log/equipment/:id
- POST /api/log/equipment/:id/counter (mise à jour compteur)
- GET /api/log/equipment/:id/assignments
- POST /api/log/equipment/:id/assign
- GET /api/log/equipment/:id/maintenances
- POST /api/log/equipment/:id/maintenances
- POST /api/log/equipment/:id/maintenances/:mId/complete
- GET /api/log/equipment/fuel-consumption

COMPOSANTS src/components/log/flotte/
=======================================
- FleetKpis.tsx
- FleetTypeTabs.tsx (5 onglets)
- EquipmentTable.tsx ⚠️ avec statuts couleur
- EquipmentDetailDrawer.tsx (fiche + historique + maintenances)
- NewEquipmentForm.tsx
- AssignToSiteModal.tsx
- MaintenanceScheduleCalendar.tsx
- FuelConsumptionReport.tsx

⚠️ RESPONSIVE
==============
- Tableau engins : ::before content labels mobile
- Onglets : scroll horizontal mobile
- Calendrier maintenance : vue agenda mobile, calendrier desktop

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log/flotte

LIVRABLES
=========
- Code complet avec 42 engins seedés
- Test : onglet "Engins TP" → 18 lignes filtrées
- Test : tap "Pelle CAT 320 EN-2019-008" → drawer avec fiche, statut Panne moteur
- Test : ajout maintenance préventive Bulldozer Komatsu D65 à 5 200h → planifié
- Test : rapport conso gasoil semaine : 4 818 L total
- Audit responsive 7/7 OK
- Commit "feat(log): flotte engins + maintenances + affectations — fn 1.4"
```

---

### PROMPT 1.5 — Transferts inter-chantiers

```
Fonction 1.5 : arbitrage et organisation des transferts entre chantiers.

PROTOTYPE HTML
==============
L'écran screen-log-transferts existe. Reproduire avec :
- Header "4 demandes en attente · 28 transferts validés YTD · 28 M FCFA d'économies"
- Section "⏳ Demandes en attente d'arbitrage" : 4 cards avec border-left coloré
  par priorité :
  * TR-2026-0042 Coffrage Bastos → Pont Mfoundi (ambré, économie 1,8 M)
  * TR-2026-0043 Bétonnière Odza → AEP Mbalmayo (ambré)
  * TR-2026-0044 Ciment 200 sacs Odza → Pont Mfoundi (rouge URGENT rupture)
  * TR-2026-0045 Grue Liebherr Yaoundé-Nsim → Bastos (ambré)
- Chaque card : grid 1fr-auto-1fr avec "Depuis" + flèche + "Vers", contexte,
  boutons Valider/Détails
- Section "Transferts validés récents" : tableau 3 lignes historique

WORKFLOW MÉTIER
================
1. **Demande** : émise par DTrav ou DT depuis leur espace (besoin matière ou engin
   sur leur chantier, alors qu'un autre chantier en a en surplus)
2. **Arbitrage Robert** :
   - Vérifie disponibilité réelle source (consulte Magasinier source)
   - Vérifie besoin réel destination
   - Calcule économie vs achat neuf
   - Priorise selon urgence (rupture imminente = URGENT)
   - Si transfert engin : vérifie compatibilité plannings 2 chantiers
3. **Validation** : statut APPROVED, génération bon de transfert
4. **Logistique** : organise le déplacement physique (camion benne, transport
   STRABAG si engin lourd)
5. **Réception** : Magasinier destination réceptionne comme une livraison normale
   (StockMovement.reason = TRANSFER_IN au lieu de PURCHASE_DELIVERY)
6. **Clôture** : transfert COMPLETED, économie comptabilisée dans stats achats

API
===
- GET /api/log/transfers/pending
- GET /api/log/transfers (filtres)
- GET /api/log/transfers/:id
- POST /api/log/transfers (création depuis DT/DTrav)
- POST /api/log/transfers/:id/arbitrate
- POST /api/log/transfers/:id/schedule
- POST /api/log/transfers/:id/complete
- GET /api/log/transfers/economics-report

COMPOSANTS src/components/log/transferts/
===========================================
- TransfersHeader.tsx
- PendingTransfersList.tsx (4 cards avec priorité)
- TransferRequestCard.tsx ⚠️ CRITIQUE — visu Depuis/Vers
- TransferArbitrationModal.tsx (justification + économie)
- TransfersHistoryTable.tsx
- TransportSchedulingForm.tsx
- EconomicsReportChart.tsx

⚠️ RESPONSIVE
==============
- Cards transferts : grid 1fr-auto-1fr → empilé vertical mobile avec flèche bas
- Boutons actions : flex-wrap mobile
- Tableau historique : transformation cards mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log/transferts

LIVRABLES
=========
- Code complet
- Test : Robert valide TR-2026-0044 URGENT → notifications Magasiniers source/dest
  + DTrav Paul + transport organisé
- Test : économie 360 K immédiate comptabilisée dans stats
- Test : refus TR-2026-0045 avec justification (planning incompatible)
- Audit responsive 7/7 OK
- Commit "feat(log): transferts inter-chantiers + arbitrage — fn 1.5"
```

---

### PROMPT 1.6 — Statistiques achats

```
Fonction 1.6 : analyses YTD des achats consolidés + rapport DG.

PROTOTYPE HTML
==============
L'écran screen-log-stats existe. Reproduire avec :
- Header "Statistiques achats BatimCAM" + actions Export PDF + Rapport DG
- KPIs (Total achats 948 M YTD, Économies 62 M vert = 6,5% vs budget, Délai
  paiement moyen 42j vs cible 45j, Tx livraison à l'heure 88%)
- Card grand graphe "Évolution des achats mensuels (M FCFA)" : barres mensuelles
  Déc 96, Janv 126, Fév 146, Mars 176 (pic violet foncé), Avril 162, Mai* 152
  (projection violet clair) avec axe Y 0-200
- Section "Dépenses par chantier YTD" : tableau 7 lignes avec Chantier, Achats
  YTD, % total, Budget, Écart (vert si économie, rouge si dépassement)

CONTEXTE MÉTIER
================
Le rapport DG mensuel est un livrable clé pour Robert. Il synthétise pour Albert :
- Économies réalisées vs budget
- Tendances de prix matières premières (ciment, acier en hausse récente)
- Performance fournisseurs
- Anticipation des besoins prochains
- ROI des contrats-cadres négociés

API
===
- GET /api/log/stats/kpis?period=YTD|month|year
- GET /api/log/stats/monthly-evolution?year=2026
- GET /api/log/stats/by-construction-site?period=YTD
- GET /api/log/stats/by-category?period=YTD
- GET /api/log/stats/savings-vs-budget
- GET /api/log/stats/dg-report (PDF complet pour Albert)
- POST /api/log/stats/export?format=pdf|xlsx

COMPOSANTS src/components/log/stats/
======================================
- StatsKpis.tsx
- MonthlyEvolutionChart.tsx ⚠️ barres SVG avec axe Y
- BySiteTable.tsx (avec écart budget coloré)
- ByCategoryDonut.tsx (réutilise composant dashboard)
- DgReportButton.tsx (génère PDF complet)
- ExportButtons.tsx (PDF + Excel)

⚠️ RESPONSIVE
==============
- Graphe barres : conserve viewBox SVG, redimensionne automatiquement
- Tableau par chantier : ::before content labels mobile
- KPIs : 4 col → 2x2 → 1 col

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /log/stats

LIVRABLES
=========
- Code complet avec données YTD réalistes
- Test : génération rapport DG PDF → ~6 pages avec couverture, KPIs, graphes,
  recommandations, signature Robert
- Test : export Excel multi-onglets (KPIs, mensuel, par chantier, par catégorie)
- Test : drill-down chantier Odza +13M dépassement → détail BC supplémentaires
- Audit responsive 7/7 OK
- Commit "feat(log): statistiques achats + rapport DG — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil Logisticien complet

Tu viens de couvrir l'**ensemble du profil Logisticien** :
- Bloc 0 : 6 nouveaux/étendus models Prisma + bootstrap
- Bloc 1 : 6 fonctions (Dashboard, BC, Fournisseurs, Flotte, Transferts, Stats)

**Total profil Logisticien : 6 fonctions livrées**

POINTS FORTS DE CE PROFIL
==========================
- Vue globale siège (assignedSiteIds=[]) complémentaire aux profils chantier
- Workflow validation BC 2 niveaux (N1 Logisticien, N2 DAF si > 5M)
- Gestion 86 fournisseurs avec conformité fiscale Cameroun (NIU, attestations DGI)
- 18 contrats-cadres négociés (BICAM, ALUCAM, Total, STRABAG, STI, Carrière Mfou)
- Flotte 42 engins (2,8 Md valorisation) avec maintenance préventive par compteur
- Transferts inter-chantiers économiseurs (28 M YTD vs achats neufs évités)
- Rapport DG mensuel automatisé

ESTIMATION EFFORT
==================
- Bloc 0 (6 models Prisma + bootstrap + seed étendu) : 3-4 jours
- Bloc 1 (6 fonctions) : 7-9 jours (fn 1.2 BC dense avec wizard + PDF, fn 1.4
  Flotte avec calendrier maintenance, fn 1.6 PDF rapport DG)
- TOTAL : 10-13 jours

INTERACTIONS AVEC AUTRES PROFILS
=================================
- Magasinier : réceptionne les livraisons BC initiées par Logisticien
- DAF : valide N2 les BC > 5M FCFA
- DT : suit les besoins multi-chantiers et demande transferts
- DTrav : demande matières/engins via transferts
- Comptable Direction : facturation BC + suivi conformité fiscale fournisseurs
- DG : reçoit rapport mensuel logistique

PROCHAINE ÉTAPE
================
L'écosystème **achats/logistique** est désormais complet sur les 2 axes :
- Côté chantier : Magasinier (Lucas) gère son magasin physique
- Côté siège : Logisticien (Robert) gère achats consolidés + flotte + transferts

Profils restants :
- **GED** (référent documentaire global) - structure transverse
- **Informaticien d'entreprise** - admin technique tenant
- **Employé bureau · Ouvrier** - comptes basiques

Mon ordre recommandé : **GED** ensuite. C'est un profil transverse important
qui structure la documentation tous chantiers (plans, contrats, PV, photos)
et complète bien Robert (qui produit beaucoup de docs : BC, contrats-cadres,
rapports DG).
