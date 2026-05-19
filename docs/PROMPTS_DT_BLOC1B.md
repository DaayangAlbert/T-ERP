# DT · BLOC 1 PARTIE 2 — Espace DT (fonctions 1.5 à 1.8)

**4 fonctions · 4 prompts à enchaîner**

⚠️ Responsive vérifié par script Playwright à chaque commit.

---

## 🟪 PROMPT 1.5 — Méthodes et planification

```
Fonction 1.5 : bibliothèque de modes opératoires et plannings types.

PROTOTYPE HTML
==============
L'écran screen-dt-methodes N'EXISTE PAS encore. À créer.

ÉLÉMENTS À CRÉER DANS LE PROTOTYPE
===================================
1. Header : "Méthodes et planification techniques"
2. KPIs :
   - Modes opératoires actifs : 142
   - Plannings types : 28
   - Ratios de référence : 86 (heures par m² ou m³)
   - Retours d'expérience : 47 (REX clos)
3. Onglets :
   - Modes opératoires (par catégorie : terrassement, fondations, gros œuvre,
     coffrage, ferraillage, finitions, voirie, hydraulique...)
   - Plannings types (par typologie chantier : R+8, voirie urbaine, AEP, etc.)
   - Ratios et coefficients (par poste de travail)
   - Retours d'expérience (REX classés par chantier d'origine)
4. Onglet "Modes opératoires" :
   Listview avec catégorie, libellé, version, dernière révision, auteur,
   nombre d'utilisations sur chantiers, statut (actif/obsolète)
   Filtres par catégorie + recherche full-text
5. Onglet "Plannings types" :
   Cards avec aperçu Gantt miniature (1 chantier R+8 typique = 18 mois),
   bouton "Cloner pour nouveau chantier"
6. Onglet "Ratios" :
   Tableau ratios par poste : ferraillage kg/m³, coffrage h/m², béton h/m³,
   avec valeur de référence + valeur réelle observée + écart
7. Onglet "REX" :
   Listview retours d'expérience post-chantier avec problèmes rencontrés,
   solutions apportées, recommandations. Recherche full-text.

⚠️ RESPONSIVE — pendant la création du prototype, RESPECTER :
- data-rh-screen sur le container
- Pas de max-width inline (utiliser .rh-page)
- Cards plannings types en grille responsive 3 → 2 → 1
- Tableaux préparés pour cards mobile

PRISMA
======
   model OperatingMethod {
     id          String   @id @default(cuid())
     tenantId    String
     category    MethodCategory
     title       String
     version     String   @default("1.0")
     description String?  @db.Text
     procedure   String   @db.Text  // markdown
     attachments String[]
     authorId    String
     status      MethodStatus
     usageCount  Int      @default(0)
     lastReviewedAt DateTime?
     createdAt   DateTime @default(now())
   }
   enum MethodCategory { EARTHWORKS FOUNDATIONS STRUCTURE FORMWORK REBAR FINISHING ROADWORK HYDRAULIC SAFETY OTHER }
   enum MethodStatus { DRAFT ACTIVE OBSOLETE UNDER_REVIEW }

   model TemplatePlanning {
     id            String   @id @default(cuid())
     tenantId      String
     siteTypology  String   // "R+8", "voirie urbaine 2 km", "AEP forage 50 m"
     totalDuration Int      // jours
     phases        Json     // [{ name, durationDays, dependencies }]
     authorId      String
     usageCount    Int      @default(0)
   }

   model ReferenceRatio {
     id          String @id @default(cuid())
     tenantId    String
     workItem    String // "Ferraillage HA poteaux"
     unit        String // "kg/m³", "h/m²"
     refValue    Float
     observedValue Float
     observationsCount Int @default(0)
   }

   model SiteRex {
     id           String @id @default(cuid())
     siteId       String
     site         Site   @relation(fields: [siteId], references: [id])
     authorId     String
     issues       String @db.Text
     solutions    String @db.Text
     recommendations String @db.Text
     keywords     String[]
     closedAt     DateTime
   }

API
===
- GET/POST/PATCH /api/dt/methods
- GET /api/dt/methods/categories
- GET/POST /api/dt/template-plannings
- POST /api/dt/template-plannings/:id/clone-to-site/:siteId
- GET/POST/PATCH /api/dt/ratios
- GET/POST /api/dt/rex

COMPOSANTS src/components/dt/methods/
======================================
- MethodsKpis.tsx
- MethodsLibraryTabs.tsx (4 onglets)
- MethodsTable.tsx ⚠️ RESPONSIVE
- TemplatePlanningCard.tsx (avec mini-Gantt)
- RatiosTable.tsx
- RexList.tsx (avec keywords cliquables)
- MethodFormModal.tsx (création/édition mode opératoire avec markdown editor)

⚠️ RESPONSIVE
==============
- Cards plannings types : 3 col → 2 col → 1 col
- Tableau modes opératoires → cards mobile
- Mini-Gantt sur les cards : SVG ResponsiveContainer
- Modale création : plein écran mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/methodes

LIVRABLES
=========
- Prototype : screen-dt-methodes
- Code complet
- 20 modes opératoires seedés (4 par catégorie)
- 5 plannings types seedés
- 30 ratios de référence seedés
- 8 REX seedés
- Audit responsive 7/7 OK
- Commit "feat(dt): méthodes + plannings + ratios + REX — fn 1.5
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.6 — Plan de charge équipes

```
Fonction 1.6 : pilotage capacité des équipes et arbitrage de surcharges.

