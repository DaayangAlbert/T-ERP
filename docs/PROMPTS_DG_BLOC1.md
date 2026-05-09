# PROMPTS DG — Phase 2 développement par profil

**Méthode :** 1 prompt = 1 fonction. Chaque prompt enrichit en parallèle le prototype HTML
ET le code React/API. Validation visuelle après chaque livraison avant de passer au suivant.

**Profil cible :** DG (Albert DAAYANG · BatimCAM SA)

---

## 🟣 PROMPT 0 — PRÉAMBULE (à lancer avant le Bloc 1)

**À coller dans Claude Code dans une nouvelle conversation.**

```
Phase 2 du projet T-ERP : on enrichit profil par profil, fonction par fonction.
On commence par le profil DG.

CONTEXTE
========
Le MVP J0-J7 est livré et déployé. La structure projet est :
- Prototype HTML : terp_prototype.html à la racine (41 écrans, source de vérité visuelle)
- Code Next.js : src/app, src/components, src/lib, prisma/, etc.

À partir de maintenant, CHAQUE FONCTION ajoutée doit être livrée EN PARALLÈLE :
1. Un nouvel écran dans terp_prototype.html (ou enrichissement d'un écran existant)
2. Le code React/Next.js correspondant (page + composants + API + Prisma si besoin)
3. La connexion sidebar et navigation
4. Le seed de données démo enrichi si nécessaire

CONVENTIONS DE NOMMAGE
=======================
- Écrans prototype : id="screen-dg-<fonction>" (ex: screen-dg-cockpit-conso, screen-dg-objectifs)
- Pages Next.js : src/app/(app)/dg/<fonction>/page.tsx (ex: src/app/(app)/dg/objectifs/page.tsx)
- Composants : src/components/dg/<NomFonction>.tsx (ex: ConsolidationCockpit.tsx)
- API routes : src/app/api/dg/<fonction>/route.ts
- Hooks : src/hooks/useDg<Fonction>.ts
- Tables Prisma : préfixe "dg_" si table métier spécifique au DG

TÂCHE PRÉPARATOIRE (AVANT DE COMMENCER LES FONCTIONS)
=====================================================
Avant d'attaquer la première fonction, fais ceci :

1. Lis terp_prototype.html (concentre-toi sur screen-dg) et fais un état des lieux :
   quelles fonctions DG existent déjà, lesquelles sont des placeholders.

2. Crée une nouvelle section dans la sidebar du DG : "Espace DG" qui regroupera
   toutes les fonctions exclusives au DG. Ajoute la dans toutes les sidebars du
   prototype ET dans le composant src/components/layout/Sidebar.tsx.

   Pour le moment cette section contient juste 1 item :
   - "Tableau de bord DG" (existant, pointe vers screen-dg)

   On ajoutera les autres items au fur et à mesure des fonctions développées.

3. Crée un layout dédié src/app/(app)/dg/layout.tsx qui :
   - Vérifie que l'utilisateur a Role.DG (sinon redirect /dashboard)
   - Affiche un breadcrumb "Espace DG > <fonction courante>"
   - Hérite du layout principal authentifié

4. Crée la table Prisma "dg_settings" pour stocker les préférences DG :
     model DgSettings {
       id          String   @id @default(cuid())
       userId      String   @unique
       user        User     @relation(fields: [userId], references: [id])
       // Champs ajoutés au fur et à mesure des fonctions
       updatedAt   DateTime @updatedAt
     }
   Lance la migration : pnpm prisma migrate dev --name dg_settings

5. Confirme-moi que les 4 étapes sont OK avec un test :
   - Le DG voit "Espace DG" dans sa sidebar
   - /dg/* est accessible UNIQUEMENT au DG
   - Le breadcrumb fonctionne
   - La table dg_settings est en base

Une fois validé, attends mon prompt pour la fonction 1.1.
```

---

## 🟣 BLOC 1 — Cockpit et pilotage stratégique

### PROMPT 1.1 — Tableau de bord DG enrichi

