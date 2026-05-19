# GED (RÉFÉRENT DOCUMENTAIRE) · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Documentaliste-Archiviste (Christelle EYENGA · siège BatimCAM,
rattachée à la DG)

**Position hiérarchique :** rapporte à la DG (Albert DAAYANG). Profil **transverse**
qui structure la documentation de toute l'entreprise (14 280 documents actifs,
142 Go, 28 espaces documentaires sur 23 chantiers + 5 espaces transverses).

**Spécificité RBAC** : `role: ARCHIVIST` avec flag spécial `canReadAllDocuments: true`
**SAUF** documents les plus confidentiels (paie individuelle BS_, contentieux RH).
C'est l'unique profil qui transcende `assignedSiteIds[]`.

**Pas de PWA** : profil bureau au siège, consultation en ligne uniquement.
Responsive standard (40-44px tap targets).

---

## ⚠️ PROTOCOLE RESPONSIVE

Tap targets standards desktop. Tableaux denses acceptés (cible audit).

```bash
pnpm exec tsx scripts/audit-responsive.ts /ged/<route>
```

Format commit : "✅ Audit : 7/7 responsive OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE GED

```
Phase de développement du profil Référent Documentaire / GED (Christelle EYENGA).

CONTEXTE
========
- Le prototype HTML contient 6 écrans Espace GED :
  screen-ged-dashboard, screen-ged-espaces, screen-ged-workflows,
  screen-ged-nomenclature, screen-ged-recherche, screen-ged-audit
- Tous ont les attributs data-rh-screen + data-ged-screen
- Christelle EYENGA a role=ARCHIVIST + canReadAllDocuments=true
- assignedSiteIds=[] (vue globale)
- Elle rapporte au DG (Albert DAAYANG)
- Profil TRANSVERSE : lit tous les documents (Document, Plan, Contract, Photo,
  BC, Invoice, Payslip*, etc.) mais ne possède pas de model métier propre.
  *Sauf bulletins de paie individuels et dossiers contentieux RH.

CONVENTIONS
============
- Écrans prototype : id="screen-ged-<fonction>"
- Pages Next.js : src/app/(app)/ged/<fonction>/page.tsx
- Composants : src/components/ged/<NomFonction>.tsx
- API routes : src/app/api/ged/<fonction>/route.ts
- Hooks : src/hooks/useGed<Fonction>.ts

DIFFÉRENCES STRUCTURELLES VS AUTRES PROFILS
============================================
| Aspect | Profils métier | GED (Christelle) |
|--------|---------------|------------------|
| Production de docs | Oui (BC, plans, paie) | Non (orchestre uniquement) |
| Modèles métier propres | Oui (Site, Employee, BC...) | Non (uses des autres) |
| Vue documents | Selon son périmètre | TOUS sauf confidentiels |
| Workflows | Subit/exécute | DÉFINIT et SUPERVISE |
| Politique rétention | Suit | DÉCIDE |
| Audit conformité | Audité | AUDITEUR |

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     ARCHIVIST
   }

2. Étendre le User model :
   model User {
     ...
     canReadAllDocuments Boolean @default(false)  // ARCHIVIST only
   }

3. Créer le layout dédié src/app/(app)/ged/layout.tsx :
   - Vérifie Role.ARCHIVIST (sinon redirect /dashboard)
   - Charge le DocumentRegistryContext
   - Wrap children dans <div data-ged-screen data-rh-screen className="rh-page">

4. Étendre Prisma — 6 nouveaux models GED :

   model DocumentSpace {
     id              String   @id @default(cuid())
     tenantId        String
     code            String   // "MARCHES", "RH", "SITE_PONT_MFOUNDI"
     name            String
     description     String?
     icon            String?  // emoji
     responsibleId   String?  // User
     responsible     User?    @relation(fields: [responsibleId], references: [id])
     siteId          String?  // si espace = espace chantier
     site            Site?    @relation(fields: [siteId], references: [id])
     spaceType       SpaceType
     confidentiality Confidentiality
     active          Boolean  @default(true)
     classifications DocumentClassification[]
     documents       Document[]
     @@unique([tenantId, code])
   }
   enum SpaceType { CONSTRUCTION_SITE MARKETS_CONTRACTS HR ACCOUNTING LEGAL QSE OTHER }
   enum Confidentiality { PUBLIC INTERNAL RESTRICTED CONFIDENTIAL }

   model DocumentClassification {
     id              String   @id @default(cuid())
     tenantId        String
     prefix          String   // "CTR", "PEX", "BS_", "AVE"
     code            String   // "CONTRAT_MARCHE", "PLAN_EXECUTION"
     name            String   // "Contrat marché travaux"
     category        ClassificationCategory
     dua             String   // "10 ans", "5 ans", "+5 ans après départ", "Permanente"
     duaYears        Int?     // valeur numérique pour calculs
     duaTrigger      DuaTrigger
     confidentiality Confidentiality
     workflowId      String?  // si workflow obligatoire
     workflow        DocumentWorkflowTemplate? @relation(fields: [workflowId], references: [id])
     requiredValidators String[]  // rôles requis
     active          Boolean  @default(true)
     @@unique([tenantId, prefix])
   }
   enum ClassificationCategory { MARKETS TECHNICAL HR ACCOUNTING LEGAL QSE OTHER }
   enum DuaTrigger { CREATION_DATE END_OF_FISCAL_YEAR EMPLOYEE_DEPARTURE PROJECT_CLOSURE OTHER }

   model DocumentWorkflowTemplate {
     id          String   @id @default(cuid())
     tenantId    String
     code        String   // "WF-PLAN-V3", "WF-AVENANT"
     name        String
     description String?
     steps       Json     // [{ stepIndex, name, role, mandatory, slaHours }]
     active      Boolean  @default(true)
     @@unique([tenantId, code])
   }

   model DocumentWorkflowInstance {
     id              String   @id @default(cuid())
     reference       String   @unique  // "WF-2026-0142"
     templateId      String
     template        DocumentWorkflowTemplate @relation(fields: [templateId], references: [id])
     documentId      String
     document        Document @relation(fields: [documentId], references: [id])
     status          WorkflowStatus
     currentStep     Int      @default(0)
     initiatorId     String   // User
     startedAt       DateTime @default(now())
     dueAt           DateTime?
     completedAt     DateTime?
     steps           DocumentWorkflowStep[]
   }
   enum WorkflowStatus { IN_PROGRESS COMPLETED REJECTED CANCELLED OVERDUE }

   model DocumentWorkflowStep {
     id          String   @id @default(cuid())
     instanceId  String
     instance    DocumentWorkflowInstance @relation(fields: [instanceId], references: [id])
     stepIndex   Int
     stepName    String
     assignedTo  String   // User
     status      StepStatus
     decidedAt   DateTime?
     comment     String?  @db.Text
     @@unique([instanceId, stepIndex])
   }
   enum StepStatus { PENDING APPROVED REJECTED SKIPPED }

   model DocumentRetentionRecord {
     id              String   @id @default(cuid())
     documentId      String
     document        Document @relation(fields: [documentId], references: [id])
     duaEndDate      DateTime  // date calculée fin de DUA
     archivalStatus  ArchivalStatus
     archivedAt      DateTime?
     destroyedAt     DateTime?
     destructionPv   String?   // référence PV destruction
     legalHold       Boolean   @default(false)  // bloqué (contentieux, audit)
   }
   enum ArchivalStatus { ACTIVE SEMI_ACTIVE FINAL_ARCHIVE PENDING_DESTRUCTION DESTROYED }

   model DocumentAccessRequest {
     id              String   @id @default(cuid())
     requesterId     String
     requester       User     @relation(fields: [requesterId], references: [id])
     documentId      String
     document        Document @relation(fields: [documentId], references: [id])
     reason          String   @db.Text
     status          AccessStatus
     decidedBy       String?  // ARCHIVIST
     decidedAt       DateTime?
     decisionNotes   String?
     requestedAt     DateTime @default(now())
   }
   enum AccessStatus { PENDING APPROVED DENIED EXPIRED }

5. ÉTENDRE le model Document existant :
   model Document {
     ...
     spaceId             String?
     space               DocumentSpace? @relation(fields: [spaceId], references: [id])
     classificationId    String?
     classification      DocumentClassification? @relation(fields: [classificationId], references: [id])
     internalReference   String?  @unique  // "PEX-2026-0142"
     workflowInstances   DocumentWorkflowInstance[]
     retentionRecord     DocumentRetentionRecord?
     accessRequests      DocumentAccessRequest[]
   }

6. SEED nomenclature initiale BatimCAM (72 types) :
   - Marchés (14) : CTR, AVE, CON, BCC, CSC, ...
   - Techniques (18) : PEX, DOE, PVR, PVB, CR_, LAB, ...
   - RH (12) : CDT, BS_, EVA, POL, ...
   - Comptables (16) : FAC, AVO, BIL, DEC, ...
   - Juridiques (8) : STA, AG_, RC_, ...
   - QSE (4) : QSE, ENV, SEC, FOR

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 6 nouveaux models GED
- Document étendu avec liens space, classification, workflows, retention
- Layout GED protégé par rôle ARCHIVIST
- Logique RBAC : canReadAllDocuments = lecture étendue (sauf BS_ + contentieux RH)
- Seed : 28 DocumentSpace (5 transverses + 23 chantiers)
- Seed : 72 DocumentClassification avec DUA/confidentialité/workflows
- Seed : 8 DocumentWorkflowTemplate (WF-MARCHE-V2, WF-PLAN-V3, WF-PVR, etc.)
- Seed : 12 DocumentWorkflowInstance en cours + 142 finalisés YTD
- Seed : 14 280 documents historiques avec retention records
- Seed : Christelle EYENGA christelle@batimcam.cm / Demo2026!
- Test : Christelle se connecte → voit dashboard GED avec 28 espaces
- Test RBAC : Christelle accède /ged/* OK, tente /dg → 403,
  tente lecture BS_2026_albert → 403
- Audit responsive 7/7 OK
- Commit "chore(ged): bootstrap GED + 6 models + nomenclature 72 types"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 6 fonctions Espace GED

### PROMPT 1.1 — Tableau de bord GED

```
Fonction 1.1 : tableau de bord référent documentaire.

