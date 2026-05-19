# CONDUCTEUR DE TRAVAUX · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Conducteur de Travaux (Samuel MBARGA · Pont Mfoundi)

**Position hiérarchique :** bras droit de Paul ETOUNDI (DTrav). Sur le chantier
80-90% du temps. Coordonne les 5 équipes ouvrières + sous-traitants. Interface
technique avec BCT, géomètres, MOA.

**Architecture RBAC** : `role: SITE_MANAGER` + `assignedSiteIds: ["pont-mfoundi-id"]`

**PWA** : réutilise l'infrastructure CC/MAG (offline-first léger pour ce profil)

---

## ⚠️ PROTOCOLE RESPONSIVE + PWA

Tap targets stricts identiques au CC/MAG (48px boutons, 68px items cliquables,
48px inputs + 16px font, 56px CTAs sticky, 44px avatars).

```bash
pnpm exec tsx scripts/audit-responsive.ts /cdt/<route>
pnpm exec tsx scripts/audit-tap-targets.ts /cdt/<route> --min=48
pnpm exec tsx scripts/audit-pwa.ts /cdt/<route>
```

Format commit : "✅ Audit : 7/7 responsive + 48px tap + PWA OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE CONDTRAV

```
Phase de développement du profil Conducteur de Travaux (Samuel MBARGA).

CONTEXTE
========
- Les profils CC et MAG sont développés avec PWA offline complète
- L'infrastructure (Service Worker Workbox, IndexedDB, Background Sync,
  useOfflineSync) est opérationnelle et étendue
- Le prototype HTML contient 6 écrans Espace CDT :
  screen-cdt-dashboard, screen-cdt-plan, screen-cdt-qualite,
  screen-cdt-soustraitants, screen-cdt-visites, screen-cdt-receptions
- Tous ont les attributs data-rh-screen + data-cdt-screen (règles CSS terrain)
- Samuel MBARGA assigné à 1 chantier : Pont Mfoundi
- Il rapporte à Paul ETOUNDI (DTrav)
- Il coordonne 5 équipes ouvrières + STI Étanchéité (sous-traitant)

CONVENTIONS
============
- Écrans prototype : id="screen-cdt-<fonction>"
- Pages Next.js : src/app/(app)/cdt/<fonction>/page.tsx
- Composants : src/components/cdt/<NomFonction>.tsx
- API routes : src/app/api/cdt/<fonction>/route.ts
- Hooks : src/hooks/useCdt<Fonction>.ts

EXTENSION PWA
==============

1. NOUVEAUX STORES INDEXEDDB
   Étendre src/lib/offline/db.ts avec :
   - daily-plan-queue : plans du jour validés en attente de sync
   - quality-control-queue : auto-contrôles en attente
   - visit-report-queue : compte-rendus visites externes
   - milestone-queue : préparations de jalons
   - plan-cache : derniers plans validés (consultation offline)
   - subcontractor-attendance-cache : présence sous-traitants

2. BACKGROUND SYNC
   Ajouter dans public/sw.js :
   - POST /api/cdt/daily-plans
   - POST /api/cdt/quality-controls
   - POST /api/cdt/visits/:id/report
   - POST /api/cdt/subcontractor-attendance

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     SITE_MANAGER  // Conducteur de Travaux
   }

2. Créer le layout dédié src/app/(app)/cdt/layout.tsx :
   - Vérifie Role.SITE_MANAGER
   - Vérifie assignedSiteIds non vide
   - Charge le SiteContext (1 seul chantier pour CDT, identique au CC)
   - Wrap children dans <div data-cdt-screen data-rh-screen className="rh-page">

3. Étendre Prisma :

   model DailyPlan {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     planDate    DateTime @db.Date
     status      DailyPlanStatus
     createdBy   String   // Conducteur travaux
     validatedAt DateTime?
     validatedBy String?  // Chef de chantier (J. KAMGA)
     teams       DailyPlanTeam[]
     notes       String?  @db.Text
     @@unique([siteId, planDate])
   }
   enum DailyPlanStatus { DRAFT VALIDATED EXECUTED REVISED }

   model DailyPlanTeam {
     id              String   @id @default(cuid())
     planId          String
     plan            DailyPlan @relation(fields: [planId], references: [id])
     teamId          String
     team            SiteTeam @relation(fields: [teamId], references: [id])
     mainTask        String
     objective       String?  // "14 m²", "900 kg"
     materialsNeeded Json?    // [{ articleId, quantity, unit }]
     status          TeamStatus
     extraNotes      String?
   }
   enum TeamStatus { ASSIGNED PENDING_RESOURCES REINFORCEMENT_NEEDED IN_PROGRESS COMPLETED }

   model QualityControl {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     type        QcType
     category    QcCategory
     reference   String   // QC-2026-0042
     checkpoints Json     // [{ label, expected, measured, conform }]
     overallConform Boolean
     photos      String[]
     notes       String?
     performedBy String
     performedAt DateTime
     phase       String?  // "Gros œuvre", "Tablier"
     location    String?  // "Culée Nord", "Pile 3"
   }
   enum QcType { SELF_CONTROL LAB_TEST EXTERNAL_INSPECTION }
   enum QcCategory { CONCRETE REBAR FORMWORK GEOMETRY EARTHWORKS WATERPROOFING ELECTRICAL OTHER }

   model LabTest {
     id          String   @id @default(cuid())
     qcId        String?  // lien avec QualityControl si applicable
     siteId      String
     labName     String   // "LABOGENIE"
     testType    LabTestType
     sampleRef   String   // référence éprouvette
     samplingDate DateTime
     expectedDate DateTime  // J+7, J+28
     receivedDate DateTime?
     result      Json?    // structure libre selon test
     conform     Boolean?
     reportUrl   String?
   }
   enum LabTestType { CONCRETE_J7 CONCRETE_J28 STEEL_TENSILE SOIL_BEARING SOIL_DENSITY ASPHALT OTHER }

   model SubcontractorPresence {
     id              String   @id @default(cuid())
     siteId          String
     subcontractorId String
     subcontractor   Supplier @relation(fields: [subcontractorId], references: [id])
     date            DateTime @db.Date
     supervisorOnSite String  // chef équipe sous-traitant
     workerCount     Int
     activityNotes   String?
     dailyPresenceBL String?  // chemin photo du bon de présence signé
     recordedBy      String   // CDT
     @@unique([siteId, subcontractorId, date])
   }

   model ExternalVisit {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     visitorType VisitorType
     visitorName String
     organization String
     scheduledAt DateTime
     completedAt DateTime?
     purpose     String
     reportContent String? @db.Text
     reportPhotos String[]
     reservations Int     @default(0)  // nombre de réserves émises
     status      VisitStatus
     reportUrl   String?
   }
   enum VisitorType { BCT GEOMETER MOA INSURANCE BANK CONSULTANT OTHER }
   enum VisitStatus { SCHEDULED COMPLETED REPORTED VALIDATED }

   model Milestone {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     code        String   // "J1", "J2", "J3"
     designation String
     contractDate DateTime
     forecastDate DateTime
     actualDate  DateTime?
     status      MilestoneStatus
     deliverables Json    // checklist DOE
     preparation Int      @default(0)  // % préparation
     reservations Int     @default(0)
     pvUrl       String?
   }
   enum MilestoneStatus { UPCOMING IN_PREPARATION READY_FOR_RECEPTION REACHED MISSED }

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 7 nouveaux models
- Layout CDT protégé par rôle SITE_MANAGER
- IndexedDB étendu (6 nouveaux stores)
- Service Worker étendu (4 nouvelles routes Background Sync)
- Seed : DailyPlan du jour, 3 contrôles qualité, 1 sous-traitant STI, 2 visites
  externes prévues, 5 jalons J1-J5
- Test : Samuel se connecte → voit Pont Mfoundi uniquement
- Test RBAC : Samuel tente d'accéder à un autre chantier → 403
- Audit responsive 7/7 OK + tap targets 48px+
- Commit "chore(cdt): bootstrap conducteur travaux + extension PWA"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 6 fonctions Espace Conducteur de Travaux

### PROMPT 1.1 — Tableau de bord chantier

```
Fonction 1.1 : tableau de bord technique du chantier.