```
Fonction 1.1 : enrichissement du tableau de bord DG existant.

CONTEXTE PROTOTYPE
==================
Ouvre terp_prototype.html → screen-dg. Note ce qui existe déjà :
- 4 KPIs (CA YTD, marge, trésorerie, effectif)
- 2 graphes (CA+marge 12 mois, donut répartition)
- Liste alertes critiques
- Validations en attente
- Top chantiers

TÂCHES
======

1. ENRICHISSEMENT PROTOTYPE HTML

   Ajoute dans screen-dg, juste avant la section "Top chantiers" :

   a) Nouvelle ligne KPIs secondaires (4 cards) :
      - Carnet de commandes (montant)
      - Production prévisionnelle (mois en cours)
      - Sinistralité HSE (jours sans accident)
      - Satisfaction clients (note moyenne)

   b) Section "Mes chiffres clés du jour" (encart violet pâle, 6 mini-stats horizontales) :
      - CA jour
      - Encaissements jour
      - Décaissements jour
      - Effectif présent / total
      - Chantiers actifs
      - Notifications non lues

   c) Section "Tendance hebdomadaire" (graphe en aires sur 7 jours) :
      Production journalière en M FCFA, avec aire violette dégradée.

   d) Bouton "Personnaliser mon tableau de bord" en haut à droite qui ouvre
      une modale (placeholder) listant les widgets disponibles avec checkboxes.

2. CODE REACT/NEXT.JS

   a) API GET /api/dg/dashboard :
      Étend l'endpoint existant /api/dashboard/dg avec les nouvelles données :
      kpisSecondaires, chiffresCles, tendanceHebdo. Calculs Prisma sur les
      tables existantes (sites, payslips, etc.).

   b) Composants src/components/dg/ :
      - SecondaryKpiRow.tsx (4 cards)
      - DailyKeyStats.tsx (6 mini-stats horizontales)
      - WeeklyTrendChart.tsx (Recharts AreaChart)
      - DashboardCustomizer.tsx (modale placeholder, on développera en 1.5)

   c) Page src/app/(app)/dashboard/dg/page.tsx :
      Intègre les nouveaux composants à la suite des existants.

3. PRISMA
   Pas de modification du schéma pour cette fonction (utilise les tables existantes).

4. SEED
   Pas de modification du seed (les données existantes suffisent).

5. TESTS À FAIRE PASSER
   - curl /api/dg/dashboard renvoie les nouveaux champs
   - L'écran screen-dg dans le prototype affiche bien les nouvelles sections
   - /dashboard/dg en React reproduit fidèlement le prototype
   - Responsive OK sur mobile (les 4 cards passent en 2x2)

LIVRABLES
=========
- Prototype HTML mis à jour, à présenter via present_files
- Code Next.js fonctionnel
- Test curl + capture du résultat
- Commit avec message "feat(dg): enrichissement tableau de bord — fn 1.1"
```

---

### PROMPT 1.2 — Cockpit consolidation multi-sociétés