PROTOTYPE HTML
==============
L'écran screen-ged-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau gradient violet "📂 Référent documentaire · 28 espaces · 14 280 documents"
  + chip "Volume total · 142 Go"
- Salutation "Bonjour Christelle · 12 workflows en cours · 5 alertes conformité ·
  8 demandes d'accès"
- KPIs (Documents actifs 14 280, À valider 12 ambré, Taux indexation 96% vert
  cible 95%, Alertes conformité 5 rouge dont 2 critiques)
- Section "Alertes documentaires" : 5 alertes hiérarchisées
  * 2 contrats MOA expirent dans 30 j (rouge)
  * 368 docs en attente classement > 30 j (rouge)
  * 8 demandes accès confidentiels (ambré)
  * 42 docs en fin de DUA (ambré)
  * 12 workflows validation en cours (bleu)
- Grille 6 cards "Répartition par espace documentaire" avec icône, libellé, stats
  et progress bar indexation :
  * 📜 Marchés & contrats (2 480 docs, 92%)
  * 🏗 Chantiers 23 espaces (8 940 docs, 88%)
  * 👥 RH (1 240 docs, 100% vert)
  * 💰 Comptable & fiscal (1 380 docs, 98% vert)
  * ⚖ Juridique (142 docs, 95% vert)
  * 🛡 QSE (98 docs, 84% ambré)