PROTOTYPE HTML
==============
L'écran screen-dt-charge N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Plan de charge équipes" + sélecteur période (Mai 2026 → Sept 2026)
2. KPIs :
   - Équipes actives : 18 (gros œuvre + voirie + hydraulique + finitions)
   - Capacité totale semaine : 1 248 h.h
   - Charge planifiée : 1 089 h.h (87 %)
   - Surcharges détectées : 4 équipes
3. Onglets :
   - Vue capacité (graphique semaine par semaine)
   - Affectations directeurs travaux (qui pilote quoi)
   - Affectations équipes ouvrières
   - Surcharges et arbitrages
4. Onglet "Vue capacité" :
   Vue type "heatmap" semaines × équipes :
   - Lignes : 18 équipes
   - Colonnes : 20 semaines à venir
   - Cellules : taux de charge (vert <80%, jaune 80-100%, rouge >100%)
5. Onglet "Surcharges et arbitrages" :
   Listview des surcharges détectées :
   - Équipe gros œuvre Pont Mfoundi · semaine 21 · 156 % · 2 chantiers en parallèle
   - Action proposée : décaler chantier A de 1 semaine OU recruter intérim
   - Boutons : Accepter / Reporter / Recruter / Sous-traiter

⚠️ RESPONSIVE
==============
- Heatmap : sur mobile, scroll horizontal avec sticky col "équipe"
- Listview surcharges → cards verticales mobile

PRISMA
======
   model Crew {
     id          String   @id @default(cuid())
     tenantId    String
     name        String   // "GO Pont Mfoundi", "VRD Bonabéri"
     specialty   CrewSpecialty
     capacityHoursPerWeek Float @default(40)
     leaderId    String?  // chef d'équipe
     siteId      String?  // chantier d'affectation principal
     active      Boolean  @default(true)
   }
   enum CrewSpecialty { CONCRETE FORMWORK REBAR FINISHING ROADWORK HYDRAULIC ELECTRICAL OTHER }

   model CrewAssignment {
     id          String   @id @default(cuid())
     crewId      String
     crew        Crew     @relation(fields: [crewId], references: [id])
     siteId      String
     weekIso     String   // "2026-W21"
     plannedHours Float
     actualHours Float?
     overloadPercent Float? // calculé si > 100
   }

