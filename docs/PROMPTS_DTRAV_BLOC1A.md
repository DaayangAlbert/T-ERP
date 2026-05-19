# DTRAV · DÉVELOPPEMENT — Bloc 0 (Préambule) + Bloc 1 partie A (fonctions 1.1 à 1.4)

**Profil cible :** Directeur de Travaux (Paul ETOUNDI · BatimCAM SA)

**Spécificité :** profil **terrain mobile-first**. Paul ETOUNDI gère **1 à 3 chantiers
en parallèle** (BatimCAM : Pont Mfoundi + AEP Mbalmayo). Il consulte l'ERP depuis le
terrain en mobilité, souvent en 3G mauvaise.

**Architecture RBAC** : utilise le `User.assignedSiteIds[]` mis en place pour le
Comptable. Le DTrav voit uniquement ses chantiers assignés.

---

## ⚠️ PROTOCOLE RESPONSIVE MOBILE-FIRST RENFORCÉ

Standard responsive habituel (7 tailles) + **règles supplémentaires** pour ce profil :

1. **Tap targets ≥ 40px** sur tous les boutons mobile
2. **Sidebar items ≥ 44px** (parcours fréquent terrain)
3. **Items cliquables (alertes, BC, documents) ≥ 56px**
4. **Sélecteur de chantier sticky en haut** sur tous les écrans
5. **CTAs principaux accessibles au pouce** (haut ou bottom sheet sticky)

Avant chaque commit :
```bash
pnpm exec tsx scripts/audit-responsive.ts /dtrav/<route>
pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/<route>  # nouveau, voir ci-dessous
```

Format commit obligatoire : "✅ Audit responsive : 7/7 tailles OK · tap targets 40px+"

---

## 🟪 PROMPT 0 — PRÉAMBULE DTRAV

