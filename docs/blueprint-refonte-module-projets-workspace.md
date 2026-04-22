# Blueprint Sprintable - Refonte incrémentale du module Projets

Date: 2026-04-10
Portée: frontend + backend + QA, sans rupture des fonctionnalités existantes.
Contrainte majeure: migration progressive, pas de big bang.

## 1) Objectif produit cible

Créer un espace projet autonome, navigable par URL, autour de deux niveaux:

- Portefeuille: /app/projects
- Workspace projet: /app/projects/:projectId/*

Le workspace doit rester compatible avec les API actuelles et offrir une UX responsive/mobile claire pour terrain, coordination et pilotage.

## 2) Routing cible (frontend)

### 2.1 Routes à ajouter

- /app/projects
- /app/projects/:projectId
- /app/projects/:projectId/overview
- /app/projects/:projectId/team
- /app/projects/:projectId/planning
- /app/projects/:projectId/reports
- /app/projects/:projectId/risks
- /app/projects/:projectId/finance
- /app/projects/:projectId/documents
- /app/projects/:projectId/budget

### 2.2 Stratégie de compatibilité

- Conserver la route actuelle /app/projects pendant la migration.
- Introduire une redirection progressive:
  - /app/projects/:projectId -> /app/projects/:projectId/overview
- Garder la logique role-based existante (ouvrier, assistant administratif, gestionnaire) en façade.

## 3) Architecture composants cible (frontend)

## 3.1 Arborescence recommandée

frontend/src/features/projects/
- pages/
  - ProjectsPortfolioPage.jsx
  - ProjectWorkspaceLayout.jsx
- tabs/
  - ProjectOverviewTab.jsx
  - ProjectTeamTab.jsx
  - ProjectPlanningTab.jsx
  - ProjectReportsTab.jsx
  - ProjectRisksTab.jsx
  - ProjectFinanceTab.jsx
  - ProjectDocumentsTab.jsx
  - ProjectBudgetTab.jsx
- components/
  - ProjectHeader.jsx
  - ProjectContextSwitcher.jsx
  - ProjectKpiStrip.jsx
  - ProjectAlertList.jsx
  - ProjectSectionSkeleton.jsx
- hooks/
  - useProjectContext.js
  - useProjectWorkspaceData.js
  - useProjectMutations.js
- adapters/
  - projectWorkspaceAdapter.js
- index.js

### 3.2 Responsabilités

- ProjectsPortfolioPage:
  - Liste projets, filtres, tri, KPI portefeuille, sélection projet.
- ProjectWorkspaceLayout:
  - Header projet, onglets, état global de chargement, gestion d’erreur par section.
- Tabs:
  - Une responsabilité métier par onglet.
  - Chargement lazy section par section.
- Hooks:
  - Isolation des appels API et de la normalisation des payloads.

## 4) Contrat de données et stratégie API

## 4.1 API à conserver (compat)

- GET /projects
- GET /projects/dashboard
- GET /projects/:projectId/workspace
- POST/PATCH domaines existants (tasks, assignments, reports, risks, docs, budgets)

## 4.2 API optionnelles à introduire (perf)

Phase 2 ou 3 seulement, si volumétrie:

- GET /projects/:projectId/workspace/overview
- GET /projects/:projectId/workspace/team
- GET /projects/:projectId/workspace/planning
- GET /projects/:projectId/workspace/finance
- GET /projects/:projectId/workspace/documents

Règle: tant qu’elles n’existent pas, fallback automatique sur GET /workspace agrégé.

## 4.3 Mapping front

- Adapter unique projectWorkspaceAdapter:
  - Normalise champs manquants
  - Gère null safety
  - Prépare objets UI homogènes pour tous les rôles

## 5) Rôles et expérience utilisateur

## 5.1 Matrice d’accès

- Ouvrier (projects.read sans manage):
  - Portfolio simplifié + tabs limitées: overview, planning (mes tâches), documents.
- Assistant administratif (projects.read sans manage):
  - Portfolio administratif + tabs: overview, finance, documents, team.
- Gestionnaires (projects.manage):
  - Accès complet tous onglets + formulaires création/édition.

## 5.2 Règles UX

- Les actions interdites ne doivent jamais apparaître comme CTA actifs.
- Les sections non autorisées: hidden by design (pas seulement disabled).

## 6) Responsive by design

## 6.1 Breakpoints et comportement

- Mobile <= 768:
  - Header compact, onglets scroll horizontal, cartes empilées.
  - Priorité: alertes, tâches, échéances.
- Tablet 769-1024:
  - Grilles 2 colonnes max.
- Desktop > 1024:
  - Pleine densité avec panneaux latéraux contextuels.

## 6.2 Performance UX

- Skeleton par section.
- Chargement différé par onglet.
- Revalidation ciblée après mutation (éviter refetch global systématique).

## 7) Internationalisation FR/EN

## 7.1 Standardisation

- Supprimer COPY local des pages rôles au profit des locales i18n.
- Namespace clés recommandées:
  - pages.projects.portfolio.*
  - pages.projects.workspace.*
  - pages.projects.tabs.overview.*
  - pages.projects.tabs.team.*
  - pages.projects.tabs.planning.*
  - pages.projects.tabs.finance.*
  - pages.projects.tabs.documents.*
  - pages.projects.tabs.budget.*

## 7.2 Cohérence terminologique

- FR/EN validés pour lexique BTP:
  - chantier/site
  - avenant/change order
  - marché/tender contract
  - budget consommé/budget consumed

## 8) Plan d’implémentation par sprint (exécutable)

## Sprint A - Fondation routing + layout

Livrables:
- Routes imbriquées ajoutées.
- ProjectWorkspaceLayout + ProjectHeader créés.
- Compatibilité route historique conservée.

Critères d’acceptation:
- Navigation /app/projects -> /app/projects/:id/overview fonctionnelle.
- Aucun test backend cassé.

## Sprint B - Extraction portfolio

Livrables:
- ProjectsPortfolioPage extraite de la page monolithique.
- Sélection projet pilotée par URL.

Critères d’acceptation:
- Liste et KPI portefeuille identiques à avant.
- Sélection projet persistante au refresh.

## Sprint C - Tabs Team + Planning

Livrables:
- Extraction des blocs affectations + tâches.
- Mutations encapsulées dans useProjectMutations.

Critères d’acceptation:
- Création affectation et tâche OK.
- Statut tâche modifiable sans régression dashboard.

## Sprint D - Tabs Reports + Risks + Documents

Livrables:
- Extraction complète des sections.
- Alertes projet visibles en overview.

Critères d’acceptation:
- Flux création report/risk/document inchangé.
- Données workspace cohérentes après mutation.

## Sprint E - Tabs Finance + Budget

Livrables:
- Extraction finance/budget.
- Préparation pagination et lazy loading.

Critères d’acceptation:
- KPI financiers cohérents avec dashboard.
- Budget lines création et affichage inchangés.

## Sprint F - i18n + responsive hardening

Livrables:
- COPY local supprimé, clés FR/EN complètes.
- Ajustements mobile/tablet sur toutes les tabs.

Critères d’acceptation:
- 0 chaîne hardcodée restante dans pages projets.
- Audit UI mobile validé pour parcours principaux.

## Sprint G - optimisation backend optionnelle

Livrables:
- Endpoints sectionnels ajoutés si besoin mesuré.
- Fallback maintenu vers endpoint agrégé.

Critères d’acceptation:
- Diminution temps moyen de chargement workspace.
- Pas de régression contractuelle API existante.

## 9) Stratégie QA minimale obligatoire

Frontend:
- tests de navigation portfolio -> workspace -> tabs
- tests rôle ouvrier / assistant / manager
- tests mutation critique (task status, assignment create, budget line create)

Backend:
- tests scope multi-tenant
- tests permissions read/manage
- tests intégration workspace + dashboard après mutations

## 10) Dette technique ciblée à traiter en parallèle

- Réduire couplage entre état formulaires et état de sélection projet.
- Éliminer refetch massif au profit de revalidation par slice.
- Ajouter métriques de perf front (temps de rendu tab, temps de fetch workspace).

## 11) Définition de done globale

- Le module est découpé en pages/tabs lisibles.
- Le workspace projet est navigable par URL et bookmarkable.
- Le responsive mobile/tablet est stable.
- FR/EN est unifié via i18n.
- Les endpoints historiques restent supportés.
- Les tests de non-régression passent.
