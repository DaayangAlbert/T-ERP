# DG · BLOC 3 — Pilotage opérationnel

**3 modules · 3 prompts à enchaîner**

---

## 🟣 PROMPT 3.1 — Chantiers (vue DG transverse)

```
Module : Chantiers · vue DG transverse.

CONTEXTE
========
L'écran screen-sites existe en lecture (23 chantiers actifs). On l'enrichit pour le DG :
arbitrages, validations marchés, vue carte, drill-down chantier, alertes.

PROTOTYPE HTML — ENRICHISSEMENT screen-sites
=============================================

1. Garde la listview actuelle, ajoute des onglets en haut :
   - Tous les chantiers (existant)
   - Carte (nouvelle)
   - Performance (nouvelle)
   - Marchés (nouvelle)

2. Onglet "Carte" :
   Carte du Cameroun avec marqueurs colorés selon statut (vert sain, ambre vigilance,
   rouge dérive). Clic marqueur → popup avec mini-info chantier.
   Filtre par région, statut, type. Liste latérale synchronisée avec carte.

3. Onglet "Performance" :
   Tableau analytique :
   colonnes Chantier | Avancement physique | Avancement financier |
   Écart | Marge prévue vs réalisée | DSO client | Statut HSE
   Tri par tous critères, code couleur sur les écarts.
   Graphes : top 5 marges, top 5 dérives, classement productivité.

4. Onglet "Marchés" :
   Listview des contrats de marché :
   référence, MOA, montant initial, avenants, montant cumulé, dates,
   garanties (cautions), pénalités appliquées, retenue de garantie.
   Bouton "Nouveau marché" (wizard de création).
   Indicateurs spéciaux pour marchés publics (FEICOM, MINTP...).

5. Page détail chantier (nouvel écran screen-site-detail) :
   - Hero violet avec photo chantier + KPIs
   - Onglets : Marché, Planning, Décomptes, Équipe, Stock, Photos, HSE, Documents
   - Section "Validations DG sur ce chantier" : avenants signés, écarts validés
   - Section "Alertes" en cas de dérive avec recommandations (rule-based)
   - Bouton "Décision DG" pour saisir une orientation stratégique sur ce chantier

CODE
====

a) PRISMA :
   model SiteContract {
     id            String   @id @default(cuid())
     siteId        String   @unique
     site          Site     @relation(fields: [siteId], references: [id])
     reference     String
     initialAmount BigInt
     currentAmount BigInt
     amendments    Json[]   // [{ ref, amount, date, reason, validatedBy }]
     guarantees    Json     // { caution, retention, penalties }
     paymentTerms  String?
     publicMarket  Boolean  @default(false)
     procuringEntity String? // MINTP, MINHDU, FEICOM...
   }
   model SitePhoto {
     id        String   @id @default(cuid())
     siteId    String
     site      Site     @relation(fields: [siteId], references: [id])
     url       String
     caption   String?
     takenAt   DateTime
     uploadedBy String
   }
   model SiteAlert {
     id        String   @id @default(cuid())
     siteId    String
     site      Site     @relation(fields: [siteId], references: [id])
     severity  AlertSeverity
     type      String   // BUDGET_OVERRUN, DELAY, HSE_INCIDENT, ...
     message   String
     resolved  Boolean  @default(false)
     createdAt DateTime @default(now())
   }
   enum AlertSeverity { LOW MEDIUM HIGH CRITICAL }
   Migration : pnpm prisma migrate dev --name sites_contracts_alerts

b) API :
   - GET /api/sites/map (avec coords pour la carte)
   - GET /api/sites/performance (tableau analytique)
   - GET /api/sites/contracts (liste marchés)
   - GET /api/sites/:id (détail enrichi)
   - GET /api/sites/:id/alerts
   - POST /api/sites/:id/decisions (saisie décision DG)
   - GET /api/sites/:id/photos
   - POST /api/sites/:id/contracts/amendments

c) Pages :
   - /chantiers/page.tsx (refonte avec 4 onglets)
   - /chantiers/[id]/page.tsx (détail multi-onglets)

d) Composants src/components/sites/ :
   - SitesMap.tsx (utilise leaflet ou mapbox-gl, ou fallback SVG simple si trop lourd)
   - PerformanceTable.tsx
   - ContractsList.tsx
   - SiteHero.tsx (photo + KPIs)
   - SiteTabs.tsx (Marché / Planning / Décomptes / Équipe / Stock / Photos / HSE / Docs)
   - AlertsPanel.tsx
   - DgDecisionForm.tsx

SEED
====
- 23 chantiers déjà seedés (étendre si moins de 23)
- Pour chaque chantier : ajouter contrat de marché + 2-5 photos placeholder + 0-3 alertes
- 3 chantiers en dérive avec alertes critiques (Pont Mfoundi déjà identifié)

LIVRABLES
=========
- Prototype : screen-sites enrichi + screen-site-detail
- Code complet
- Commit "feat(dg): chantiers — carte, performance, marchés, drill-down complet"

⚠️ NOTE
========
La carte interactive est lourde. Si Leaflet pose problème, livrer en V1 avec une
carte SVG statique du Cameroun + marqueurs cliquables. Mentionner V2 = leaflet.
```