```
Fonction 1.2 : cockpit de consolidation multi-sociétés du groupe.

CONTEXTE
========
Un DG de groupe BTP gère souvent plusieurs sociétés (BatimCAM SA + filiales).
Il a besoin d'une vue consolidée groupe avec drill-down par société.

PRÉREQUIS PROTOTYPE
====================
Pas d'écran existant pour cette fonction. On crée screen-dg-consolidation
intégralement.

TÂCHES
======

1. PRISMA

   a) Modifier le modèle Tenant pour permettre la notion de groupe :
        model Tenant {
          ...
          parentId    String?   // null si tenant racine, sinon id du tenant parent
          parent      Tenant?   @relation("TenantGroup", fields: [parentId], references: [id])
          children    Tenant[]  @relation("TenantGroup")
          isGroup     Boolean   @default(false) // true si c'est une société mère
        }

   b) Migration : pnpm prisma migrate dev --name tenant_group_hierarchy

2. SEED ENRICHI

   Modifier prisma/seed.ts pour créer 3 filiales BatimCAM en plus :
   - BatimCAM Yaoundé (parentId = batimcam, secteur Bâtiment, CA 1.2 Md)
   - BatimCAM Douala (parentId = batimcam, secteur Routier, CA 0.9 Md)
   - BatimCAM Logistique (parentId = batimcam, secteur Logistique, CA 0.4 Md)

   Marquer batimcam comme isGroup=true.
   Distribuer 6 chantiers existants entre les 3 filiales (2 chacune).

3. PROTOTYPE HTML

   Crée screen-dg-consolidation avec :

   a) Header :
      - View-title "Cockpit consolidation groupe BatimCAM"
      - View-subtitle "3 filiales · CA cumulé YTD 2,5 Md FCFA"
      - Sélecteur "Période" (Mois en cours / Trimestre / YTD / Année roulante)
      - Bouton "Export Excel groupe" et "Rapport CA"

   b) Bandeau récap GROUPE (gradient violet sombre) :
      4 KPIs consolidés sur fond gradient :
      - CA consolidé groupe : 2,5 Md FCFA
      - Marge consolidée : 18,4%
      - Effectif total : 487
      - Trésorerie groupe : 412 M FCFA

   c) Tableau comparatif filiales :
      Colonnes : Filiale | CA YTD | Marge | Effectif | Trésorerie | Performance vs N-1
      4 lignes : BatimCAM SA (mère), BatimCAM Yaoundé, BatimCAM Douala, BatimCAM Logistique
      Chaque ligne cliquable → drill-down (nouvel écran screen-dg-conso-filiale)

   d) Graphes côte à côte :
      - Stack bar 12 mois : CA mensuel par filiale (couleurs différentes par filiale)
      - Donut : répartition CA YTD par filiale

   e) Carte "Synergie inter-filiales" :
      Liste des transactions intra-groupe (BatimCAM Logistique facture à BatimCAM SA, etc.)

4. SCREEN DRILL-DOWN

   Crée screen-dg-conso-filiale (vue détaillée d'une filiale) :
   Reproduit la structure du screen-dg classique mais avec les données de la filiale
   sélectionnée et un breadcrumb "Espace DG > Consolidation > BatimCAM Yaoundé".

5. CODE REACT/NEXT.JS

   a) API GET /api/dg/consolidation :
      Renvoie :
      {
        groupKpis: { ca, margin, headcount, treasury },
        subsidiaries: [{ id, name, ca, margin, headcount, treasury, perfYoY }],
        monthlyByFiliale: [{ month, batimcam: 0, yaoundé: 0, douala: 0, logistique: 0 }],
        intragroupTransactions: [{ from, to, amount, type, date }]
      }

   b) API GET /api/dg/consolidation/:filialeId :
      Renvoie les données détaillées d'une filiale.

   c) Page src/app/(app)/dg/consolidation/page.tsx
   d) Page src/app/(app)/dg/consolidation/[filialeId]/page.tsx

   e) Composants src/components/dg/ :
      - GroupKpiBanner.tsx (gradient violet sombre)
      - SubsidiariesTable.tsx (avec navigation drill-down)
      - StackedRevenueChart.tsx (Recharts BarChart stacked)
      - GroupRevenueDonut.tsx
      - IntragroupTransactions.tsx

6. SIDEBAR

   Ajoute dans la section "Espace DG" un nouvel item :
   "Consolidation groupe" → /dg/consolidation
   À ajouter dans le prototype HTML ET dans Sidebar.tsx.

7. TESTS
   - curl /api/dg/consolidation renvoie 4 filiales
   - /dg/consolidation affiche le bandeau groupe + tableau cliquable
   - Click sur une ligne → drill-down filiale fonctionne
   - Le breadcrumb se met à jour
   - Responsive OK : tableau passe en cards empilées sur mobile

LIVRABLES
=========
- Prototype mis à jour avec 2 nouveaux écrans
- Code Next.js (page + composants + API + Prisma migration + seed enrichi)
- Sidebar enrichie
- Test curl + screenshots des 2 vues (groupe + drill-down filiale)
- Commit "feat(dg): cockpit consolidation multi-sociétés — fn 1.2"
```

---

### PROMPT 1.3 — Suivi des objectifs annuels et trimestriels