- Tableau "Activité documentaire dernières 24h" : 5 lignes avec heure, utilisateur,
  action (Téléchargé/Importé/Validé/Diffusé/Anomalie), document, espace

API
===
- GET /api/ged/dashboard
  → KPIs, alertes hiérarchisées, répartition par espace, activité 24h
- GET /api/ged/dashboard/recent-activity?hours=24

COMPOSANTS src/components/ged/dashboard/
==========================================
- GedHeaderBanner.tsx
- GedGreeting.tsx
- GedKpiRow.tsx (4 KPIs)
- DocumentaryAlertsList.tsx
- SpacesOverviewGrid.tsx (6 cards)
- RecentActivityTable.tsx

⚠️ RESPONSIVE
==============
- KPIs : 4 col → 2x2 → 1 col
- Cards espaces : grid auto-fit minmax(280px,1fr)
- Tableau activité : transformation cards mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged

LIVRABLES
=========
- Code complet
- Test : Christelle se connecte → dashboard avec 5 alertes + 6 espaces
- Test : tap "2 contrats MOA expirent" → liste contrats avec dates
- Audit responsive 7/7 OK
- Commit "feat(ged): tableau de bord référent documentaire — fn 1.1"
```

---

### PROMPT 1.2 — Espaces documentaires

```
Fonction 1.2 : navigation par espace documentaire avec arborescence et filtres.

PROTOTYPE HTML
==============
L'écran screen-ged-espaces existe. Reproduire avec :
- Header "28 espaces actifs · 14 280 documents · 142 Go · architecture transverse"
- Actions "Politique d'accès" + "+ Nouvel espace"
- Onglets (Tous 28, Chantiers 23, Transverses 5)
- Card filtres 4 colonnes (Recherche, Confidentialité, Indexation, Volume)
- Tableau "Espaces transverses (5)" : 5 lignes avec icône+nom, responsable,
  documents, volume, indexation %, confidentialité chip, action Ouvrir
- Tableau "Espaces chantiers (extrait · top 6)" : Pont Mfoundi, Yaoundé-Nsim,
  Bastos, Bonabéri, Odza, AEP Mbalmayo avec conducteur, docs, volume, phase

WORKFLOW MÉTIER
================

**Architecture documentaire 3 niveaux** :
1. **Espace** (Marchés / Chantiers / RH / ...) — 28 espaces racines
2. **Catégorie** dans l'espace (Plans / PV / Photos / Contrats / ...)
3. **Document** avec classification + workflow + rétention

**Pour Pont Mfoundi par exemple** :
```
🏗 Pont Mfoundi (842 docs)
├── 📋 Marché et avenants (12 docs)
├── 📐 Plans (218 docs)
│   ├── Plans d'origine BET (54)
│   ├── Plans d'exécution (142)
│   └── Plans conformes DOE (22)
├── 📸 Photos d'avancement (382 docs)
├── 📜 PV (84 docs)
│   ├── PV visites BCT (42)
│   ├── PV jalons MOA (12)
│   └── PV qualité interne (30)
├── 🧪 Essais labo (28 docs)
├── 💼 Contrats sous-traitants (8 docs)
└── 📁 Divers (110 docs)
```