API
===
- GET /api/dt/crews
- GET /api/dt/crews/heatmap?weeksFrom=&weeksTo=
- GET /api/dt/crews/overloads
- POST /api/dt/crews/:id/assignments
- PATCH /api/dt/crews/assignments/:id (modifier heures)
- POST /api/dt/crews/overloads/:id/resolve (action: postpone/recruit/subcontract)

COMPOSANTS src/components/dt/capacity/
=======================================
- CapacityKpis.tsx
- CapacityHeatmap.tsx ⚠️ RESPONSIVE COMPLEXE
- DirectorOfWorksAssignments.tsx (kanban directeurs ↔ chantiers)
- CrewAssignmentsCalendar.tsx
- OverloadsList.tsx (cards avec actions inline)
- ArbitrationModal.tsx (proposer scénarios)

⚠️ RESPONSIVE — HEATMAP
========================
- Desktop > 1280px : 18 équipes × 20 semaines, cellules 32×24px
- 1024-1280px : cellules 24×20px
- 768-1024px : 18 × 12 semaines visibles + scroll horizontal
- < 768px : 1 équipe à la fois avec sélecteur en haut, vue calendaire empilée
  ou scroll horizontal complet avec sticky col

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/charge

LIVRABLES
=========
- Prototype : screen-dt-charge
- Code complet avec heatmap fonctionnelle
- 18 équipes + assignations seedées
- Test : surcharge équipe S21 visible → arbitrage : accepter "report 1 semaine"
- Audit responsive 7/7 OK
- Commit "feat(dt): plan de charge + heatmap + arbitrages — fn 1.6
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.7 — Sous-traitance

```
Fonction 1.7 : référentiel sous-traitants qualifiés et contrats-cadres.

PROTOTYPE HTML
==============
L'écran screen-dt-sous-traitance N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Sous-traitance technique"
2. KPIs :
   - Sous-traitants qualifiés : 42
   - Contrats-cadres actifs : 18
   - Engagements en cours : 1,8 Md FCFA
   - Évaluations à faire : 6 (post-prestation)
3. Onglets :
   - Référentiel sous-traitants (par spécialité)
   - Contrats-cadres
   - Engagements actifs (par chantier)
   - Évaluations et notations
   - Sous-traitants en alerte (problèmes qualité, délais, conformité fiscale)
4. Onglet "Référentiel" :
   Listview avec : raison sociale, spécialités, agréments, références chantiers,
   notation interne (1-5 étoiles), statut conformité fiscale CNPS+DGI
5. Onglet "Évaluations" :
   Liste des prestations terminées à évaluer (qualité, délais, sécurité, comportement)
   Note globale calculée auto

⚠️ RESPONSIVE
==============
- Tableau sous-traitants → cards mobile avec étoiles + badges spécialité
- Modale évaluation : formulaire scoring 4 critères, plein écran mobile

PRISMA
======
Le model Supplier existe (côté DAF). Créer Subcontractor distinct ou flag :
   model Supplier {
     ...
     isSubcontractor Boolean @default(false)
     specialties     SubSpecialty[] @default([])
     agreements      String[]   // certifications, agréments
     internalRating  Float      @default(0) // 0-5
     ratingsCount    Int        @default(0)
     fiscalCompliance Json?     // { cnps: 'OK', dgi: 'OK', lastChecked }
   }

   enum SubSpecialty { EARTHWORKS_HEAVY ROOFING_WATERPROOFING ELECTRICAL PLUMBING HVAC PAINTING TILING JOINERY METALWORK GLAZING DEMOLITION CRANE OTHER }

   model SubcontractorEvaluation {
     id            String   @id @default(cuid())
     supplierId    String
     siteId        String
     site          Site     @relation(fields: [siteId], references: [id])
     evaluatorId   String
     qualityScore  Int      // 1-5
     delayScore    Int      // 1-5
     safetyScore   Int      // 1-5
     behaviorScore Int      // 1-5
     overallScore  Float    // calculé
     comments      String?  @db.Text
     createdAt     DateTime @default(now())
   }

API
===
- GET /api/dt/subcontractors?specialty=&minRating=&fiscalOk=
- GET /api/dt/subcontractors/:id (avec historique évaluations)
- POST /api/dt/subcontractors (création)
- POST /api/dt/subcontractors/:id/evaluations
- GET /api/dt/subcontractors/framework-agreements
- GET /api/dt/subcontractors/active-engagements
- GET /api/dt/subcontractors/alerts

COMPOSANTS src/components/dt/subcontractors/
=============================================
- SubcontractorsKpis.tsx
- SubcontractorsTable.tsx ⚠️ RESPONSIVE
- FrameworkAgreementsTable.tsx
- ActiveEngagementsTable.tsx
- EvaluationFormModal.tsx (scoring 4 critères)
- SubcontractorAlertsList.tsx

⚠️ RESPONSIVE
==============
- Tableau référentiel : cards mobile avec étoiles, badges spécialités, statut fiscal
- Formulaire évaluation : sliders 1-5 sur mobile (plus tactile que selects)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/sous-traitance

LIVRABLES
=========
- Prototype : screen-dt-sous-traitance
- Code complet
- 42 sous-traitants seedés avec historiques évaluations cohérents
- Test : ajouter évaluation pour STI ÉTANCHÉITÉ sur Bastos R+8 → notation mise à jour
- Audit responsive 7/7 OK
- Commit "feat(dt): sous-traitance + évaluations + framework — fn 1.7
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 1.8 — QHSE

```
Fonction 1.8 : Qualité, Hygiène, Sécurité, Environnement.