```
Fonction 1.3 : suivi des objectifs stratégiques annuels et trimestriels.

CONTEXTE
========
Le DG fixe en début d'année des objectifs (CA, marge, embauches, sécurité,
nouveaux contrats). Il les suit en temps réel avec alertes si dérive.

PROTOTYPE HTML
==============
Crée screen-dg-objectifs avec :

1. Header :
   - Titre "Mes objectifs 2026"
   - Sélecteur d'année (2024 / 2025 / 2026)
   - Bouton "Définir objectifs 2027" (placeholder)

2. Section "Objectifs annuels" (cards en grille 2 ou 3 colonnes) :
   Pour chaque objectif :
   - Libellé (ex: "CA annuel 4 Md FCFA")
   - Barre de progression colorée (vert si > 75% du temps écoulé proportionnel,
     ambre si entre 50-75%, rouge si < 50%)
   - Valeur réalisée vs cible
   - Pourcentage de réalisation
   - Indicateur "À temps" / "En retard" / "En avance"

   Exemples d'objectifs à afficher :
   - CA annuel : 2,84 Md / 4 Md (71%)
   - Marge moyenne : 18,4% / 22% (en retard)
   - Effectif : 487 / 520 (94%)
   - Nouveaux contrats : 12 / 15 (80%)
   - Jours sans accident : 142 / 365 (en cours)
   - Certifications obtenues : 1 / 2 (50%)

3. Section "Objectifs trimestriels en cours (T2 2026)" :
   Mêmes cards mais sur le trimestre courant.

4. Graphe d'évolution :
   Pour l'objectif sélectionné, courbe trajectoire prévisionnelle vs courbe
   réalisée vs cible finale, sur 12 mois.

5. Modale "Définir/modifier un objectif" :
   - Catégorie (Financier, Commercial, RH, HSE, Stratégique)
   - Libellé court + description
   - Valeur cible + unité
   - Échéance
   - Pondération (importance %)

PRISMA
======

  model Objective {
    id          String   @id @default(cuid())
    tenantId    String
    tenant      Tenant   @relation(fields: [tenantId], references: [id])
    ownerId     String
    owner       User     @relation(fields: [ownerId], references: [id])
    category    ObjectiveCategory
    title       String
    description String?
    targetValue Float
    actualValue Float    @default(0)
    unit        String   // "FCFA", "%", "jours", "unités"
    period      ObjectivePeriod
    year        Int
    quarter     Int?     // null si annuel
    weight      Int      @default(1) // pondération
    status      ObjectiveStatus @default(IN_PROGRESS)
    startDate   DateTime
    endDate     DateTime
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }

  enum ObjectiveCategory { FINANCIAL COMMERCIAL HR HSE STRATEGIC }
  enum ObjectivePeriod { ANNUAL QUARTERLY MONTHLY }
  enum ObjectiveStatus { IN_PROGRESS AT_RISK ACHIEVED MISSED CANCELLED }

Migration : pnpm prisma migrate dev --name objectives

SEED
====
Ajouter 6 objectifs annuels 2026 pour Albert DAAYANG (DG) avec valeurs
cohérentes par rapport aux exemples ci-dessus.

CODE REACT
==========

a) API :
   - GET /api/dg/objectives?year=2026&period=ANNUAL
   - GET /api/dg/objectives/:id (détail avec courbe trajectoire)
   - POST /api/dg/objectives
   - PUT /api/dg/objectives/:id
   - DELETE /api/dg/objectives/:id

b) Page /dg/objectifs/page.tsx

c) Composants src/components/dg/ :
   - ObjectiveCard.tsx (card avec barre de progression colorée)
   - ObjectivesGrid.tsx
   - ObjectiveTrajectoryChart.tsx (Recharts double ligne : prévu vs réalisé)
   - ObjectiveFormModal.tsx (création/édition)

SIDEBAR
=======
Ajouter "Mes objectifs" dans Espace DG → /dg/objectifs

LIVRABLES
=========
- Prototype HTML : screen-dg-objectifs
- Code Next.js complet avec CRUD
- 6 objectifs seedés visibles dans /dg/objectifs
- Graphe trajectoire fonctionnel sur clic d'un objectif
- Test : créer un nouvel objectif via la modale, vérifier persistance
- Commit "feat(dg): suivi objectifs annuels et trimestriels — fn 1.3"
```

---

### PROMPT 1.4 — Trésorerie prévisionnelle 12 semaines