---

## 🟣 PROMPT 3.2 — Planning (vue DG)

```
Module : Planning · vue DG.

CONTEXTE
========
L'écran screen-planning existe avec un Gantt 6 mois. On l'enrichit pour le DG :
vue groupe, arbitrages ressources, jalons stratégiques, replanification.

PROTOTYPE HTML — ENRICHISSEMENT screen-planning
================================================

1. Garde le Gantt central, ajoute un sélecteur de vue en haut :
   - Vue Gantt (existant, par chantier)
   - Vue charge ressources (déjà présente, à enrichir)
   - Vue jalons stratégiques (nouvelle)
   - Vue calendrier (nouvelle)

2. Vue "Charge ressources" enrichie :
   Toggle entre vue par compétence (maçons, coffreurs...) et vue par engin.
   Heatmap mensuelle 12 mois × ressources avec code couleur charge (sous, optimal, sur).
   Bouton "Détecter conflits" qui surligne les semaines surchargées et propose des
   actions (déplacer un chantier, sous-traiter, recruter).

3. Vue "Jalons stratégiques" :
   Frise chronologique horizontale 12 mois avec jalons d'entreprise :
   - Réceptions chantiers (carrés verts)
   - Lancements chantiers (carrés violets)
   - Échéances financières (losanges ambré : TVA, IS, CNPS)
   - Échéances commerciales (losanges bleus : remise dossiers AO)
   - Événements internes (ronds : CA, AG, audits)
   Filtres par type. Clic jalon → détail avec actions.

4. Vue "Calendrier" :
   Vue mois ou semaine avec tous les événements ci-dessus, drag-and-drop pour
   replanification (avec confirmation et propagation aux dépendances).

5. Section "Arbitrages DG en attente" :
   Tableau des conflits ou décisions stratégiques nécessitant validation DG :
   - Demandes de replanification chantiers
   - Conflits ressources (qui prend la grue ?)
   - Demandes de sous-traitance (avec justification financière)
   Boutons Valider / Refuser / Demander complément.

CODE
====

a) PRISMA :
   model Milestone {
     id        String   @id @default(cuid())
     tenantId  String
     siteId    String?
     type      MilestoneType
     title     String
     date      DateTime
     critical  Boolean  @default(false)
     status    MilestoneStatus
     createdAt DateTime @default(now())
   }
   enum MilestoneType { SITE_START SITE_DELIVERY MILESTONE FINANCIAL COMMERCIAL INTERNAL }
   enum MilestoneStatus { PLANNED IN_PROGRESS DONE DELAYED CANCELLED }

   model ResourceConflict {
     id          String   @id @default(cuid())
     tenantId    String
     resourceType String  // CREW, EQUIPMENT
     resourceId  String?  // null si compétence générique
     periodStart DateTime
     periodEnd   DateTime
     demandLevel Int      // % de surcharge
     siteIds     String[] // chantiers concernés
     resolved    Boolean  @default(false)
     resolution  String?
     createdAt   DateTime @default(now())
   }

b) API :
   - GET /api/planning/gantt
   - GET /api/planning/resources
   - GET /api/planning/milestones (avec filtres)
   - POST /api/planning/milestones
   - PATCH /api/planning/milestones/:id (replanification)
   - GET /api/planning/conflicts
   - POST /api/planning/conflicts/:id/resolve
   - GET /api/planning/dg-arbitrations

c) Pages :
   - /planning/page.tsx (4 vues sélectionnables)
   - /planning/arbitrages/page.tsx

d) Composants src/components/planning/ :
   - GanttView.tsx (existant à enrichir avec drag-drop)
   - ResourceHeatmap.tsx
   - ConflictDetector.tsx
   - MilestonesTimeline.tsx
   - CalendarView.tsx (basé sur react-big-calendar ou custom)
   - ArbitrationsTable.tsx

SEED
====
- 30 jalons stratégiques répartis sur 12 mois (livraisons, lancements, fiscaux, AG)
- 4 conflits ressources actifs (2 surcharges maçons, 1 surcharge pelle, 1 conflit grue)
- 3 arbitrages DG en attente

LIVRABLES
=========
- Prototype : screen-planning enrichi + screen-planning-arbitrages
- Code complet
- Commit "feat(dg): planning — heatmap, jalons, calendrier, arbitrages"
```

---

## 🟣 PROMPT 3.3 — Ressources humaines (vue DG stratégique)