PROTOTYPE HTML
==============
L'écran screen-cdt-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau sticky violet "⛑ Pont Mfoundi · Conducteur travaux" + badge sync
- Salutation "Bonjour Samuel · Vendredi 9 mai 2026 · 07:32 · ☀ 26° · phase Gros
  œuvre 82%"
- KPIs techniques : Équipes au travail 5/5, Tâches du jour 8 (3 actives + 4 prévues),
  Contrôles à faire 3 en orange, Réserve BCT ouverte 1 en rouge
- CTA violet gradient "📋 Plan du jour à valider · 5 équipes à affecter" avec
  bouton blanc 52px "Préparer →"
- Section alertes techniques : 4 alertes (Réserve BCT Z3 rouge, Bétonnage 9 m³
  ambré, 3 essais béton J+7 ambré, Visite géomètre demain bleu)
- Card phase active "Gros œuvre superstructure 82%" avec barre verte et prochain
  jalon J3 dans 12 jours
- Section sous-traitants présents : STI Étanchéité 6 ouvriers

API
===
- GET /api/cdt/dashboard
  → cache NetworkFirst pour offline-first
  → renvoie KPIs, alertes, phase active, sous-traitants

COMPOSANTS src/components/cdt/dashboard/
==========================================
- CdtSyncStatusBadge.tsx
- CdtGreeting.tsx
- CdtKpiRow.tsx (4 KPIs techniques)
- DailyPlanCallToAction.tsx (CTA violet)
- TechnicalAlertsList.tsx (4 alertes hiérarchisées)
- ActivePhaseCard.tsx (avec progress et prochain jalon)
- SubcontractorsOnSiteList.tsx