**Droits d'accès en cascade** :
- Espace.confidentiality définit le minimum
- DocumentClassification.confidentiality peut être plus restrictive
- Document.confidentiality peut être plus restrictive
- ARCHIVIST avec canReadAllDocuments=true contourne SAUF bulletins paie individuels
  et contentieux RH

API
===
- GET /api/ged/spaces (liste tous espaces avec stats)
- GET /api/ged/spaces/:id (détail espace + arborescence)
- GET /api/ged/spaces/:id/documents?category=&page=
- POST /api/ged/spaces (création)
- PATCH /api/ged/spaces/:id
- POST /api/ged/spaces/:id/access-policy (mise à jour droits)
- GET /api/ged/spaces/by-type?type=CONSTRUCTION_SITE

COMPOSANTS src/components/ged/espaces/
========================================
- SpacesHeader.tsx
- SpacesTabs.tsx (3 onglets)
- SpacesFiltersCard.tsx (4 colonnes)
- TransverseSpacesTable.tsx (5 lignes)
- ConstructionSitesSpacesTable.tsx (23 lignes paginées, extrait top 6)
- SpaceDetailDrawer.tsx (arborescence + droits + stats)
- NewSpaceWizard.tsx
- AccessPolicyEditor.tsx

⚠️ RESPONSIVE
==============
- Tableaux : ::before content labels mobile
- Onglets : scroll horizontal mobile
- Drawer espace : 480px desktop / plein écran mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged/espaces

LIVRABLES
=========
- Code complet avec 28 espaces seedés
- Test : tap "📜 Marchés & contrats" → drawer avec arborescence + 2 480 docs
- Test : tap "🏗 Pont Mfoundi" → arborescence détaillée 842 docs
- Test : modification politique d'accès espace QSE → notification responsable
- Audit responsive 7/7 OK
- Commit "feat(ged): espaces documentaires + arborescence + droits — fn 1.2"
```

---

### PROMPT 1.3 — Workflows de validation

```
Fonction 1.3 : pipelines de revue/validation/diffusion documentaire.

PROTOTYPE HTML
==============
L'écran screen-ged-workflows existe. Reproduire avec :
- Header "12 en cours · délai moyen 4,2 j · 142 finalisés YTD · 96% taux complétion"
- KPIs (En cours 12, Délai moyen 4,2j cible 5j, En retard 2 rouge, Tx complétion
  96% vert)
- **Section "⏳ Workflow critique en cours"** : card border-left violet avec
  WF-2026-0142 Plan culée Nord v3, échéance dans 2j, status "En revue BCT" ambré
- **Pipeline visuel 5 étapes** : BET ✓ vert (06/05) → Visa CondTrav ✓ vert
  (07/05) → BCT ⏳ ambré (M. KENGNE en cours) → Visa MOA gris (à venir) →
  Diffusion gris (auto)
- Lignes de connexion entre étapes colorées selon avancement
- Boutons "Voir document", "Relancer BCT", "Historique commentaires"
- Tableau "Tous les workflows en cours (12)" : 8 lignes avec réf, document, type,
  étape actuelle, initiateur, échéance, état (En cours ambré / En retard rouge)

WORKFLOW MÉTIER
================

**Templates de workflows BatimCAM** :

| Code | Nom | Étapes | Durée SLA |
|------|-----|--------|-----------|
| WF-MARCHE-V2 | Validation marché | DAF → DG | 7 j |
| WF-AVENANT | Validation avenant | DAF → DG → MOA | 14 j |
| WF-PLAN-V3 | Validation plan exécution | BET → CondTrav → BCT → MOA → Diffusion | 21 j |
| WF-PVR | Validation PV réception | CondTrav → BCT → MOA → Signature | 7 j |
| WF-DOE | Constitution DOE | Compilation → CondTrav → DTrav → DT → Diffusion | 30 j |
| WF-POL | Validation politique RH | RH → DG → CSE → Diffusion | 14 j |
| WF-BCC | Validation BC-cadre | LOG → DAF → DG | 5 j |
| WF-LAB | Validation essai labo | LABO → CondTrav | 3 j |

**Cycle de vie d'un workflow** :
1. Créé (initiateur démarre depuis son espace métier ou GED)
2. En cours (chaque étape successive)
3. À chaque étape : assigné → en attente → décision (APPROVED/REJECTED/SKIPPED)
4. Si REJECTED : retour à l'initiateur avec commentaire
5. Si APPROVED : étape suivante automatique
6. Dernière étape APPROVED → COMPLETED → diffusion auto
7. Si dueAt dépassé sans décision → status OVERDUE + notification escalade

**Relances automatiques** :
- J-2 avant échéance : notification douce à l'assigné
- J+0 (échéance dépassée) : notification ferme + escalade vers manager
- J+3 : notification au DG si toujours bloqué