```
Phase de développement du profil Directeur de Travaux (Paul ETOUNDI).

CONTEXTE
========
- Le RBAC double rôle est déjà en place via User.assignedSiteIds[] (Comptable précédemment)
- Le prototype HTML contient 7 écrans Espace DTrav :
  screen-dtrav-dashboard, screen-dtrav-production, screen-dtrav-equipe,
  screen-dtrav-planning, screen-dtrav-marche, screen-dtrav-appros,
  screen-dtrav-documents
- Tous ont l'attribut data-dtrav-screen qui active les règles CSS mobile-first
- Paul ETOUNDI est assigné à 2 chantiers : Pont Mfoundi (CHT-2025-031) + AEP Mbalmayo

CONVENTIONS
============
- Écrans prototype : id="screen-dtrav-<fonction>"
- Pages Next.js : src/app/(app)/dtrav/<fonction>/page.tsx
- Composants : src/components/dtrav/<NomFonction>.tsx
- API routes : src/app/api/dtrav/<fonction>/route.ts
- Hooks : src/hooks/useDtrav<Fonction>.ts
- Toutes les pages DTrav ont les attributs data-rh-screen ET data-dtrav-screen

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role (si pas déjà fait) :
   enum Role {
     ...
     DIRECTOR_OF_WORKS  // Directeur de Travaux
   }

2. Le DTrav utilise User.assignedSiteIds (déjà créé pour Comptable).
   Pour Paul ETOUNDI : assignedSiteIds = ["pont-mfoundi-id", "aep-mbalmayo-id"]

3. Créer le layout dédié src/app/(app)/dtrav/layout.tsx :
   - Vérifie Role.DIRECTOR_OF_WORKS (sinon redirect /dashboard)
   - Charge la liste des chantiers du DTrav via /api/dtrav/sites
   - Stocke le chantier actif dans le contexte React (localStorage pour persistance)
   - Affiche le sélecteur de chantier sticky en haut
   - Wrap children dans <div data-dtrav-screen data-rh-screen className="rh-page">

4. Créer le ChantierContext (state management du chantier actif) :
   src/contexts/ChantierContext.tsx :
   - activeChantierId : id du chantier actif
   - availableChantiers : liste des chantiers assignés
   - switchChantier(id) : change le chantier actif + persiste localStorage

5. Créer le composant SiteSwitcher.tsx :
   - Bandeau gradient violet sticky en haut
   - Affiche le chantier actif avec code CHT
   - Bouton "Changer chantier" + chips quick-switch si ≤ 3 chantiers
   - Si > 3 chantiers : drawer mobile avec liste complète + recherche

6. Créer le script audit-tap-targets.ts :
   - Vérifie que tous les boutons mobile font ≥ 40px de hauteur
   - Vérifie que les items sidebar font ≥ 44px
   - Vérifie que les items cliquables font ≥ 56px
   - Exit 1 si non conforme

LIVRABLES
=========
- Layout DTrav protégé par rôle, fonctionnel avec ChantierContext
- SiteSwitcher visible et fonctionnel sur tous les écrans DTrav
- Bascule entre Pont Mfoundi et AEP Mbalmayo en 1 tap
- Script audit-tap-targets.ts opérationnel
- Test : connexion Paul ETOUNDI → voit ses 2 chantiers, basculement fonctionnel
- Test : tentative d'accès URL Lotissement Odza (non assigné) → 403
- Audit responsive 7/7 OK sur /dtrav (vide)
- Audit tap targets OK sur mobile
- Commit "chore(dtrav): bootstrap espace DTrav + ChantierContext + mobile-first"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 PARTIE A — Espace DTrav (fonctions 1.1 à 1.4)

### PROMPT 1.1 — Tableau de bord chantier

```
Fonction 1.1 : tableau de bord chantier (point d'entrée DTrav).

PROTOTYPE HTML
==============
L'écran screen-dtrav-dashboard existe dans le prototype. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Sélecteur de chantier sticky en haut (SiteSwitcher.tsx du Bloc 0)
- Bandeau d'état chantier (4 indicateurs) : avancement physique 78%, financier
  68%, marge réelle 6,0% en rouge, météo locale temps réel
- KPIs jour : présents 68/74 (92%), production 3,8M FCFA, stocks 12,4M + 3
  ruptures, 4 validations en attente
- 5 alertes chantier hiérarchisées (aléas géotechniques, rupture ciment, rapport
  journalier à valider, CACES expirant, réunion MOA)
- Section "Phase en cours" avec barre de progression et tâches actives
- Timeline "Activité du jour" (pointage, livraison, visite BCT, réunion technique)

PRISMA
======
   model SiteDailyReport {
     id              String   @id @default(cuid())
     siteId          String
     site            Site     @relation(fields: [siteId], references: [id])
     reportDate      DateTime
     submittedById   String   // chef de chantier
     workforcePresent Int
     workforcePlanned Int
     normalHours     Float
     overtimeHours   Float
     justifiedAbsences Int
     productionValue BigInt   // valeur produite en FCFA
     consumedMaterials Json   // [{ articleId, quantity, unit }]
     tasksCompleted  Json     // [{ task, quantity, unit, value }]
     incidents       String?  @db.Text
     photos          String[]
     status          DailyReportStatus
     validatedAt     DateTime?
     validatedBy     String?
   }
   enum DailyReportStatus { DRAFT SUBMITTED VALIDATED REJECTED }

   model SiteAlert {  // déjà créé côté DT, étendre
     ...
     priority    AlertPriority  // pour affichage hiérarchisé
     actionUrl   String?        // lien direct vers la résolution
     actionLabel String?        // libellé du bouton CTA
   }

API
===
- GET /api/dtrav/sites (chantiers assignés à l'utilisateur)
- GET /api/dtrav/sites/:siteId/dashboard
- GET /api/dtrav/sites/:siteId/weather (intégration OpenWeather pour météo locale)
- GET /api/dtrav/sites/:siteId/alerts
- GET /api/dtrav/sites/:siteId/today-activity (timeline)

⚠️ RBAC CRITIQUE
=================
Toutes les API DTrav doivent appliquer getAccessibleSiteIds(userId).
Si le siteId demandé n'est pas dans assignedSiteIds → 403 Forbidden.

COMPOSANTS src/components/dtrav/dashboard/
============================================
- SiteSwitcher.tsx (sticky en haut, chips quick-switch ≤3 chantiers)
- SiteStateBanner.tsx (4 indicateurs : avancement physique/financier, marge, météo)
- DtravKpiRow.tsx
- SiteAlertsList.tsx (avec barres colorées + CTAs tap-friendly 44px)
- CurrentPhaseCard.tsx
- TodayActivityTimeline.tsx

⚠️ RESPONSIVE MOBILE-FIRST
===========================
- Bandeau état chantier : 4 col → 2x2 → 1 col selon breakpoint
- Sélecteur chantier : padding réduit mobile mais reste sticky
- KPIs : 4 col → 2x2 → 1 col
- Alertes : min-height 56px sur mobile pour tap confortable
- CTAs alertes : bouton pleine largeur sur mobile, à droite desktop

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav

LIVRABLES
=========
- Code complet
- Test : Paul connecté sur Pont Mfoundi → cockpit complet, bascule vers AEP Mbalmayo
  en 1 tap → cockpit AEP s'affiche
- Test RBAC : Paul tente d'accéder à /dtrav/sites/lotissement-odza/dashboard → 403
- Audit responsive 7/7 OK + tap targets OK
- Commit "feat(dtrav): tableau de bord chantier + SiteSwitcher — fn 1.1
   ✅ Audit responsive : 7/7 · tap targets 40px+"
```

---

### PROMPT 1.2 — Production journalière

```
Fonction 1.2 : saisie/validation rapports journaliers.

PROTOTYPE HTML
==============
L'écran screen-dtrav-production existe. Reproduire avec :
- KPIs (production jour, cumul mois, rapports à valider, taux production planifié)
- Card rapport du jour à valider très détaillée :
  pointage équipe, production réalisée avec tableau tâches/quantités/valeur,
  consommations matières, incidents BCT, boutons valider/refuser/voir photos
- Historique 30 derniers rapports

WORKFLOW MÉTIER
================
Workflow type : chef de chantier (Jean KAMGA) saisit rapport → DTrav (Paul ETOUNDI)
valide → transmission auto au DT pour reporting

Tâches du DTrav sur cette fonction :
- Valider les rapports journaliers (1 par jour ouvré)
- Demander correction si incohérence
- Consulter les photos terrain prises par le chef de chantier
- Suivre l'écart production réelle vs planifiée

API
===
- GET /api/dtrav/sites/:siteId/daily-reports
- GET /api/dtrav/sites/:siteId/daily-reports/:reportId
- POST /api/dtrav/daily-reports/:id/validate (valide le rapport, push vers DT)
- POST /api/dtrav/daily-reports/:id/reject (motif obligatoire, retour à J. KAMGA)
- GET /api/dtrav/sites/:siteId/production-history?from=&to=

COMPOSANTS src/components/dtrav/production/
=============================================
- ProductionKpis.tsx
- DailyReportCard.tsx ⚠️ DENSE — beaucoup d'informations à organiser
- WorkforceSummary.tsx (présents/heures/absences)
- ProductionTable.tsx (tâches réalisées + total jour)
- MaterialsConsumptionList.tsx (chips ciment/acier/gasoil/etc.)
- IncidentsBox.tsx (réserves BCT, accidents, événements)
- PhotosGalleryDrawer.tsx (12 photos en lightbox tactile)
- ValidationActions.tsx (3 boutons 44px : valider / refuser / voir photos)

⚠️ RESPONSIVE
==============
- Card rapport : très dense → sections empilées verticalement mobile
- Tableau production : 4 cols → cards par tâche sur mobile
- Galerie photos : grille 4 cols desktop → 2 cols mobile
- Bouton "Valider le rapport" : sticky bottom sur mobile (CTA principal)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/production
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/production

LIVRABLES
=========
- Code complet
- Test : J. KAMGA soumet rapport 10/05 → notif push à Paul → Paul valide depuis
  son téléphone → rapport passe en VALIDATED → notif au DT
- Test : Paul refuse rapport avec motif "consommation gasoil incohérente" →
  retour à J. KAMGA avec commentaire
- Audit responsive + tap targets OK
- Commit "feat(dtrav): production journalière + validation rapports — fn 1.2"
```

---

### PROMPT 1.3 — Équipe chantier

```
Fonction 1.3 : organigramme et pointage des équipes chantier.

PROTOTYPE HTML
==============
L'écran screen-dtrav-equipe existe. Reproduire avec :
- KPIs équipe (effectif total, présents jour, heures sup semaine, recyclages
  CACES expirant)
- **Organigramme visuel hiérarchique 4 niveaux** :
  DTrav (moi) → Conducteur travaux → Chef chantier + Magasinier
- Tableau 6 équipes ouvrières avec chef, effectif, présents, tâche en cours, état

CONTEXTE MÉTIER
================
Le DTrav voit son équipe étendue (74 personnes au total : 2 cadres + 4 ETAM + 18 OQ
+ 22 OS + 28 journaliers + 6 sous-traitants). Il doit pouvoir :
- Consulter l'organigramme de proximité
- Suivre la présence et les heures sup
- Anticiper les recyclages obligatoires (CACES, SST)
- Demander un renfort si sous-effectif (équipe terrassement 6/8 par exemple)

PRISMA
======
   model SiteWorkforceMember {
     id          String   @id @default(cuid())
     siteId      String
     userId      String
     role        WorkforceRole
     reportsToId String?  // référence au superviseur hiérarchique
     teamName    String?  // "Coffrage Nord", "Ferraillage", etc.
     isLeader    Boolean  @default(false)
     startedAt   DateTime
     endedAt     DateTime?
   }
   enum WorkforceRole { DIRECTOR_WORKS SITE_MANAGER FOREMAN WAREHOUSE TEAM_LEADER WORKER SUBCONTRACTOR }

   model SiteTeam {
     id          String   @id @default(cuid())
     siteId      String
     name        String
     specialty   CrewSpecialty  // déjà créé côté DT
     leaderId    String
     currentTaskId String?
     headcount   Int
   }

API
===
- GET /api/dtrav/sites/:siteId/workforce/hierarchy (organigramme)
- GET /api/dtrav/sites/:siteId/workforce/teams (équipes ouvrières)
- GET /api/dtrav/sites/:siteId/workforce/presence?date=
- GET /api/dtrav/sites/:siteId/workforce/overtime-week
- GET /api/dtrav/sites/:siteId/workforce/certifications-expiring
- POST /api/dtrav/sites/:siteId/workforce/request-reinforcement (vers DT)

COMPOSANTS src/components/dtrav/equipe/
=========================================
- TeamKpis.tsx
- HierarchyOrganigram.tsx (cards hiérarchiques avec indentation)
- TeamsTable.tsx ⚠️ RESPONSIVE
- ReinforcementRequestModal.tsx (escalade vers DT)
- CertificationsExpiringList.tsx

⚠️ RESPONSIVE
==============
- Organigramme : cards empilées avec indentation décroissante mobile (16px à
  chaque niveau au lieu de 48px)
- Tableau équipes : cards mobile avec présents en couleur (vert/orange/rouge)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/equipe
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/equipe

LIVRABLES
=========
- Code complet
- Test : organigramme Pont Mfoundi affiche bien Paul → Samuel → Jean + Lucas
- Test : tableau équipes affiche équipe terrassement en sous-effectif (orange 6/8)
- Test : Paul demande renfort 4 ouvriers terrassement → escalade DT → notif RH
- Audit responsive + tap targets OK
- Commit "feat(dtrav): équipe chantier + organigramme + demande renforts — fn 1.3"
```

---

### PROMPT 1.4 — Planning chantier détaillé

```
Fonction 1.4 : Gantt et phasage détaillé du chantier.

PROTOTYPE HTML
==============
L'écran screen-dtrav-planning existe. Reproduire avec :
- KPIs planning (avancement 78%, retard 8j, jalon prochain J+12, livraison J+52)
- 4 phases visuelles avec barres de progression colorisées
- Tableau jalons contractuels MOA (5 jalons : J1 fondations à J5 réception)

CONTEXTE MÉTIER
================
Le planning détaillé est issu du planning type cloné depuis la bibliothèque DT
(fn 1.5 DT Méthodes). Le DTrav peut :
- Consulter le planning et les phases
- Mettre à jour l'avancement réel des tâches
- Anticiper les retards et alerter le DT
- Préparer les jalons contractuels MOA

PRISMA
======
   model SitePlanning {
     id          String   @id @default(cuid())
     siteId      String   @unique
     site        Site     @relation(fields: [siteId], references: [id])
     templateId  String?  // si cloné depuis TemplatePlanning
     totalDurationDays Int
     phases      SitePhase[]
     milestones  SiteMilestone[]
   }

   model SitePhase {
     id          String   @id @default(cuid())
     planningId  String
     planning    SitePlanning @relation(fields: [planningId], references: [id])
     orderIndex  Int
     name        String
     plannedStart DateTime
     plannedEnd  DateTime
     actualStart DateTime?
     actualEnd   DateTime?
     progressPercent Float @default(0)
     status      PhaseStatus
     tasks       SiteTask[]
   }
   enum PhaseStatus { PLANNED IN_PROGRESS COMPLETED DELAYED CANCELLED }

   model SiteTask {
     id          String   @id @default(cuid())
     phaseId     String
     phase       SitePhase @relation(fields: [phaseId], references: [id])
     name        String
     plannedStart DateTime
     plannedEnd  DateTime
     actualStart DateTime?
     actualEnd   DateTime?
     progressPercent Float @default(0)
     dependsOnIds String[] @default([])
     assignedTeamId String?
   }

   model SiteMilestone {
     id          String   @id @default(cuid())
     planningId  String
     planning    SitePlanning @relation(fields: [planningId], references: [id])
     code        String   // "J1", "J2", ...
     description String
     contractDueDate DateTime
     forecastDate DateTime?
     actualDate  DateTime?
     status      MilestoneStatus
     moaValidation Boolean @default(false)
   }
   enum MilestoneStatus { UPCOMING REACHED LATE MOA_VALIDATED MISSED }

API
===
- GET /api/dtrav/sites/:siteId/planning
- GET /api/dtrav/sites/:siteId/planning/phases
- PATCH /api/dtrav/planning/phases/:id (mise à jour avancement)
- POST /api/dtrav/planning/tasks (ajouter tâche)
- GET /api/dtrav/sites/:siteId/planning/milestones
- POST /api/dtrav/planning/milestones/:id/reach (marquer atteint)

COMPOSANTS src/components/dtrav/planning/
===========================================
- PlanningKpis.tsx
- PhasesAccordion.tsx (4 phases avec barres de progression)
- GanttChart.tsx (vue Gantt complète desktop, vue liste mobile)
- MilestonesTable.tsx ⚠️ RESPONSIVE
- ProgressUpdateModal.tsx (saisir avancement % d'une tâche)

⚠️ RESPONSIVE
==============
- Vue Gantt desktop : timeline horizontale avec dates en X et phases en Y
- Vue Gantt mobile : impossible à rendre fidèlement → bascule en accordion phases
  + liste tâches par phase
- Jalons : tableau classique desktop → cards mobile avec état coloré proéminent

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/planning
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/planning

LIVRABLES
=========
- Code complet
- Test : Paul met à jour avancement phase "Gros œuvre" 82% → 85% → KPI dashboard
  mis à jour, alerte DT si écart vs prévu > 5%
- Test : Paul atteint jalon J3 (levée réserves piles) → notif MOA → comptable
  peut émettre situation
- Audit responsive + tap targets OK
- Commit "feat(dtrav): planning détaillé + phases + jalons MOA — fn 1.4"
```

---

## ✅ FIN BLOC 1 PARTIE A

Fonctions 1.1 à 1.4 livrées. Demande la partie B :
"Bloc 1 DTrav partie A terminé. Tu peux me livrer la partie B."

La partie B couvrira les 3 fonctions restantes :
- 1.5 Suivi marché et avenants
- 1.6 Approvisionnements chantier
- 1.7 Documents chantier
