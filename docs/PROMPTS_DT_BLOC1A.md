# DT · DÉVELOPPEMENT — Bloc 0 (Préambule) + Bloc 1 (Espace DT — partie 1)

**Profil cible :** Directeur Technique (Daniel ESSOMBA · BatimCAM SA)

**Méthode :** 1 prompt = 1 fonction. Chaque prompt enrichit en parallèle le prototype HTML
ET le code React/API. Chaque livrable doit être **pleinement responsive et VÉRIFIÉ** sur
7 tailles d'écran : 1920 / 1440 / 1280 / 1024 / 768 / 414 / 375.

---

## ⚠️ PROTOCOLE DE VÉRIFICATION RESPONSIVE OBLIGATOIRE

Identique au protocole RH. Avant chaque commit :

```bash
pnpm exec tsx scripts/audit-responsive.ts /dt/<route>
```

Le script doit afficher 7/7 tailles avec overflow=0px. Sinon, corriger AVANT commit.

Format commit obligatoire : "✅ Audit responsive : 7/7 tailles OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE DT

```
Phase de développement du profil Directeur Technique (Daniel ESSOMBA).

CONTEXTE
========
- Le MVP J0-J7 est livré et déployé.
- Les profils DG, DAF, RH ont été développés (ou sont en cours).
- Le prototype HTML contient 4 écrans Espace DT :
  * screen-dt-dashboard, screen-dt-portefeuille, screen-dt-etudes, screen-dt-validations
- Les 4 autres écrans (Méthodes, Plan de charge, Sous-traitance, QHSE) seront ajoutés
  au fur et à mesure des prompts.
- Le DT chapeaute toute la production : 23 chantiers, 4 directeurs travaux
  (P. ETOUNDI, L. NDONGO, R. KOMTCHOU, F. MENDOMO), production YTD 2,84 Md FCFA.

CONVENTIONS
============
- Écrans prototype : id="screen-dt-<fonction>"
- Pages Next.js : src/app/(app)/dt/<fonction>/page.tsx
- Composants : src/components/dt/<NomFonction>.tsx
- API routes : src/app/api/dt/<fonction>/route.ts
- Hooks : src/hooks/useDt<Fonction>.ts
- Toutes les pages DT ont l'attribut data-rh-screen sur leur container racine
  (réutilise les règles CSS RH responsive déjà en place)

EXIGENCE RESPONSIVE — NON-NÉGOCIABLE
=====================================
Cf. protocole. Si le script audit-responsive.ts renvoie un débordement, CORRIGER
avant le commit. Pas de "c'est responsive" sans preuve.

TÂCHES PRÉPARATOIRES
====================

1. Lis le prototype HTML, concentre-toi sur les 4 écrans screen-dt-* existants.

2. Vérifie que le script scripts/audit-responsive.ts existe (créé pour le RH).
   S'il n'existe pas, le créer (cf. spec dans PROMPTS_RH_BLOC1.md).

3. Crée le layout dédié src/app/(app)/dt/layout.tsx :
   - Vérifie que l'utilisateur a Role.TECHNICAL_DIRECTOR (sinon redirect /dashboard)
   - Affiche un breadcrumb "Espace Direction Technique > <fonction>"
   - Wrap children dans <div data-rh-screen className="rh-page">

4. Sidebar : section "Espace Direction Technique" UNIQUEMENT pour Role.TECHNICAL_DIRECTOR.
   Items :
   - Tableau de bord → /dt
   - Portefeuille chantiers → /dt/portefeuille (badge nb chantiers actifs)
   - Études et offres → /dt/etudes (badge nb études)
   - Méthodes et planification → /dt/methodes
   - Validation marchés → /dt/validations (badge alerte nb)
   - Plan de charge équipes → /dt/charge
   - Sous-traitance → /dt/sous-traitance (badge nb actifs)
   - QHSE → /dt/qhse (badge alerte si incidents ouverts)

5. Crée les models Prisma transverses DT :
   model DtSettings { ... }
   model DtAlert { id, tenantId, type, severity, title, ..., resolved, createdAt }

   enum DtAlertType {
     SITE_BUDGET_DEVIATION SITE_DELIVERY_DELAY MARGIN_BELOW_TARGET
     TEAM_CAPACITY_OVERLOAD MARKET_VALIDATION_PENDING
     HSE_INCIDENT QUALITY_NON_CONFORMITY
   }

6. Vérifie que le seed contient les 4 directeurs travaux et 23 chantiers actifs.

LIVRABLES
=========
- Layout DT protégé par rôle, fonctionnel
- Section sidebar Espace DT visible uniquement pour Daniel ESSOMBA
- Audit responsive 7/7 OK sur la page /dt vide
- Commit "chore(dt): bootstrap espace direction technique"

Attends mon prompt 1.1.
```