API
===
- GET /api/ged/workflows?status=&type=&page=
- GET /api/ged/workflows/:id (détail avec timeline complète)
- GET /api/ged/workflows/templates
- POST /api/ged/workflows/start (initiation depuis tout profil)
- POST /api/ged/workflows/:id/decide (approve/reject étape courante)
- POST /api/ged/workflows/:id/escalate (escalade manuelle ARCHIVIST)
- POST /api/ged/workflows/:id/cancel (annulation ARCHIVIST)
- GET /api/ged/workflows/templates/:id/preview (visualisation modèle)
- POST /api/ged/workflows/templates (création modèle ARCHIVIST)

COMPOSANTS src/components/ged/workflows/
==========================================
- WorkflowsKpis.tsx
- CriticalWorkflowCard.tsx ⚠️ CRITIQUE — card pipeline visuel
- WorkflowPipelineVisual.tsx ⚠️ pipeline 5 étapes circles + connexions
- WorkflowsListTable.tsx (12 lignes)
- WorkflowDetailDrawer.tsx (timeline + commentaires + actions)
- StartWorkflowModal.tsx (sélection template + cible document)
- WorkflowTemplatesManager.tsx (gestion modèles ARCHIVIST only)

⚠️ RESPONSIVE
==============
- Pipeline visuel : flex-wrap mobile (3 étapes ligne 1 + 2 étapes ligne 2)
  ou structure verticale empilée si < 414px
- Tableau workflows : ::before content labels mobile
- Drawer workflow : 480px desktop / plein écran mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged/workflows

LIVRABLES
=========
- Code complet
- Test : visualisation WF-2026-0142 → pipeline 5 étapes coloré selon avancement
- Test : Christelle escalade WF-2026-0140 PV J2 en retard → notification MOA
- Test : démarrage nouveau workflow PEX → sélection template WF-PLAN-V3 → assigné
  automatiquement au BET pour étape 1
- Test : relance auto J-2 avant échéance → email envoyé
- Audit responsive 7/7 OK
- Commit "feat(ged): workflows validation + pipeline visuel + escalades — fn 1.3"
```

---

### PROMPT 1.4 — Nomenclature documentaire

```
Fonction 1.4 : référentiel des 72 types de documents avec DUA et politiques.

PROTOTYPE HTML
==============
L'écran screen-ged-nomenclature existe. Reproduire avec :
- Header "72 types de documents · 6 catégories · politique de rétention
  SYSCOHADA + droit camerounais"
- Actions "Exporter taxonomie" + "+ Nouveau type"
- Onglets catégories (Tous 72, Marchés 14, Techniques 18, RH 12, Comptables 16,
  Juridiques 8, QSE 4)
- 3 tableaux par grande catégorie avec colonnes :
  Préfixe mono bold (CTR, AVE, PEX...), Type document, DUA, Confidentialité chip,
  Workflow, Validateurs

CONTEXTE MÉTIER
================

**DUA = Durée d'Utilité Administrative** : période durant laquelle un document
doit être conservé pour répondre à des obligations légales, fiscales ou
opérationnelles. Au Cameroun cela combine :
- **SYSCOHADA** : 10 ans pour pièces comptables, contrats, livres légaux
- **Code du travail** : 5 ans pour bulletins de paie, +5 ans après départ pour
  dossiers individuels
- **CNPS** : 30 ans pour cotisations sociales (preuve droits retraite)
- **Fiscal DGI** : 10 ans pour déclarations
- **BTP spécifique** : 10 ans pour DOE, 30 ans pour DOE ouvrages d'art
  (décennale + biennale)

**Préfixes normés (extraits)** :
- CTR : Contrat marché travaux (DUA 10 ans, RESTRICTED)
- AVE : Avenant contrat (DUA 10 ans, RESTRICTED)
- CON : Convention partenariat (DUA 10 ans, RESTRICTED)
- BCC : Bon de commande cadre (DUA 5 ans, INTERNAL)
- CSC : Cahier spécifications techniques (DUA 10 ans, INTERNAL)
- PEX : Plan d'exécution (DUA 10 ans, INTERNAL)
- DOE : Dossier d'ouvrage exécuté (DUA 30 ans, INTERNAL)
- PVR : PV de réception (DUA 10 ans, RESTRICTED)
- PVB : PV de visite BCT (DUA 10 ans, INTERNAL)
- CR_ : Compte-rendu de réunion (DUA 5 ans, INTERNAL)
- LAB : Rapport essai laboratoire (DUA 10 ans, INTERNAL)
- CDT : Contrat de travail (DUA +5 ans après départ, CONFIDENTIAL)
- BS_ : Bulletin de salaire (DUA 5 ans, CONFIDENTIAL)
- EVA : Entretien d'évaluation (DUA 5 ans, CONFIDENTIAL)
- POL : Politique RH (DUA Permanente, INTERNAL)
- FAC : Facture fournisseur (DUA 10 ans, INTERNAL)
- BIL : Bilan annuel (DUA 10 ans, RESTRICTED)
- DEC : Déclaration fiscale (DUA 10 ans, CONFIDENTIAL)