```
Module : Ressources humaines · vue DG stratégique.

CONTEXTE
========
L'écran screen-hr existe avec effectifs et recrutements. On l'enrichit pour le DG :
masse salariale stratégique, plan de succession, indicateurs sociaux, formations.

PROTOTYPE HTML — ENRICHISSEMENT screen-hr
==========================================

1. Garde la structure existante, ajoute des onglets :
   - Vue d'ensemble (existant, KPIs)
   - Masse salariale (nouvelle)
   - Plan de succession (nouvelle)
   - Indicateurs sociaux (nouvelle)
   - Formations (nouvelle)

2. Onglet "Masse salariale" :
   - Évolution masse salariale brute + chargée sur 24 mois (graphe)
   - Décomposition par catégorie (Cadres, ETAM, OQ, OS, Manœuvres, Journaliers)
   - Comparaison budget vs réalisé
   - Projection 12 mois selon recrutements prévus
   - Top 20 salaires (tableau avec poste, catégorie, ancienneté, total brut)
   - Ratio masse salariale / CA
   - Coût moyen par catégorie

3. Onglet "Plan de succession" :
   - Organigramme interactif avec photo + nom + poste + ancienneté
   - Pour chaque poste clé : "successeur identifié" / "à risque" / "non prévu"
   - Liste des cadres clés avec :
     plan de carrière, formations en cours, prêt pour évolution dans X mois
   - Bouton "Définir successeur" sur chaque poste

4. Onglet "Indicateurs sociaux" :
   - Turnover (annualisé, par catégorie, par motif)
   - Absentéisme (taux, par motif, par chantier)
   - Pyramide des âges
   - Ancienneté moyenne par catégorie
   - Égalité H/F (effectifs, salaires, promotions)
   - Climat social (résultats du dernier sondage interne, à éditer)
   - Conflits sociaux en cours

5. Onglet "Formations" :
   - Plan annuel de formation
   - Budget formation (alloué vs dépensé)
   - Formations en cours par employé
   - Certifications obtenues (CACES, sécurité, métiers)
   - Échéance recyclages obligatoires (alertes 60 jours avant)

CODE
====

a) PRISMA :
   model SuccessionPlan {
     id            String   @id @default(cuid())
     tenantId      String
     positionId    String
     incumbentId   String   // titulaire
     successorId   String?  // successeur identifié
     readyInMonths Int?
     status        SuccessionStatus
     notes         String?  @db.Text
     updatedAt     DateTime @updatedAt
   }
   enum SuccessionStatus { IDENTIFIED AT_RISK NONE READY_NOW }

   model Training {
     id          String   @id @default(cuid())
     tenantId    String
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     title       String
     category    String   // CACES, sécurité, métier, management...
     provider    String?
     startDate   DateTime
     endDate     DateTime
     cost        BigInt?
     status      TrainingStatus
     certificateUrl String?
     expiresAt   DateTime? // pour recyclage
   }
   enum TrainingStatus { PLANNED IN_PROGRESS COMPLETED CANCELLED }

   model SocialIndicator {
     id        String   @id @default(cuid())
     tenantId  String
     period    String   // "2026-04"
     indicators Json    // turnover, absenteeism, climate...
     createdAt DateTime @default(now())
   }

b) API :
   - GET /api/hr/payroll-mass (avec projection)
   - GET /api/hr/payroll-mass/top-salaries
   - GET /api/hr/succession-plan
   - PATCH /api/hr/succession-plan/:positionId
   - GET /api/hr/social-indicators
   - GET /api/hr/trainings
   - POST /api/hr/trainings
   - GET /api/hr/trainings/expiring-soon

c) Pages :
   - /rh/page.tsx (refonte avec onglets)
   - /rh/succession/page.tsx (organigramme dédié)

d) Composants src/components/hr/ :
   - PayrollMassChart.tsx
   - TopSalariesTable.tsx
   - PayrollProjection.tsx
   - SuccessionOrgChart.tsx (utilise react-organizational-chart ou SVG custom)
   - SocialIndicatorsDashboard.tsx
   - AgePyramidChart.tsx
   - TrainingsCalendar.tsx
   - ExpiringCertifications.tsx

SEED
====
- Plan de succession pour 8 postes clés (DG, DAF, DT, Dir. travaux x2, Cond. travaux, RH, Compta)
- 50 formations historiques + 20 en cours + 15 planifiées
- 12 mois d'indicateurs sociaux pour BatimCAM SA
- 30 certifications CACES et sécurité dont 5 expirent dans les 60 jours

LIVRABLES
=========
- Prototype : screen-hr enrichi avec 5 onglets
- Code complet avec organigramme interactif
- Alertes recyclages CACES expirant dans 60j visibles dans le dashboard DG (lien retour)
- Commit "feat(dg): RH stratégique — masse, succession, social, formations"
```

---

## ✅ Fin Bloc 3

Format : "Bloc 3 terminé. Tu peux me livrer le Bloc 4."