---

## 🟪 BLOC 1 — Espace DT (8 fonctions, partie 1 = fonctions 1.1 à 1.4)

### PROMPT 1.1 — Tableau de bord DT

```
Fonction 1.1 : tableau de bord DT (cockpit production consolidé).

PROTOTYPE HTML
==============
L'écran screen-dt-dashboard existe. Le reproduire fidèlement en React.

ÉLÉMENTS CLÉS
=============
- Bandeau gradient violet sombre "Production cumulée YTD" en mono 32px (2,84 Md FCFA)
  + +12,4 % vs N-1 + 23 chantiers · 487 sur site + Marge 18,4 %
- KPIs (23 chantiers actifs · 62 % avancement moyen · 5 validations N2 · 142 j sans accident)
- Section "Alertes techniques" — 5 alertes contextualisées avec barre colorée :
  · Pont Mfoundi · dérive coût +16 % (rouge)
  · Voirie Bonabéri · retard 21 jours (rouge)
  · Bastos R+8 · marge 12 % sous cible (ambre)
  · Lotissement Odza · charge équipe 156 % (ambre)
  · 5 marchés à valider N2 (info bleu, action)
- 2 graphes côte à côte :
  · Avancement physique vs financier (barres groupées)
  · Répartition par directeur de travaux (donut + légende)
- Tableau "Chantiers à surveiller" (5 lignes représentatives)

PRISMA
======
Étendre le model Site existant si besoin :
   model Site {
     ...
     budgetAmount      BigInt
     actualSpentAmount BigInt   @default(0)
     deviationPercent  Float    @default(0)  // calculé
     physicalProgress  Float    @default(0)  // %
     financialProgress Float    @default(0)  // %
     marginPercent     Float    @default(0)
     marginTarget      Float    @default(20)
     directorOfWorksId String?
     directorOfWorks   User?    @relation(fields: [directorOfWorksId], references: [id])
   }

   model SiteAlert {
     id        String @id @default(cuid())
     siteId    String
     site      Site   @relation(fields: [siteId], references: [id])
     type      DtAlertType
     severity  AlertSeverity
     title     String
     details   String?
     createdAt DateTime @default(now())
     resolved  Boolean  @default(false)
   }

API
===
- GET /api/dt/dashboard
  Renvoie {
    kpis: { activeSites, avgProgress, pendingN2Validations, hseRecord },
    cumulativeProductionYtd, productionDeltaVsN1, marginAvg, sitesAtRisk,
    alerts: SiteAlert[],
    progressByDirectorOfWorks: [...],
    sitesToWatch: [...]
  }

COMPOSANTS src/components/dt/dashboard/
========================================
- DtProductionBanner.tsx (bandeau gradient, mono 32 → 24px responsive)
- DtKpiRow.tsx (4 cards, 4col → 2x2 → 1col)
- DtAlertsList.tsx (5 alertes avec barre colorée, flex-wrap mobile)
- ProgressVsFinancialChart.tsx (Recharts BarChart, ResponsiveContainer)
- DirectorOfWorksDonut.tsx (donut + légende, empilé vertical mobile)
- SitesToWatchTable.tsx (transformation cards mobile)

⚠️ RESPONSIVE — RÈGLES SPÉCIFIQUES
===================================
1. Bandeau gradient :
   - Desktop : mono 32px
   - Tablette : mono 28px
   - Mobile 414 : mono 24px
   - Mobile 375 : mono 22px, info secondaire en colonne (flex-direction:column)
2. KPIs : 4col → 2x2 (768) → 1col (480)
3. Alertes : flex-wrap, bouton "Drill-down" passe en bas pleine largeur sur mobile
4. Graphes : ResponsiveContainer obligatoire, hauteur 240 → 180 → 160px
5. Donut : sur mobile, donut au-dessus, légende en dessous (flex-direction:column)
6. Tableau : transformation cards par chantier sur mobile :
   ┌────────────────────────────┐
   │ CHT-2025-031               │
   │ Pont Mfoundi               │
   │ ─────────────────────────  │
   │ Dir. trav.  P. ETOUNDI     │
   │ Avancement  78 %           │
   │ Marge       6,0 % 🔴       │
   │ Livraison   30/06/26       │
   │ État        Dérive coût    │
   │ ─────────────────────────  │
   │ [Voir]                     │
   └────────────────────────────┘

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt

LIVRABLES
=========
- Code complet conforme au prototype
- Test : connexion en DT → cockpit complet, drill-down chantier ouvre détail
- Audit responsive 7/7 OK
- Commit "feat(dt): tableau de bord DT — fn 1.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.2 — Portefeuille chantiers

```
Fonction 1.2 : vue consolidée et filtrable de tous les chantiers actifs.