⚠️ RESPONSIVE
==============
- Tous boutons 48px minimum
- KPIs 4 col → 2x2 → 1 col
- Alertes items 68px hauteur

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt --min=48

LIVRABLES
=========
- Code complet conforme au prototype
- Test offline : dashboard cache OK
- Audit 7/7 responsive + 48px tap OK
- Commit "feat(cdt): tableau de bord technique — fn 1.1"
```

---

### PROMPT 1.2 — Plan du jour et coordination

```
Fonction 1.2 : affectation matinale des équipes aux tâches.

PROTOTYPE HTML
==============
L'écran screen-cdt-plan existe. Reproduire avec :
- Header "Plan du jour · 5 équipes · revue avec J. KAMGA à 7h45"
- 5 cards équipes avec border-left coloré selon statut :
  * Coffrage Nord (F. NDONGO 14 ouvriers) · violet · Affecté
  * Ferraillage (P. ABEGA 16) · violet · Affecté
  * Béton (J. MBALLA 12) · ambré · À démarrer 9h (avec card dashed)
  * Terrassement (C. MEKONGO 8/6) · rouge · Renfort demandé
  * Finitions VRD (A. NDJOM 10) · violet · Affecté
- Pour chaque équipe : avatar chef + libellé + présence, sections "Tâche
  principale" et "Matières à sortir au magasin"
- Bouton sticky bottom 56px "Valider le plan du jour"

WORKFLOW MÉTIER
================
1. À 7h, Samuel arrive au chantier
2. Il consulte les présences pointées par Jean (CC) à 7h
3. Il affecte chaque équipe à sa tâche prioritaire en cohérence avec le planning
   du chantier (fn 1.4 DTrav)
4. Il définit les matières nécessaires → notification au magasinier Lucas pour
   préparation
5. À 7h45, revue avec Jean pour ajustements
6. À 8h, validation finale du plan → notification équipes + DTrav

API
===
- GET /api/cdt/daily-plans/today (plan du jour ou DRAFT créé)
- POST /api/cdt/daily-plans/:id/teams (ajout/modif affectation équipe)
  → BackgroundSync
- POST /api/cdt/daily-plans/:id/validate (validation 8h)
- GET /api/cdt/daily-plans/history?from=&to=