PROTOTYPE HTML
==============
L'écran screen-dt-qhse N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Qualité, Hygiène, Sécurité, Environnement"
2. Bandeau gradient (sécurité = priorité dirigeante) :
   "142 jours sans accident grave · 0 accident mortel YTD · TF1 cible 8,2"
3. KPIs :
   - Accidents YTD : 12 (légers + bénins)
   - Taux fréquence TF1 : 8,2 (cible BTP < 15)
   - Audits chantiers ce mois : 8
   - Non-conformités ouvertes : 14
4. Onglets :
   - Tableau de bord QHSE
   - Incidents et accidents
   - Audits et inspections
   - Non-conformités qualité
   - Certifications ISO (9001 / 14001 / 45001)
5. Onglet "Incidents et accidents" :
   Listview chronologique avec : date, chantier, type (presqu'accident, accident léger,
   AT déclaré), gravité, nb victimes, jours d'arrêt, statut enquête, actions correctives
6. Onglet "Audits et inspections" :
   Calendrier mensuel des audits planifiés + listing audits réalisés avec score
7. Onglet "Non-conformités" :
   Tableau NC ouvertes : description, chantier, source (audit interne, MOA, BCT),
   criticité, action corrective, échéance, responsable
8. Onglet "Certifications" :
   Cards avec dates de validité, prochaines audits de surveillance, nb NC issues
   du dernier audit, taux de levée

⚠️ RESPONSIVE — TRÈS IMPORTANT POUR CE MODULE
==============================================
Le QHSE peut être consulté en urgence depuis le terrain (accident en cours).
Bandeau d'alerte sticky en haut sur mobile si incident grave non-clos.