**Workflow associé à chaque type** : la nomenclature dicte quel workflow est
automatiquement lancé à la création d'un document.

API
===
- GET /api/ged/classifications (toutes les 72 entrées avec stats usage)
- GET /api/ged/classifications/by-category/:cat
- GET /api/ged/classifications/:id (détail + docs utilisant cette classification)
- POST /api/ged/classifications (ajout type ARCHIVIST only)
- PATCH /api/ged/classifications/:id
- POST /api/ged/classifications/:id/deprecate (mettre obsolète, archive existant)
- GET /api/ged/classifications/export?format=csv|xlsx (taxonomie)

COMPOSANTS src/components/ged/nomenclature/
=============================================
- NomenclatureHeader.tsx
- CategoryTabs.tsx (7 onglets)
- ClassificationTable.tsx ⚠️ tableau par catégorie
- ClassificationDetailDrawer.tsx (détail + docs liés + statistiques)
- NewClassificationForm.tsx (avec génération préfixe auto unique)
- ExportTaxonomyButton.tsx (CSV ou XLSX)

⚠️ RESPONSIVE
==============
- Tableaux : ::before content labels mobile
- Onglets : scroll horizontal mobile
- Drawer classification : 480px desktop / plein écran mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged/nomenclature

LIVRABLES
=========
- Code complet avec 72 types seedés
- Test : Christelle ajoute "PVE · PV essai écobéton" préfixe PVE, DUA 10 ans,
  workflow WF-LAB → ajouté à la nomenclature
- Test : tap "CDT Contrat de travail" → drawer avec 487 documents utilisant
  cette classification + statistiques mensuelles
- Test : export taxonomie XLSX → fichier 72 lignes avec toutes colonnes
- Audit responsive 7/7 OK
- Commit "feat(ged): nomenclature + 72 types + politique DUA — fn 1.4"
```

---

### PROMPT 1.5 — Recherche et archivage

```
Fonction 1.5 : moteur de recherche full-text + gestion archivage légal.

PROTOTYPE HTML
==============
L'écran screen-ged-recherche existe. Reproduire avec :
- Header "Moteur full-text · 14 280 actifs · 38 420 semi-actifs · 142 800 archives
  définitives"
- Actions "Recherche avancée" + "Politique archivage"
- Grande **barre de recherche** avec icône loupe et placeholder "Recherche full-text
  dans 195 500 documents..."
- **Filtres avancés** 5 colonnes (Type document, Espace, Période, Statut, Auteur)
- KPIs "Volumes par statut d'archivage" (Actifs 14 280, Semi-actifs 38 420,
  Définitifs 142 800, À détruire 42 ambré)
- Section "Recherches récentes" : 4 lignes avec libellé recherche, nombre résultats,
  date/heure, bouton "Relancer"

CONTEXTE MÉTIER
================

**Cycle de vie d'archivage** :
1. **Actif** : document en cours d'usage opérationnel, accès rapide indispensable
   (consultations fréquentes). Stockage premium (PostgreSQL + S3 ou similaire).
2. **Semi-actif** : document encore dans sa DUA mais consultation rare. Stockage
   moins coûteux (S3 Glacier Instant ou similaire).
3. **Archive définitive** : document hors DUA mais conservation impérative
   (CNPS 30 ans, DOE 30 ans, statuts permanent). Stockage long terme bas coût
   (S3 Glacier Deep Archive).
4. **À détruire** : document en fin de DUA, programmé pour destruction. La
   destruction nécessite un PV signé par l'ARCHIVIST + DG.

**Moteur de recherche** :
- Full-text dans les métadonnées (titre, auteur, classification, tags)
- Full-text dans le contenu OCRisé (PDF, Word, Excel)
- Recherche par filtres : type, espace, période, statut, auteur, montant, chantier
- Recherche sémantique optionnelle (via embeddings) pour requêtes complexes
- **Permissions appliquées** : Christelle voit tout sauf BS_ individuels +
  contentieux RH. Pour les autres profils, filtrage automatique selon
  assignedSiteIds et droits

**Politique archivage** :
- Job automatique mensuel : documents avec retentionRecord.duaEndDate dans
  6 mois → notification au responsable
- Documents avec duaEndDate dépassée et pas legalHold → passent en
  PENDING_DESTRUCTION
- Christelle valide la liste de destruction → PV mensuel → destruction effective

API
===
- POST /api/ged/search (full-text + filtres)
  Body: { query, filters: { type, space, period, status, author }, page, perPage }