```
Fonction 1.4 : trésorerie prévisionnelle glissante sur 12 semaines.

CONTEXTE
========
Un DG BTP au Cameroun doit anticiper sa trésorerie semaine par semaine sur
3 mois pour piloter ses tirages bancaires, échéances fiscales (TVA, CNPS,
IRPP), et les délais de paiement publics qui sont souvent longs.

PROTOTYPE HTML
==============
Crée screen-dg-treso-previ avec :

1. Header :
   - Titre "Trésorerie prévisionnelle — 12 semaines glissantes"
   - Subtitle "Du 11/05/2026 au 02/08/2026"
   - Boutons : Excel export, Rafraîchir, Paramètres pondération

2. Bandeau résumé (4 KPIs) :
   - Solde initial : 412 M FCFA
   - Encaissements prévus 12 sem : +850 M (pondéré probabilité)
   - Décaissements engagés : -680 M
   - Solde projeté à 12 sem : 582 M

3. Graphe central — Courbe d'évolution semaine par semaine :
   Recharts ComposedChart avec :
   - Aire violette (solde projeté)
   - Barres vertes (encaissements de la semaine)
   - Barres rouges (décaissements de la semaine)
   - Ligne pointillée seuil critique (50 M FCFA)
   - Ligne pointillée seuil confort (200 M FCFA)
   - Si la courbe descend sous le seuil critique : zone rouge surlignée

4. Tableau détaillé semaine par semaine :
   12 lignes (S20, S21, ..., S31), colonnes :
   - Semaine
   - Solde début
   - Encaissements clients (avec pondération %)
   - Encaissements autres
   - Total entrées
   - Décaissements fournisseurs
   - Salaires + charges
   - Échéances fiscales (TVA, CNPS, IRPP)
   - Total sorties
   - Solde fin
   - État (vert / ambre / rouge)

5. Card "Échéances majeures à risque" :
   Liste des grosses échéances (> 50 M FCFA) classées par date avec niveau de criticité.

6. Modale "Ajouter prévision manuelle" :
   - Type (encaissement / décaissement)
   - Libellé + montant + date
   - Probabilité (slider 0-100%)
   - Récurrence (unique / mensuelle / personnalisée)

PRISMA
======

  model CashFlowProjection {
    id            String   @id @default(cuid())
    tenantId      String
    tenant        Tenant   @relation(fields: [tenantId], references: [id])
    type          CashFlowType  // INCOME, EXPENSE
    category      String   // CLIENT_PAYMENT, SUPPLIER, SALARY, TAX, OTHER
    label         String
    amount        BigInt
    expectedDate  DateTime
    probability   Int      @default(100) // 0-100%
    sourceType    String?  // INVOICE, PURCHASE_ORDER, PAYROLL, MANUAL
    sourceId      String?
    realized      Boolean  @default(false)
    realizedDate  DateTime?
    realizedAmount BigInt?
    createdAt     DateTime @default(now())
  }
  enum CashFlowType { INCOME EXPENSE }

Migration et alimentation auto depuis :
- Factures clients en cours (table à créer si absente, sinon mock)
- Bons de commande validés
- Paie mensuelle prévisionnelle
- Échéances fiscales standard (TVA 15 du mois, CNPS 15, IRPP 15)

CODE
====

a) API :
   - GET /api/dg/cashflow?weeks=12
   - POST /api/dg/cashflow/manual
   - PUT /api/dg/cashflow/:id (modifier probabilité ou date)

b) Logique métier src/lib/cashflow.ts :
   - calculateProjection() : agrège tous les flux pondérés sur 12 semaines
   - detectCriticalWeeks() : retourne semaines sous seuil critique

c) Page /dg/tresorerie-previsionnelle/page.tsx

d) Composants :
   - CashFlowSummary.tsx (4 KPIs)
   - CashFlowChart.tsx (Recharts ComposedChart complexe)
   - CashFlowTable.tsx (tableau 12 semaines avec coloration)
   - MajorDueDates.tsx (échéances à risque)
   - ManualForecastModal.tsx

SEED
====
Générer 30-50 prévisions de cash-flow réalistes étalées sur 12 semaines avec
probabilités variables.

LIVRABLES
=========
- Prototype : screen-dg-treso-previ
- Code complet
- Graphe central interactif (tooltip au survol semaine)
- Test : ajouter prévision manuelle, voir la courbe se mettre à jour
- Commit "feat(dg): trésorerie prévisionnelle 12 semaines — fn 1.4"
```

---

### PROMPT 1.5 — Reporting Conseil d'Administration