PRISMA
======
   model HseIncident {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     occurredAt  DateTime
     type        IncidentType
     severity    IncidentSeverity
     victimsCount Int     @default(0)
     workdaysLost Int     @default(0)
     description String   @db.Text
     immediateActions String? @db.Text
     rootCause   String?  @db.Text
     correctiveActions Json[] // [{ action, owner, dueDate, done }]
     reportedBy  String
     status      IncidentStatus
     declaredCnps Boolean @default(false)
     declaredCnpsAt DateTime?
   }
   enum IncidentType { NEAR_MISS MINOR_INJURY MAJOR_INJURY FATAL_ACCIDENT MATERIAL_DAMAGE ENVIRONMENT_INCIDENT }
   enum IncidentSeverity { LOW MEDIUM HIGH CRITICAL }
   enum IncidentStatus { OPEN UNDER_INVESTIGATION ACTIONS_DEFINED ACTIONS_IN_PROGRESS CLOSED }

   model SiteAudit {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     auditType   AuditCategory
     scheduledAt DateTime
     completedAt DateTime?
     auditorId   String
     score       Float?   // 0-100
     findings    Json[]   // [{ severity, description, recommendation }]
     reportUrl   String?
   }
   enum AuditCategory { INTERNAL_QHSE EXTERNAL_ISO MOA_INSPECTION REGULATORY }

   model NonConformity {
     id          String   @id @default(cuid())
     siteId      String?
     auditId     String?
     category    NcCategory
     criticality Criticality
     description String   @db.Text
     correctiveAction String? @db.Text
     ownerId     String
     dueDate     DateTime?
     status      NcStatus
     closedAt    DateTime?
   }
   enum NcCategory { QUALITY SAFETY ENVIRONMENT REGULATORY DOCUMENTATION }
   enum Criticality { MINOR MAJOR CRITICAL }
   enum NcStatus { OPEN ACTION_PLANNED IN_PROGRESS CLOSED REJECTED }

   model Certification {
     id          String   @id @default(cuid())
     tenantId    String
     standard    String   // "ISO 9001", "ISO 14001", "ISO 45001"
     scope       String?
     issuedBy    String
     issuedAt    DateTime
     validUntil  DateTime
     surveillanceAuditDate DateTime?
     openNcCount Int      @default(0)
   }

API
===
- GET /api/dt/qhse/dashboard
- GET /api/dt/qhse/incidents
- POST /api/dt/qhse/incidents (déclaration en urgence)
- PATCH /api/dt/qhse/incidents/:id (mise à jour enquête)
- GET /api/dt/qhse/audits
- POST /api/dt/qhse/audits/:id/findings
- GET /api/dt/qhse/non-conformities
- POST /api/dt/qhse/non-conformities/:id/close
- GET /api/dt/qhse/certifications

COMPOSANTS src/components/dt/qhse/
====================================
- QhseBanner.tsx (gradient violet/rouge selon état)
- QhseKpis.tsx
- QhseTabs.tsx (5 onglets)
- IncidentsTable.tsx ⚠️ RESPONSIVE (cards mobile, criticalité visible)
- IncidentReportForm.tsx (formulaire urgence terrain, mobile-optimized)
- AuditsCalendar.tsx
- NcTable.tsx
- CertificationsCards.tsx

⚠️ RESPONSIVE
==============
- Bandeau sticky top sur mobile si incident critique non-clos (alerte rouge)
- Tableau incidents → cards mobile avec gravité en couleur
- Formulaire déclaration incident : optimisé tactile (boutons gros, sélecteurs simples)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /dt/qhse

LIVRABLES
=========
- Prototype : screen-dt-qhse
- Code complet
- 12 incidents seedés (cohérent avec KPIs dashboard)
- 8 audits + 14 NC seedées
- 3 certifications ISO avec dates valides
- Test : déclarer incident léger Pont Mfoundi → KPI mis à jour, notif DG
- Audit responsive 7/7 OK
- Commit "feat(dt): QHSE complet + incidents + audits + NC + ISO — fn 1.8
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ FIN BLOC 1 PARTIE 2

8 fonctions Espace DT livrées. Demande le bloc 2 :
"Bloc 1 DT terminé. Tu peux me livrer le Bloc 2."

Le Bloc 2 couvrira les modules transverses vue DT (Validations transverses, Rapports
techniques, Mon profil + paie + messagerie enrichis pour Daniel ESSOMBA).