- GET /api/ged/search/recent (recherches récentes de l'utilisateur)
- GET /api/ged/search/saved (recherches sauvegardées)
- POST /api/ged/search/save (sauvegarder requête fréquente)
- GET /api/ged/archival/stats (volumes par statut)
- POST /api/ged/archival/auto-process (job mensuel, ARCHIVIST only)
- POST /api/ged/archival/destruction-pv (génère PV destruction)
- POST /api/ged/archival/legal-hold (bloque destruction pour contentieux)

COMPOSANTS src/components/ged/recherche/
==========================================
- SearchHeader.tsx
- SearchBar.tsx (input full-text + bouton)
- AdvancedFiltersGrid.tsx (5 colonnes)
- ArchivalStatusKpis.tsx (4 KPIs volumes)
- SearchResultsList.tsx ⚠️ avec pagination + tri
- SearchResultItem.tsx (titre + extrait + métadonnées + actions)
- RecentSearchesList.tsx
- ArchivalPolicyEditor.tsx (ARCHIVIST only)
- DestructionPvGenerator.tsx (PDF mensuel)

⚠️ RESPONSIVE
==============
- Barre recherche : 100% width mobile, bouton sous l'input
- Filtres : 5 col → 3 col → 1 col
- Résultats : transformation cards mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged/recherche

LIVRABLES
=========
- Code complet avec moteur PostgreSQL full-text (tsvector + ranking)
- Test : recherche "Pont Mfoundi culée Nord ferraillage" → 142 résultats
  triés par pertinence
- Test : filtre par période 2025 → résultats 2025 uniquement
- Test : ARCHIVIST trouve un BS individuel → blocked, message "Accès restreint"
- Test : job mensuel archivage → 42 docs passent en PENDING_DESTRUCTION
- Test : génération PV destruction mensuel → PDF signé Christelle + Albert
- Audit responsive 7/7 OK
- Commit "feat(ged): recherche full-text + archivage légal + PV destruction — fn 1.5"
```

---

### PROMPT 1.6 — Audit et conformité

```
Fonction 1.6 : journal d'activité documentaire + conformité réglementaire.

PROTOTYPE HTML
==============
L'écran screen-ged-audit existe. Reproduire avec :
- Header "Traçabilité tous accès · politique de rétention SYSCOHADA · droit
  camerounais · prêt audit ISO 9001"
- Actions "Rapport conformité" + "Export journal"
- KPIs (Score conformité 96% vert cible ISO 9001 90%, Demandes d'accès 8 ambré
  en attente, Anomalies détectées 3 rouge, Événements journal 28 420 YTD)
- Section "Alertes conformité actives" : 5 alertes
  * Accès anormal PV BCT modifié sans workflow (rouge, fond rouge)
  * 2 docs RH manquants dossier C. MEKONGO (rouge, fond rouge)
  * DOE Pont Mfoundi 14 plans manquants J3 20/05 (ambré)
  * 8 demandes accès confidentiels (ambré)
  * Audit interne ISO 9001 22/05 préparation (bleu)
- Tableau "Journal d'activité documentaire (extrait)" : 7 lignes avec date mono,
  utilisateur, action (Téléchargement, Import, Validation, Modification anomalie,
  Diffusion, Consultation, Demande d'accès), cible, IP mono, statut (OK vert /
  Anomalie rouge / En attente ambré)

CONTEXTE MÉTIER
================

**Audit documentaire** : sert à 3 objectifs :
1. **Traçabilité légale** : qui a vu/modifié quoi quand (pour contentieux,
   audit interne, audit ISO 9001)
2. **Détection anomalies** : modifications hors processus, accès anormaux,
   violations de droits
3. **Conformité réglementaire** : préparation audits externes (BCT, fisc,
   certifications)

**Types d'événements journalisés** :
- CONSULTATION : lecture document
- TÉLÉCHARGEMENT : download fichier
- IMPORT : création/upload nouveau document
- MODIFICATION : édition métadonnées ou contenu
- SUPPRESSION : passage en PENDING_DESTRUCTION ou DESTROYED
- VALIDATION_WORKFLOW : décision d'étape workflow
- DIFFUSION : envoi aux destinataires
- DEMANDE_ACCÈS : requête d'accès à document confidentiel
- ANOMALIE : détection d'événement suspect

**Anomalies détectées automatiquement** :
- Modification de document avec workflow actif et statut COMPLETED
  (changement après diffusion)
- Téléchargement massif (> 50 docs/heure par un utilisateur)
- Accès depuis IP non-tenant (hors VPN ou pays différent)
- Consultation de documents très confidentiels par utilisateur non-autorisé
- Tentative de suppression document avec legalHold

**Demandes d'accès** : workflow simple
1. Utilisateur demande accès à un document confidentiel
2. Notification à Christelle (ARCHIVIST) avec raison
3. Christelle approuve/refuse → notification demandeur
4. Si approuvé : accès limité dans le temps (7 jours par défaut)
5. Tous les accès dans la fenêtre sont journalisés

**Rapport conformité** : génère PDF avec :
- Score conformité global
- Pourcentages d'indexation par espace
- Anomalies détectées (résolues / en cours)
- DUA respectées vs dépassées
- Workflows : taux de complétion, SLA respectés
- Demandes d'accès : volume, taux d'approbation, délai moyen

API
===
- GET /api/ged/audit/journal?action=&user=&dateFrom=&dateTo=&page=
- GET /api/ged/audit/anomalies?status=&page=
- POST /api/ged/audit/anomalies/:id/investigate (marquer en cours)
- POST /api/ged/audit/anomalies/:id/resolve (clôturer avec notes)
- GET /api/ged/audit/access-requests?status=&page=
- POST /api/ged/audit/access-requests/:id/approve
- POST /api/ged/audit/access-requests/:id/deny (avec raison)
- GET /api/ged/audit/compliance-report?period=YTD|month|year
- POST /api/ged/audit/export-journal?format=csv|xlsx&filters=
- GET /api/ged/audit/iso9001-readiness (checklist préparation audit)

COMPOSANTS src/components/ged/audit/
======================================
- ComplianceKpis.tsx (4 KPIs)
- ActiveAlertsList.tsx ⚠️ avec backgrounds rouge/ambré
- AuditJournalTable.tsx (avec filtres avancés)
- AnomalyDetailDrawer.tsx (investigation + résolution)
- AccessRequestsManager.tsx (8 demandes en attente)
- ComplianceReportGenerator.tsx (PDF)
- Iso9001ReadinessChecklist.tsx (préparation audit interne)

⚠️ RESPONSIVE
==============
- Tableau journal : ::before content labels mobile
- KPIs : 4 col → 2x2 → 1 col
- Alertes : items 60px avec wrap mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /ged/audit

LIVRABLES
=========
- Code complet
- Test : journal 24h → 28 lignes avec filtres action/utilisateur/date
- Test : anomalie "PV BCT modifié hors workflow" → investigation Samuel MBARGA
  → résolution avec commentaire
- Test : Christelle approuve demande accès Robert ETONDÉ à "Liste salaires juin
  2025" → notification Robert + accès 7 j
- Test : génération rapport conformité ISO 9001 → PDF avec score 96% + checklist
- Test : export journal mai 2026 → XLSX 4 200 lignes
- Audit responsive 7/7 OK
- Commit "feat(ged): audit conformité + journal + anomalies + ISO 9001 — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil GED complet

Tu viens de couvrir l'**ensemble du profil Référent Documentaire** :
- Bloc 0 : 6 nouveaux models GED + extension Document + nomenclature 72 types
- Bloc 1 : 6 fonctions (Dashboard, Espaces, Workflows, Nomenclature, Recherche,
  Audit)

**Total profil GED : 6 fonctions livrées**

POINTS FORTS DE CE PROFIL
==========================
- Profil **transverse** unique : transcende assignedSiteIds[] grâce à
  canReadAllDocuments=true (sauf BS_ + contentieux RH)
- Nomenclature 72 types conforme **SYSCOHADA + droit camerounais + CNPS**
- Workflows de validation avec pipeline visuel et escalades automatiques
- Recherche full-text PostgreSQL tsvector sur 195 500 documents
- Archivage légal 4 niveaux (actifs / semi-actifs / définitifs / destruction)
- Audit conformité prêt **ISO 9001** + traçabilité 100% des accès
- Détection automatique d'anomalies (modifications hors workflow, téléchargements
  massifs, accès suspects)