COMPOSANTS src/components/cdt/plan/
=====================================
- DailyPlanHeader.tsx
- TeamAssignmentCard.tsx ⚠️ CRITIQUE — card par équipe
- TaskAssignmentForm.tsx (tâche principale + objectif)
- MaterialsNeededSection.tsx (liste matières à sortir)
- ReinforcementRequestBadge.tsx (si sous-effectif)
- ValidatePlanButton.tsx (sticky bottom 56px)

⚠️ RESPONSIVE
==============
- Cards équipes : structure verticale mobile
- Avatar chef 44px + nom + présence sur une ligne
- Sections tâche/matières empilées
- Border-left coloré selon statut team (vert/ambré/rouge)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt/plan
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt/plan --min=48

LIVRABLES
=========
- Code complet
- Test : Samuel affecte Coffrage Nord → coffrage culée Nord 14 m² → matières
  42 sacs ciment + 6 m³ sable → notification Lucas
- Test : équipe Terrassement en sous-effectif → badge rouge "Renfort demandé"
- Test offline : modifier plan offline → queue → sync auto
- Audit responsive + tap targets OK
- Commit "feat(cdt): plan du jour + coordination équipes — fn 1.2"
```

---

### PROMPT 1.3 — Contrôles qualité

```
Fonction 1.3 : auto-contrôles internes + tests labo.

PROTOTYPE HTML
==============
L'écran screen-cdt-qualite existe. Reproduire avec :
- Header + bouton "+ Nouvel auto-contrôle" 48px
- KPIs (38 contrôles ce mois, 1 NC, 5 tests labo en cours, 97% conformité YTD)
- Section "⏳ 3 contrôles à faire aujourd'hui" avec icônes 🧪 🧪 📐 sur fond
  ambré clair + boutons "Saisir" 48px
- Section "Non-conformité ouverte" : card rouge NC-2026-005 recouvrement HA Z3
  + boutons "Marquer levée" et "📷 Photos avant/après"
- Section tests labo récents : 3 résultats avec statuts vert/orange