```
Fonction 1.5 : génération de rapports pour le Conseil d'Administration.

CONTEXTE
========
Le DG doit produire mensuellement (ou trimestriellement, ou annuellement) un
rapport synthétique pour son conseil d'administration : performance financière,
opérationnelle, sociale, projets stratégiques, risques.

PROTOTYPE HTML
==============
Crée screen-dg-reporting-ca avec :

1. Header :
   - Titre "Reporting Conseil d'Administration"
   - Bouton "Nouveau rapport CA" (gros bouton primary violet)

2. Section "Modèles de rapport" (3 cards) :
   - Reporting mensuel (rapide, KPIs essentiels)
   - Reporting trimestriel (analyse approfondie + perspectives)
   - Reporting annuel (rapport intégral pour AG)

   Chaque card a un bouton "Générer" qui ouvre le wizard.

3. Section "Rapports archivés" :
   Tableau des 12 derniers rapports générés :
   Colonnes : Type | Période | Date génération | Format | Auteur | Actions (Voir, PDF, Diffuser)

4. Section "Prochain CA programmé" :
   Date du prochain conseil + rappel "Reporting à finaliser avant cette date"
   + checklist des chapitres validés ou en attente.

5. WIZARD GÉNÉRATION (modale full-screen ou page dédiée) :

   Étape 1 : Période et type
   - Type de rapport (mensuel/trimestriel/annuel)
   - Période concernée
   - Date du conseil d'administration

   Étape 2 : Sélection des chapitres
   Checklist des chapitres à inclure :
   - Synthèse exécutive
   - Performance financière (P&L, BFR, trésorerie)
   - Performance opérationnelle (chantiers, productivité)
   - Performance commerciale (carnet, pipeline)
   - Ressources humaines (effectifs, masse salariale, turnover)
   - HSE et conformité
   - Projets stratégiques
   - Risques et opportunités
   - Perspectives et plan d'action

   Étape 3 : Personnalisation
   - Commentaires DG par chapitre (texte libre)
   - Objectifs prioritaires à mettre en avant
   - Annexes à joindre

   Étape 4 : Aperçu et génération
   - Preview du rapport en HTML
   - Boutons : Télécharger PDF / Diffuser par email aux administrateurs

PRISMA
======

  model BoardReport {
    id          String   @id @default(cuid())
    tenantId    String
    tenant      Tenant   @relation(fields: [tenantId], references: [id])
    authorId    String
    author      User     @relation(fields: [authorId], references: [id])
    type        BoardReportType
    period      String   // "2026-04", "2026-T1", "2026"
    boardDate   DateTime
    chapters    Json     // { financial: true, operational: true, ... }
    comments    Json     // { financial: "...", operational: "...", ... }
    pdfUrl      String?
    status      BoardReportStatus
    sentTo      Json?    // [{ email, name, sentAt }]
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }

  enum BoardReportType { MONTHLY QUARTERLY ANNUAL EXTRAORDINARY }
  enum BoardReportStatus { DRAFT GENERATED PUBLISHED ARCHIVED }

CODE REACT
==========

a) API :
   - GET /api/dg/board-reports
   - GET /api/dg/board-reports/:id
   - POST /api/dg/board-reports (création depuis wizard)
   - GET /api/dg/board-reports/:id/pdf (génération PDF via React-PDF)
   - POST /api/dg/board-reports/:id/send (envoi email aux administrateurs)

b) Pages :
   - /dg/reporting-ca/page.tsx (liste + cards templates)
   - /dg/reporting-ca/nouveau/page.tsx (wizard 4 étapes)
   - /dg/reporting-ca/[id]/page.tsx (preview + actions)

c) Composants :
   - BoardReportTemplateCard.tsx
   - ReportWizardStepper.tsx
   - ChapterSelector.tsx
   - ReportPDF.tsx (template React-PDF complet, multi-pages)
   - SendToBoardModal.tsx

d) Utilitaire src/lib/board-report-generator.ts :
   Fonction qui agrège toutes les données nécessaires aux chapitres en piochant
   dans Prisma : KPIs financiers, chantiers, RH, etc.

SEED
====
Créer 3 rapports CA archivés (mensuels février, mars, avril 2026) avec données
réalistes pour démontrer l'historique.

LIVRABLES
=========
- Prototype : screen-dg-reporting-ca + écran wizard
- Code complet avec génération PDF
- Test bout-en-bout : cliquer "Reporting mensuel" → wizard 4 étapes →
  génération PDF qui se télécharge
- 3 rapports archivés visibles dans la liste
- Commit "feat(dg): reporting Conseil d'Administration — fn 1.5"

⚠️ NOTE
========
Cette fonction est lourde. Si l'agent estime que le PDF complet multi-pages
React-PDF dépasse le scope, il peut livrer une V1 avec un PDF simple sur 2 pages
(synthèse + KPIs) et noter dans le commit "PDF V1 minimal, enrichissement en V2".
```

---

## ✅ Fin du Bloc 1

Une fois les 5 fonctions du Bloc 1 livrées, validées visuellement et fonctionnellement,
demande-moi le **Bloc 2 — Pipeline commercial et carnet de commandes**.

Format de retour pour me demander le bloc suivant :
```
Bloc 1 terminé. Tu peux me livrer le Bloc 2.
```

Si en cours de route une fonction du Bloc 1 pose problème, dis-le moi pour qu'on
ajuste avant de continuer.