ESTIMATION EFFORT
==================
- Bloc 0 (6 models Prisma + extension Document + nomenclature 72 types) : 3-4 j
- Bloc 1 (6 fonctions) : 8-10 jours (fn 1.3 Workflows avec pipeline visuel dense,
  fn 1.5 Recherche full-text PostgreSQL + jobs cron archivage, fn 1.6 Audit avec
  détection anomalies)
- TOTAL : 11-14 jours

INTERACTIONS AVEC AUTRES PROFILS
=================================
- **Tous les profils** : alimentent la GED via leurs documents métier
- **DG (Albert)** : reçoit rapport conformité mensuel + signe PV destruction
- **DAF (Marie)** : valide étapes workflows financiers (BC > 5M, avenants)
- **DT (Daniel)** : valide étapes DOE et plans techniques
- **CondTrav (Samuel)** : producteur majeur de documents chantier (plans, PV, photos)
- **RH (Sandrine)** : gère espace RH avec confidentialité maximale
- **LOG (Robert)** : producteur contrats-cadres + rapports DG

PROCHAINE ÉTAPE
================
Profils restants à développer :
- **Informaticien d'entreprise** : admin technique tenant
- **Employé bureau · Ouvrier** : comptes basiques (consultation paie, demandes
  congés, pointage)

Mon ordre recommandé : **Informaticien d'entreprise** ensuite. C'est un profil
court mais essentiel : il administre les utilisateurs, gère les habilitations,
configure les paramètres techniques tenant. Il est en miroir du Super-Admin
(Anthropic/T-ERP) mais côté client BatimCAM.