PROTOTYPE HTML
==============
L'écran screen-dt-portefeuille existe. Reproduire avec :
- Filtres avancés en grille 5 colonnes (recherche + 4 selects)
- KPIs portefeuille (valeur 3,32 Md, production 2,12 Md, reste 1,20 Md, marge 18,4 %)
- Tableau 23 chantiers (afficher 6 démos, paginer le reste) avec :
  Code, Chantier, Type, MOA, Dir. travaux, Budget, Avancement, Marge, Livraison, État

ÉLÉMENTS À AJOUTER (non visibles dans le prototype mais utiles)
================================================================
- Bouton "Vue carte" : carte du Cameroun avec markers chantiers (Leaflet ou Mapbox)
- Drill-down par directeur de travaux (filtre rapide)
- Export Excel consolidé avec onglets par directeur de travaux

PRISMA
======
Le model Site existe. Ajouter si manquants :
   geoLocation       Json?    // { lat, lng, region }
   moaName           String?  // maître d'ouvrage
   moaType           MoaType  // public/privé/parapublic
   contractType      ContractType
   startDate         DateTime
   plannedEndDate    DateTime
   actualEndDate     DateTime?

   enum MoaType { PUBLIC PRIVATE PARAPUBLIC INTERNATIONAL }
   enum ContractType { FIRM_PRICE UNIT_PRICE COST_PLUS DESIGN_BUILD }

API
===
- GET /api/dt/sites?search=&status=&type=&region=&directorOfWorks=&page=&limit=
- GET /api/dt/sites/map (geo-data pour vue carte)
- GET /api/dt/sites/:id (détail complet avec workflow, équipe, marchés, etc.)
- GET /api/dt/sites/export?format=xlsx

COMPOSANTS src/components/dt/portfolio/
========================================
- PortfolioFilters.tsx (5col → 3col tablette → 1col mobile)
- PortfolioKpis.tsx
- SitesTable.tsx ⚠️ RESPONSIVE (cards mobile)
- SitesMapView.tsx (Leaflet, plein écran mobile)
- SiteDetailDrawer.tsx (drawer 480px desktop, plein écran mobile)

⚠️ RESPONSIVE — RÈGLES SPÉCIFIQUES
===================================
1. Filtres : grille 5 col (recherche2fr + 4selects) → 3 col tablette → 1 col mobile
2. Tableau : cards par chantier sur mobile avec drill-down tap-to-open
3. Vue carte : sur mobile, carte plein écran avec bottom sheet pour les filtres
4. Drawer détail : 480px côté droit en desktop, plein écran mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/portefeuille