CONTEXTE MÉTIER
================
Les contrôles qualité sont la **mémoire technique** du chantier. Ils servent :
- À garantir la qualité d'exécution (auto-contrôle avant chaque étape importante)
- À justifier auprès du BCT et MOA lors des visites
- À constituer le DOE (Dossier d'Ouvrage Exécuté) pour la réception

Types de contrôles :
- **Auto-contrôles** : faits par Samuel/Jean avant chaque étape (avant bétonnage,
  avant coulage, etc.)
- **Tests labo** : éprouvettes envoyées à LABOGENIE pour essais béton J+7/J+28,
  essai traction acier, essai de portance sol
- **Inspections externes** : BCT, MOA (suivi via fn 1.5 Visites externes)

API
===
- GET /api/cdt/quality-controls (filtres : type, category, period)
- POST /api/cdt/quality-controls → BackgroundSync
- GET /api/cdt/quality-controls/:id
- POST /api/cdt/quality-controls/:id/photos (upload photos avant/après)
- GET /api/cdt/lab-tests
- POST /api/cdt/lab-tests (création éprouvette)
- PATCH /api/cdt/lab-tests/:id/result (saisie résultat retour labo)
- GET /api/cdt/non-conformities/open

COMPOSANTS src/components/cdt/qualite/
========================================
- QualityKpis.tsx
- TodayControlsList.tsx (3 contrôles avec icônes)
- OpenNonConformityCard.tsx ⚠️ CRITIQUE — workflow levée NC
- NewQualityControlWizard.tsx (formulaire avec checkpoints dynamiques)
- LabTestsList.tsx (tableau résultats)
- LabTestResultModal.tsx (saisie résultat avec conformité)

⚠️ RESPONSIVE
==============
- Wizard auto-contrôle : étapes verticales mobile
- Checkpoints : input + comparaison expected/measured + indicateur conforme
- Photos avant/après : capture caméra arrière + galerie

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt/qualite
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt/qualite --min=48

LIVRABLES
=========
- Code complet
- Test : Samuel saisit auto-contrôle ferraillage tablier avant bétonnage,
  6 checkpoints, 1 non conforme → NC ouverte automatiquement
- Test : Samuel marque levée NC-005 Z3 → photo avant/après → notification BCT
- Test : Samuel prélève 3 éprouvettes béton J+7 → envoyées LABOGENIE →
  saisie résultat à réception
- Audit responsive + tap targets OK
- Commit "feat(cdt): contrôles qualité + tests labo + NC — fn 1.3"
```

---

### PROMPT 1.4 — Sous-traitants

```
Fonction 1.4 : coordination des sous-traitants sur site.

PROTOTYPE HTML
==============
L'écran screen-cdt-soustraitants existe. Reproduire avec :
- Header "1 actif · 1 en démarrage prochain · 38,2 M FCFA engagés"
- Card sous-traitant actif (STI Étanchéité, border-left vert) :
  * Icône 48px + nom + libellé contrat + statut
  * Grille 4 chiffres (Présents 6/6, Démarrage 05/05, Fin 28/05, Avancement 28%)
  * Barre de progression
  * 3 boutons 44px (Photo qualité, Évaluer prestation, Contact responsable)
- Card sous-traitant prévu (ELEC Cameroun, border-left bleu)
- Section "Pointage présence STI · aujourd'hui" : 3 lignes
  * E. NDOUNA chef équipe arrivé 07:18
  * 5 ouvriers STI présents
  * Bouton "Émettre bon de présence journalier"

WORKFLOW MÉTIER
================
1. Samuel accueille le chef d'équipe sous-traitant chaque matin
2. Il pointe la présence (chef + nombre d'ouvriers) → traçabilité pour facturation
3. Il supervise la qualité du travail réalisé
4. À la fin de la journée, il génère le bon de présence journalier signé par
   le chef d'équipe STI → utilisé pour la facturation mensuelle STI
5. Régulièrement, il évalue la prestation (qualité, délais, sécurité,
   comportement) → notation alimente la base sous-traitants côté DT

API
===
- GET /api/cdt/subcontractors (sous-traitants sur mes chantiers)
- GET /api/cdt/subcontractors/:id/today-attendance
- POST /api/cdt/subcontractor-attendance → BackgroundSync
- POST /api/cdt/subcontractor-attendance/:id/daily-bl (génère PDF présence)
- POST /api/cdt/subcontractors/:id/evaluation (évaluation post-prestation)
- POST /api/cdt/subcontractors/:id/quality-photo (photo qualité travail)

COMPOSANTS src/components/cdt/soustraitants/
==============================================
- SubcontractorsHeader.tsx
- ActiveSubcontractorCard.tsx (card avec progress + 3 boutons)
- UpcomingSubcontractorCard.tsx
- TodayPresencePointage.tsx ⚠️ CRITIQUE — pointage présence
- DailyPresenceBLGenerator.tsx (PDF signé)
- QualityPhotoUpload.tsx (capture caméra)
- SubcontractorEvaluationModal.tsx (4 critères : qualité, délais, sécurité, comportement)

⚠️ RESPONSIVE
==============
- Cards sous-traitants : structure verticale mobile
- 3 boutons actions : flex-wrap mobile
- Pointage présence : items 68px tactiles

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt/soustraitants
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt/soustraitants --min=48

LIVRABLES
=========
- Code complet
- Test : Samuel pointe présence STI Étanchéité (6 ouvriers présents) → enregistré
- Test : génération bon de présence journalier signé → PDF avec QR code
- Test : Samuel évalue STI Étanchéité (qualité 4/5, délais 5/5, sécurité 4/5,
  comportement 5/5) → notation moy. 4,5/5 alimentée chez le DT
- Audit responsive + tap targets OK
- Commit "feat(cdt): sous-traitants + présence + évaluation — fn 1.4"
```

---

### PROMPT 1.5 — Visites externes

```
Fonction 1.5 : programmation et compte-rendus visites BCT/géomètres/MOA.

PROTOTYPE HTML
==============
L'écran screen-cdt-visites existe. Reproduire avec :
- Header + bouton "+ Programmer visite" 48px
- 2 cards visites à venir avec badge date 60×60 et countdown :
  * Géomètre TopoCAM 10/05 10h (B. NJONGA, implantation pile 4) · 26h
  * Réunion MOA mensuelle 12/05 14h (Comm. Yaoundé I, avenant + planning) · 3j
- Section visites récentes : 3 lignes
  * Visite BCT M. KENGNE aujourd'hui 09:30 (1 réserve Z3, fond rouge)
  * Visite contrôle MOA 28/04 (validation jalon J2, fond vert)
  * Visite BCT M. KENGNE 22/04 (mensuelle, 0 réserve, fond vert)

WORKFLOW MÉTIER
================
1. Programmation : Samuel saisit visite prévue (date, heure, visiteur, objet)
2. Notification automatique 1 jour avant la visite
3. Préparation : checklist documents à avoir, équipes à mobiliser, zones à
   préparer
4. Pendant la visite : photos, notes, observations
5. Compte-rendu : Samuel rédige le CR avec réserves éventuelles, photos
6. Diffusion : CR transmis au DTrav (Paul) + DT (Daniel) + classement GED chantier

API
===
- GET /api/cdt/visits/upcoming
- POST /api/cdt/visits (programmation) → BackgroundSync
- POST /api/cdt/visits/:id/report → BackgroundSync
- POST /api/cdt/visits/:id/photos (upload photos terrain)
- GET /api/cdt/visits/history
- POST /api/cdt/visits/:id/distribute (diffusion DTrav + DT + GED)

COMPOSANTS src/components/cdt/visites/
========================================
- UpcomingVisitsList.tsx (cards avec countdown)
- VisitCard.tsx (date badge + infos + actions)
- ScheduleVisitModal.tsx (création visite)
- VisitReportEditor.tsx ⚠️ rédaction CR avec photos
- ReservationsTracker.tsx (suivi réserves émises)
- RecentVisitsList.tsx (historique colorisé)

⚠️ RESPONSIVE
==============
- Cards visites : badge date 60×60 + infos + countdown à droite
- 2 boutons actions : flex 1 chacun mobile (Préparer / Contacter)
- Éditeur CR : textarea grande, upload photos batch

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt/visites
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt/visites --min=48

LIVRABLES
=========
- Code complet
- Test : Samuel programme visite géomètre TopoCAM demain 10h → notif Samuel
  reçue 9h
- Test : Samuel rédige CR visite BCT avec photo réserve Z3 → diffusé DTrav + DT
- Test offline : rédaction CR offline → queue → sync auto
- Audit responsive + tap targets OK
- Commit "feat(cdt): visites externes + compte-rendus — fn 1.5"
```

---

### PROMPT 1.6 — Réceptions techniques

```
Fonction 1.6 : préparation des points d'arrêt et jalons MOA.

PROTOTYPE HTML
==============
L'écran screen-cdt-receptions existe. Reproduire avec :
- Header "Réceptions techniques · jalons MOA · 5 jalons · 2 atteints · 1 prochain
  dans 12 jours"
- KPIs (Jalons atteints 2/5 vert, Prochain jalon J3, Délai vs contrat À temps +3j,
  Réserves ouvertes 1 rouge)
- Section "⏳ Prochain jalon · J3 dans 12 jours" : card border ambré gradient
  fond ambré, J3 levée réserves piles centrales, progress 75% préparation,
  2 boutons "📋 Checklist préparation" et "📂 DOE en cours"
- Liste "Tous les jalons contractuels" : 5 cards (J1 atteint vert, J2 atteint vert,
  J3 bientôt ambré, J4/J5 à venir gris)

CONTEXTE MÉTIER
================
Les jalons MOA sont les **points contractuels** du chantier. À chaque jalon :
- Réception technique par le MOA + BCT
- PV de réception signé (ou réserves)
- Encaissement de la retenue de garantie partielle si jalon validé
- Démarrage de la phase suivante

Préparation d'un jalon :
1. Finalisation des travaux de la phase
2. Auto-contrôles complets (fn 1.3)
3. Tests labo conformes (béton J+28, etc.)
4. Constitution du DOE (Dossier d'Ouvrage Exécuté) :
   - Plans conformes à l'exécution
   - PV des contrôles
   - Photos d'avancement
   - Notes de calcul si modifs
   - Tests labo
5. Programmation de la visite de réception
6. Réalisation de la réception + signature PV

API
===
- GET /api/cdt/milestones (5 jalons du chantier)
- GET /api/cdt/milestones/:id (détail avec checklist DOE)
- PATCH /api/cdt/milestones/:id/preparation (% avancement préparation)
- POST /api/cdt/milestones/:id/deliverables (cocher livrable préparé)
- POST /api/cdt/milestones/:id/schedule-reception (programmer date réception)
- POST /api/cdt/milestones/:id/reach (marquer atteint avec PV signé)
- GET /api/cdt/milestones/:id/doe-status (état du DOE)

COMPOSANTS src/components/cdt/receptions/
===========================================
- MilestonesKpis.tsx
- NextMilestoneCard.tsx ⚠️ CRITIQUE — card ambré gradient
- MilestonePreparationChecklist.tsx (livrables DOE)
- AllMilestonesList.tsx (5 cards colorisées selon statut)
- DoeAssemblyView.tsx (regroupement des pièces du DOE)
- ReceptionSchedulingModal.tsx

⚠️ RESPONSIVE
==============
- Cards jalons : avatar code 44×44 + infos + statut chip
- Card prochain jalon : structure verticale mobile, 2 boutons flex 50/50
- Checklist DOE : items 68px avec checkbox 32×32 tap target

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cdt/receptions
  pnpm exec tsx scripts/audit-tap-targets.ts /cdt/receptions --min=48

LIVRABLES
=========
- Code complet
- Test : Samuel ouvre J3 (prochain jalon) → checklist 8 livrables DOE, 6 cochés
  (75%), 2 restants (essais béton J+28 + PV ferraillage)
- Test : Samuel coche "PV ferraillage" comme préparé → préparation passe à 87%
- Test : Samuel programme réception J3 le 20/05 14h avec BCT + MOA → 
  notifications BCT + MOA + DTrav
- Audit responsive + tap targets OK
- Commit "feat(cdt): réceptions techniques + jalons + DOE — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil Conducteur de Travaux complet

Tu viens de couvrir l'**ensemble du profil Conducteur de Travaux** :
- Bloc 0 : extension PWA + 7 nouveaux models Prisma
- Bloc 1 : 6 fonctions (Tableau de bord, Plan du jour, Qualité, Sous-traitants,
  Visites, Réceptions)

**Total profil CondTrav : 6 fonctions livrées**

POINTS FORTS DE CE PROFIL
==========================
- Mobile-first absolu (48px tap, 16px font, items 68px)
- PWA offline réutilisant l'infrastructure CC/MAG
- Chaîne hiérarchique terrain complète : DTrav → CondTrav → CC → MAG
- Workflow plan du jour fluide : Samuel affecte → matières demandées Lucas →
  Jean fait exécuter → rapport production fin de journée
- Qualité technique tracée (auto-contrôles + tests labo) pour DOE
- Sous-traitants pointés et évalués (vue terrain alimentée vers DT siège)
- Visites externes documentées (BCT/géomètres/MOA) avec CR diffusés
- Réceptions techniques préparées en amont (checklist DOE)

ESTIMATION EFFORT
==================
- Bloc 0 (extension PWA + 7 models Prisma + bootstrap) : 2-3 jours
- Bloc 1 (6 fonctions) : 6-7 jours
- TOTAL : 8-10 jours (court car réutilisation infrastructure terrain)

PROCHAINE ÉTAPE
================
L'écosystème terrain Pont Mfoundi est désormais complet :
- DT (Daniel) supervise toute la production
- DTrav (Paul) pilote Pont Mfoundi + AEP Mbalmayo
- CondTrav (Samuel) coordonne quotidien Pont Mfoundi
- CC (Jean) supervise ouvriers
- MAG (Lucas) gère les flux matières

Profils restants à développer :
- **Logisticien** : vue siège des achats/flotte/fournisseurs (vs MAG vue chantier)
- **GED** : référent documentaire global
- **Informaticien d'entreprise** : admin technique tenant
- **Employé bureau · Ouvrier** : comptes basiques

Mon ordre recommandé : **Logisticien** ensuite (complète la chaîne approvisionnements
côté siège, complémentaire au MAG chantier).