LIVRABLES
=========
- Code complet
- Test : filtrer "P. ETOUNDI" → seuls ses chantiers s'affichent
- Test : tap sur un chantier → drawer détail s'ouvre avec onglets (Marché, Équipe,
  Avancement, Documents, Historique)
- Export Excel testé : 23 chantiers en 5 onglets
- Audit responsive 7/7 OK
- Commit "feat(dt): portefeuille chantiers + filtres + carte — fn 1.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.3 — Études et offres

```
Fonction 1.3 : pipeline appels d'offres et étude de prix.

PROTOTYPE HTML
==============
L'écran screen-dt-etudes existe. Reproduire avec :
- KPIs (8 études en cours, 4,2 Md volume, 42 % transformation, 38 M coût études YTD)
- Tableau pipeline AO (5 démos) avec colonnes : Réf, Objet, MOA, Type, Budget,
  Remise, Étape, Probabilité (progress bar)

ÉLÉMENTS À AJOUTER
==================
- Onglets : En cours / Remises imminentes (J-7) / Remises ce mois / Historique
- Vue détail d'un AO :
  · Métré (BPU + DQE)
  · Estimation des coûts (achats, sous-traitance, main d'œuvre, frais généraux, marge)
  · Études techniques (notes de calcul, mémoire technique, planning prévisionnel)
  · Sous-traitants pré-sélectionnés
  · Documents administratifs (DCE, attestations, références)
  · Workflow validation : Étude → DT (moi) → DG → Remise
- Wizard "Nouvelle étude" : import DCE PDF → extraction articles → chiffrage assisté
- Comparateur d'offres concurrentes (post-attribution)

PRISMA
======
   model Tender {
     id            String   @id @default(cuid())
     tenantId      String
     reference     String   @unique
     title         String
     moaName       String
     moaType       MoaType
     workType      WorkType
     estimatedBudget BigInt
     submissionDeadline DateTime
     stage         TenderStage
     probability   Int      @default(0) // 0-100
     studyCost     BigInt   @default(0)
     ourBidAmount  BigInt?
     ourMargin     Float?
     awarded       Boolean?
     awardedTo     String?  // si attribué à un concurrent
     studyOwnerId  String
     createdAt     DateTime @default(now())
   }
   enum TenderStage { OPPORTUNITY DCE_ANALYSIS SITE_VISIT TECHNICAL_STUDY PRICING SUBCONTRACTOR_QUOTES INTERNAL_VALIDATION SUBMITTED RESULTS_PENDING WON LOST }
   enum WorkType { BUILDING ROADWORK CIVIL_ENGINEERING HYDRAULIC LAYOUT INDUSTRIAL OTHER }

   model TenderItem {
     id        String   @id @default(cuid())
     tenderId  String
     tender    Tender   @relation(fields: [tenderId], references: [id])
     code      String   // BPU code
     designation String
     unit      String
     quantity  Float
     unitPrice BigInt
     totalPrice BigInt  // calculé
   }

   model Competitor {
     id        String   @id @default(cuid())
     tenantId  String
     name      String
     stats     Json?    // { totalParticipations, wins, avgGap, ... }
   }

API
===
- GET /api/dt/tenders?stage=&workType=&moaType=&page=&limit=
- POST /api/dt/tenders (création)
- GET /api/dt/tenders/:id (détail complet)
- PATCH /api/dt/tenders/:id (modif)
- POST /api/dt/tenders/:id/items/import-dce (extraction PDF DCE)
- GET /api/dt/tenders/:id/pricing-summary (récap chiffrage)
- POST /api/dt/tenders/:id/submit (passage en SUBMITTED)
- POST /api/dt/tenders/:id/result (saisie du résultat WON/LOST + concurrent)

COMPOSANTS src/components/dt/tenders/
======================================
- TendersKpis.tsx
- TendersStageTabs.tsx
- TendersTable.tsx ⚠️ RESPONSIVE
- TenderDetailPage.tsx (page complète, pas drawer)
- TenderItemsTable.tsx (BPU/DQE inline editing)
- TenderPricingPanel.tsx (chiffrage avec coefficients)
- TenderTimelineWizard.tsx (étape par étape)

⚠️ RESPONSIVE
==============
- Tableau pipeline → cards mobile
- Détail Tender : 3 onglets côte à côte desktop, accordions empilés mobile
- BPU/DQE table : scroll horizontal sur mobile (tableau complexe, pas de cards)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/etudes

LIVRABLES
=========
- Code complet
- 5 tenders seedés avec items BPU
- Test : créer un nouveau tender, importer DCE PDF, ajouter 10 items, calcul auto
- Audit responsive 7/7 OK
- Commit "feat(dt): études et offres + pipeline + chiffrage — fn 1.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.4 — Validation marchés (N2 technique)

```
Fonction 1.4 : validation N2 technique des marchés et engagements > seuil.

PROTOTYPE HTML
==============
L'écran screen-dt-validations existe. Reproduire avec :
- KPIs (5 à valider, 218 M cumul, délai moyen 3,2 h, 38 validés ce mois)
- Tableau 5 dossiers avec workflow inline et boutons ✓/✗

CONTEXTE MÉTIER
================
Le DT valide en N2 technique tout ce qui touche à :
- Avenants de marchés (modifications de contrat client)
- Marchés de sous-traitance > 30 M FCFA
- Acquisitions matériel > 30 M FCFA
- Méthodes spéciales (coffrage glissant, technique non-standard)
- Mises en service techniques (tests, réceptions, levées de réserves)

Workflow type : Initiateur → DT (N2 moi) → DG (N3 final)
Pour les > 100 M, ajout cosignature DAF avant DG.

PRISMA
======
Étendre le model Validation existant :
   model Validation {
     ...
     dtValidationRequired Boolean @default(false)
     dtValidatedAt        DateTime?
     dtValidatedBy        String?
     dtComments           String?
     dtAttachments        String[]
   }

API
===
- GET /api/dt/validations/pending (mes N2 tech en attente)
- GET /api/dt/validations/:id (détail avec pièces jointes)
- POST /api/dt/validations/:id/approve (commentaire optionnel)
- POST /api/dt/validations/:id/reject (motif obligatoire)
- POST /api/dt/validations/:id/request-info (complément à demander)
- POST /api/dt/validations/bulk-approve (multi-sélection)

COMPOSANTS src/components/dt/validations/
==========================================
- DtValidationsKpis.tsx
- DtValidationsTable.tsx ⚠️ RESPONSIVE
- DtValidationDetailModal.tsx (avec pièces jointes scrollables, plein écran mobile)
- DtValidationWorkflowVisual.tsx (workflow inline ou vertical mobile)
- DtBulkValidateBar.tsx

⚠️ RESPONSIVE
==============
- Tableau → cards par dossier sur mobile :
  ┌────────────────────────────┐
  │ AVE-202605-002 🔴 24h      │
  │ Avenant Pont Mfoundi       │
  │ ─────────────────────────  │
  │ Initiateur  P. ETOUNDI     │
  │ Montant     45,8 M FCFA    │
  │ Workflow:                  │
  │ Demandeur ✓                │
  │ → N2 moi (en cours)        │
  │ → N3 DG                    │
  │ ─────────────────────────  │
  │ [✓ Valider] [✗ Rejeter]    │
  └────────────────────────────┘
- Workflow inline : horizontal desktop → vertical mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/validations

LIVRABLES
=========
- Code complet
- Test : valider AVE-202605-002 → status passe à N3 pending, notif au DG
- Test : rejeter avec motif → retour initiateur avec notification
- Audit responsive 7/7 OK
- Commit "feat(dt): validations N2 technique + workflow visuel — fn 1.4
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ FIN BLOC 1 PARTIE 1

Fonctions 1.1 à 1.4 livrées. Demande le bloc 1 partie 2 :
"Bloc 1 DT partie 1 terminé. Tu peux me livrer la partie 2."

La partie 2 couvrira les 4 fonctions restantes :
- 1.5 Méthodes et planification
- 1.6 Plan de charge équipes
- 1.7 Sous-traitance
- 1.8 QHSE
