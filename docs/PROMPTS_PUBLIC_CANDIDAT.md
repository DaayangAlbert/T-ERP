# LANDING T-ERP + PORTAIL RECRUTEMENT + ESPACE CANDIDAT

**Périmètre :** 3 zones distinctes mais articulées
1. **Landing T-ERP publique** (terp.cm) — prospects PME BTP
2. **Portail recrutement BatimCAM** (batimcam.cm/recrutement) — candidats à l'emploi
3. **Espace candidat connecté** — suivi candidatures, profil, entretiens, offres recommandées

**8 écrans ajoutés** au prototype, qui passe de 106 à **114 écrans**.

**Choix architectural V1 : isolation par tenant.** Un candidat = un compte par
tenant. Robert peut postuler chez BatimCAM avec un profil BatimCAM. S'il veut
postuler chez "Constructions Mvog-Mbi", il crée un nouveau profil. Cette
contrainte sera levée en V2 avec un "Talent Pool T-ERP" opt-in.

---

## 🟪 ZONE 1 — LANDING PUBLIQUE T-ERP (terp.cm)

### PROMPT 0 — PRÉAMBULE LANDING

```
Phase de développement de la landing publique T-ERP (terp.cm).

CONTEXTE
========
- L'écran prototype existe : screen-landing
- Attribut data-public-screen
- Public cible : DG/DAF de PME BTP camerounaises (et bientôt CEMAC)
- Objectif : convertir le prospect en démo programmée
- Hébergé sur le domaine principal terp.cm (sans tenant)

ROUTING
========
- src/app/page.tsx (route racine /)
- Si user déjà authentifié → redirect /dashboard
- Sinon → render Landing

STRUCTURE EN 10 SECTIONS
=========================
1. Top bar sticky (Logo + nav + Connexion + Démo)
2. Hero gradient violet avec accroche + 2 CTAs + mockup chantier
3. Logos clients (BatimCAM + 4 autres)
4. 4 problèmes résolus (Suivi multi-chantiers, Paie SYSCOHADA, Documents perdus,
   Conformité CNPS/DGI)
5. 13 profils métier (grid de cards icône+nom+résumé)
6. 6 modules clés (Multi-tenant, PWA, Intégrations Cameroun, WhatsApp, SYSCOHADA,
   Sécurité)
7. 3 témoignages clients (Albert DAAYANG + 2 autres clients)
8. 3 plans tarifaires (Essentiel 95K, Pro 285K Recommandé, Enterprise sur devis)
9. Tableau de comparaison T-ERP vs Sage X3 / Odoo / Excel
10. FAQ 6 questions
11. Formulaire demande démo
12. Footer noir avec liens

CONVENTIONS
============
- Pages Next.js : src/app/(public)/page.tsx
- Composants : src/components/public/landing/<Section>.tsx
- Submit form : POST /api/public/demo-request → CRM + email

LIVRABLES
=========
- Page complète /
- 12 composants modulaires
- Formulaire demande démo (Nom, Fonction, Entreprise, Nb employés, Email, Tel)
- Routing : si user authentifié → redirect /dashboard
- SEO meta tags FR + OpenGraph
- Sitemap automatique
- Audit responsive 7/7 OK
- Audit Lighthouse > 90 (Performance + Accessibility + SEO)
- Commit "feat(public): landing T-ERP complète + formulaire démo"
```

---

## 🟪 ZONE 2 — PORTAIL RECRUTEMENT BATIMCAM (batimcam.cm/recrutement)

### PROMPT 0 — PRÉAMBULE PORTAIL

```
Phase de développement du portail recrutement public d'un tenant (BatimCAM).

CONTEXTE
========
- Le prototype contient 2 écrans liés :
  screen-portal-batimcam (liste offres + candidature spontanée)
  screen-job-detail (détail d'une offre + candidature dédiée)
- Tous deux ont data-public-screen
- URL : batimcam.cm/recrutement (sous-domaine tenant)
- Public cible : candidats à l'emploi BTP au Cameroun

ROUTING
========
- src/app/(public-tenant)/recrutement/page.tsx → liste offres
- src/app/(public-tenant)/recrutement/[slug]/page.tsx → détail offre
- Détection du tenant via sous-domaine + middleware
- Affichage du branding tenant (logo, couleurs) depuis TenantSettings

STRUCTURE PORTAIL
==================
1. Top bar BatimCAM (logo tenant + nav + Espace candidat + Candidature spontanée)
2. Hero BatimCAM employeur (accroche + 4 stats : 487 collaborateurs, 23 chantiers,
   12 ans, 5⭐ Glassdoor)
3. 4 raisons de nous rejoindre (Formation continue, Sécurité, Salaires +15%,
   Diversité 22% femmes)
4. Liste filtrable des 12 offres (Filtres : recherche, contrat, localisation,
   catégorie)
5. Processus de recrutement 5 étapes (Candidature → Présélection → Entretien
   → Test pratique → Bienvenue)
6. 3 témoignages collaborateurs (François NDONGO + Sandrine ONANA + Samuel MBARGA)
7. Formulaire candidature spontanée
8. Section contact RH (Sandrine ONANA + coordonnées)
9. Footer minimal + mention "Propulsé par T-ERP"

STRUCTURE DÉTAIL OFFRE
=======================
1. Top bar BatimCAM (avec bouton "← Retour aux offres")
2. En-tête offre (titre + chips localisation/contrat/exp/salaire/date)
3. Le poste en bref (résumé)
4. Missions (liste à puces 8 items)
5. Profil recherché (liste à puces 7 items)
6. Ce que nous offrons (avantages 6 items)
7. Processus 5 étapes timeline
8. Aside sticky : CTA Postuler + À propos du chantier + Équipe future
9. Formulaire candidature dédiée à l'offre
10. Footer

MODELS PRISMA (ZONES 2 + 3 communs)
=====================================
   model JobOffer {
     id              String   @id @default(cuid())
     tenantId        String
     code            String   @unique
     slug            String   @unique
     title           String
     category        JobCategory
     contractType    ContractType
     experienceMin   Int      // années
     salaryMin       BigInt?
     salaryMax       BigInt?
     location        String   // "Yaoundé · Pont Mfoundi"
     siteId          String?  // chantier de rattachement
     site            Site?    @relation(fields: [siteId], references: [id])
     summary         String   @db.Text
     missions        Json     // array of strings
     profile         Json     // array of strings
     benefits        Json     // array of strings
     status          JobStatus
     publishedAt     DateTime?
     closedAt        DateTime?
     hiringManagerId String?  // User responsable
     hiringManager   User?    @relation("HiringManager", fields: [hiringManagerId], references: [id])
     applications    CandidateApplication[]
     viewCount       Int      @default(0)
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   enum JobCategory { CONSTRUCTION_SITE OFFICE MANAGEMENT TRAINEE OTHER }
   enum ContractType { CDI CDD STAGE ALTERNANCE INTERIM }
   enum JobStatus { DRAFT PUBLISHED PAUSED CLOSED CANCELLED }

   model Candidate {
     id              String   @id @default(cuid())
     tenantId        String   // V1 : isolation par tenant
     email           String
     passwordHash    String
     firstName       String
     lastName        String
     phoneMobile     String?
     dateOfBirth     DateTime?
     location        String?
     photoUrl        String?
     // Recherche
     desiredJobs     String[] // ex: ["Conducteur Travaux", "Directeur Travaux"]
     desiredContractType ContractType?
     desiredLocation String?
     desiredSalaryMin BigInt?
     availability    String?
     mobilityFlags   Json?    // { dailyTravel, missions, expatriation }
     // Profil
     experiences     CandidateExperience[]
     formations      CandidateFormation[]
     skills          String[]
     languages       Json     // [{ name, level }]
     cvFileUrl       String?
     profileCompletionPct Int @default(0)
     // Statut
     status          CandidateStatus @default(ACTIVE)
     gdprConsent     Boolean  @default(false)
     gdprConsentAt   DateTime?
     applications    CandidateApplication[]
     interviews      Interview[]
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
     @@unique([tenantId, email])
   }
   enum CandidateStatus { ACTIVE INACTIVE BLOCKED HIRED }

   model CandidateExperience {
     id              String   @id @default(cuid())
     candidateId     String
     candidate       Candidate @relation(fields: [candidateId], references: [id])
     position        String
     company         String
     location        String?
     startDate       DateTime
     endDate         DateTime?
     isCurrent       Boolean  @default(false)
     description     String?  @db.Text
     order           Int      @default(0)
   }

   model CandidateFormation {
     id              String   @id @default(cuid())
     candidateId     String
     candidate       Candidate @relation(fields: [candidateId], references: [id])
     diploma         String
     institution     String
     year            Int
     order           Int      @default(0)
   }

   model CandidateApplication {
     id              String   @id @default(cuid())
     tenantId        String
     candidateId     String
     candidate       Candidate @relation(fields: [candidateId], references: [id])
     jobOfferId      String?  // null si candidature spontanée
     jobOffer        JobOffer? @relation(fields: [jobOfferId], references: [id])
     isSpontaneous   Boolean  @default(false)
     status          ApplicationStatus
     currentStep     Int      @default(1)
     totalSteps      Int      @default(5)
     coverLetter     String?  @db.Text
     cvUrl           String?
     rhMessage       String?  @db.Text  // dernier message visible candidat
     internalNotes   String?  @db.Text  // notes RH internes
     matchingScore   Int?     // 0-100, calculé par matching algorithm
     rejectionReason String?
     hiredAt         DateTime?
     submittedAt     DateTime @default(now())
     interviews      Interview[]
   }
   enum ApplicationStatus {
     RECEIVED         // étape 1
     PRESELECTION     // étape 2
     INTERVIEW        // étape 3
     PRACTICAL_TEST   // étape 4
     OFFER            // étape 5
     HIRED            // succès final
     REJECTED         // refusée à toute étape
     WITHDRAWN        // candidat retire
     EXPIRED          // pas de retour 60 j
   }

   model Interview {
     id              String   @id @default(cuid())
     applicationId   String
     application     CandidateApplication @relation(fields: [applicationId], references: [id])
     candidateId     String
     candidate       Candidate @relation(fields: [candidateId], references: [id])
     type            InterviewType
     scheduledAt     DateTime
     durationMinutes Int      @default(60)
     mode            InterviewMode
     location        String?  // si présentiel
     videoUrl        String?  // si visio
     interviewerId   String   // User
     interviewer     User     @relation(fields: [interviewerId], references: [id])
     status          InterviewStatus
     candidateConfirmed Boolean @default(false)
     candidateConfirmedAt DateTime?
     feedback        String?  @db.Text  // par interviewer après
     candidateScore  Int?     // 1-5
     recommendNext   Boolean? // recommandation passer étape suivante
     createdAt       DateTime @default(now())
   }
   enum InterviewType { PHONE_SCREENING MANAGER_INTERVIEW HR_FINAL PRACTICAL_TEST }
   enum InterviewMode { PHONE VIDEO IN_PERSON HYBRID }
   enum InterviewStatus { SCHEDULED COMPLETED CANCELLED NO_SHOW RESCHEDULED }

   model JobMatch {
     id              String   @id @default(cuid())
     candidateId     String
     candidate       Candidate @relation(fields: [candidateId], references: [id])
     jobOfferId      String
     jobOffer        JobOffer @relation(fields: [jobOfferId], references: [id])
     score           Int      // 0-100
     matchedSkills   String[]
     missingRequirements String[]
     computedAt      DateTime @default(now())
     dismissedAt     DateTime? // candidat a dit "pas intéressé"
     @@unique([candidateId, jobOfferId])
   }

API
===
- GET /api/public/[tenant]/job-offers (liste publique avec filtres)
- GET /api/public/[tenant]/job-offers/[slug]
- POST /api/public/[tenant]/applications (candidature à une offre)
- POST /api/public/[tenant]/applications/spontaneous (candidature spontanée)
- POST /api/public/[tenant]/upload-cv (upload PDF, validation taille)
- GET /api/public/[tenant]/branding (logo, couleurs, infos depuis TenantSettings)

WORKFLOW MÉTIER
================
1. **Côté RH** (Sandrine) : crée une JobOffer via /recruitment/jobs/new
   - Status DRAFT puis PUBLISHED quand prête
   - publishedAt = now() au moment de la publication
   - Apparaît dans /recrutement (portail public)
2. **Côté candidat** : Jean candidate via /recrutement/[slug] ou candidature
   spontanée
   - Si pas de compte : création Candidate + envoi email confirmation
   - Si compte existant : login préalable
   - CandidateApplication créée en status RECEIVED
   - Notification Sandrine (email + dashboard RH)
3. **Suivi candidature** : workflow 5 étapes (cf model ApplicationStatus)
   - Chaque transition d'étape : notification email + WhatsApp candidat
   - rhMessage rempli par Sandrine, visible côté candidat
4. **Matching automatique** : à chaque nouvelle JobOffer publiée :
   - Cron job calcule JobMatch pour tous Candidate ACTIVE du tenant
   - Score basé sur skills, experience, location, contractType
   - Si score > 75% → notification email candidat "Une offre pour vous"

LIVRABLES PORTAIL
==================
- 2 pages (/recrutement + /recrutement/[slug])
- Routing dynamique par sous-domaine tenant
- Branding tenant dynamique depuis TenantSettings
- 8 models Prisma migrés (JobOffer, Candidate, CandidateExperience,
  CandidateFormation, CandidateApplication, Interview, JobMatch + extension User)
- Seed : 12 offres BatimCAM (CDI/CDD/Stage), 1 candidat Jean NGONGO avec
  3 candidatures
- Formulaire candidature avec upload CV (S3 / Cloudflare R2)
- Notifications email + WhatsApp candidat
- Audit responsive 7/7 OK
- Audit accessibility WCAG AA
- Commit "feat(portal): portail recrutement public + 8 models candidatures"
```

---

## 🟪 ZONE 3 — ESPACE CANDIDAT CONNECTÉ

### PROMPT 0 — PRÉAMBULE CANDIDAT

```
Phase de développement de l'espace candidat connecté.

CONTEXTE
========
- Le prototype contient 5 écrans candidat :
  screen-cand-dashboard, screen-cand-profil, screen-cand-candidatures,
  screen-cand-entretiens, screen-cand-offres
- Tous data-rh-screen + data-cand-screen
- Standards responsive (44px tap targets, pas 48px strict comme terrain)
- Compte Jean NGONGO jean.ngongo@email.cm pour démo

CONVENTIONS
============
- Écrans prototype : id="screen-cand-<fonction>"
- Pages Next.js : src/app/(candidate)/cand/<fonction>/page.tsx
- Composants : src/components/cand/<NomFonction>.tsx
- API routes : src/app/api/cand/<fonction>/route.ts
- Hooks : src/hooks/useCand<Fonction>.ts

ROUTING + AUTH
===============
- Login candidat séparé du login employé : /cand/login
- JWT spécifique candidat (champ "type": "candidate" dans le token)
- Middleware : tous /cand/* nécessite type=candidate
- Tenant isolation : candidate.tenantId = subdomain.tenantId
- Pas d'accès aux écrans /dg, /daf, etc. même via URL directe

5 FONCTIONS À DÉVELOPPER
==========================
1. Dashboard candidat (vue synthétique)
2. Profil + CV
3. Mes candidatures (avec pipeline visuel 5 étapes)
4. Mes entretiens (à venir + passés)
5. Offres recommandées (matching > 75%)

TÂCHES PRÉPARATOIRES
=====================
- Layout src/app/(candidate)/cand/layout.tsx :
  - Vérifie auth candidate
  - Charge profil complétion %
  - Sidebar avec 5 entrées + Espace public
- Modèles déjà créés en Zone 2 (Candidate, JobOffer, etc.)
- Job cron pour recalcul JobMatch quotidien

LIVRABLES BLOC 0
=================
- Layout protégé candidat
- Auth séparée candidat (login/signup/reset password)
- Seed Jean NGONGO + 3 applications + 1 interview demain
- Test : Jean se connecte → dashboard
- Test RBAC : Jean tente /dg → 403
- Test RBAC : Jean tente d'accéder à un autre candidate → 403
- Audit responsive 7/7 OK
- Commit "chore(cand): bootstrap espace candidat + auth séparée"

Une fois validé, attends prompt 1.1
```

### PROMPT 1.1 — Tableau de bord candidat

```
Fonction 1.1 : tableau de bord candidat.

PROTOTYPE HTML
==============
screen-cand-dashboard. Reproduire avec :
- Bandeau "Espace candidat · BatimCAM SA" + chip "Profil 85% complété"
- KPIs (Candidatures actives 3, Prochains entretiens 1 ambré, Offres pour
  vous 5 vert, Profil 85%)
- Card focus "PROCHAIN ENTRETIEN · DEMAIN" border violet
  * Détails 4 cards (Poste, Avec, Lieu, Mode)
  * Boutons (Confirmer présence, Itinéraire, Préparation)
- Liste 3 candidatures en cours avec statuts
- Section "Offres recommandées" : 2 top offres + lien "Voir les 5"

API
===
- GET /api/cand/dashboard
  → applications actives + prochains entretiens + top 2 matches + completion%

COMPOSANTS src/components/cand/dashboard/
==========================================
- CandHeaderBanner.tsx
- CandKpiRow.tsx (4 KPIs)
- NextInterviewCard.tsx ⚠️ CRITIQUE — card focus
- ActiveApplicationsList.tsx (3 candidatures)
- RecommendedJobsList.tsx (2 top + CTA voir tout)

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /cand

LIVRABLES
=========
- Code complet
- Test : Jean → dashboard avec entretien demain 14h
- Test : tap "Confirmer présence" → Interview.candidateConfirmed = true
- Audit responsive 7/7 OK
- Commit "feat(cand): tableau de bord candidat — fn 1.1"
```

### PROMPT 1.2 — Mon profil et CV

```
Fonction 1.2 : édition profil candidat.

PROTOTYPE HTML
==============
screen-cand-profil. Reproduire avec :
- Header complétion 85% avec progress bar gradient
- Grille 6 sections cards (Identité avec photo, Ma recherche, Expérience pro
  liste, Formation, Compétences chips, Langues, CV PDF upload)

API
===
- GET /api/cand/profile (mon profil complet)
- PATCH /api/cand/profile (update champs)
- POST /api/cand/profile/photo (upload avatar)
- POST /api/cand/profile/cv (upload CV PDF, validation 5 Mo)
- POST /api/cand/profile/experiences (ajouter expérience)
- PATCH /api/cand/profile/experiences/:id (modifier)
- DELETE /api/cand/profile/experiences/:id
- GET /api/cand/profile/completion (% complétion + suggestions)
- GET /api/cand/profile/cv/preview (génère PDF aperçu)

COMPOSANTS src/components/cand/profil/
=======================================
- ProfileCompletionBar.tsx (avec %)
- IdentitySection.tsx (photo + 4 champs)
- SearchPreferencesSection.tsx (4 champs + mobilité checkboxes)
- ExperiencesEditor.tsx ⚠️ liste éditable avec drag-and-drop ordering
- FormationsEditor.tsx
- SkillsEditor.tsx (chips avec ajout)
- LanguagesEditor.tsx
- CvUploadDropzone.tsx ⚠️ drag-and-drop PDF
- PreviewCvButton.tsx (génère PDF côté serveur)

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /cand/profil

LIVRABLES
=========
- Code complet
- Test : Jean modifie sa recherche salaire 850K → 900K → save → propagé
- Test : ajout expérience 2010-2013 → liste à jour
- Test : upload CV PDF → stocké S3/R2 + cvFileUrl mis à jour
- Test : recalcul completion% en temps réel
- Audit responsive 7/7 OK
- Commit "feat(cand): profil + CV + complétion — fn 1.2"
```

### PROMPT 1.3 — Mes candidatures

```
Fonction 1.3 : suivi candidatures avec pipeline visuel 5 étapes.

PROTOTYPE HTML
==============
screen-cand-candidatures. Reproduire avec :
- Header "3 actives · 1 archivée"
- 3 onglets (Actives 3, Archivées 1, Toutes 4)
- 3 cards de candidatures actives avec :
  * Icône métier + titre + chips chantier/contrat/salaire
  * Statut chip (En entretien ambré / Présélection vert / Reçue gris)
  * **Pipeline 5 étapes** : Reçue ✓ → Présélection ✓ → Entretien ⏳ → Test 4
    → Offre 5 (cercles 32×32 colorés selon avancement)
  * Message RH si rempli (background surface-alt)
  * Boutons actions (Voir l'offre, Voir détail entretien)
- Cas spécial : candidature 18j sans retour → alerte ambré "Pas de retour
  depuis 18 jours"

PIPELINE VISUEL
================
Cohérent avec celui de la GED (workflows) :
- Cercle 32×32 (28×28 mobile)
- Étape passée : background vert + checkmark blanc
- Étape en cours : background ambré + sablier
- Étapes futures : background gris foncé + numéro
- Lignes de connexion : vert pour passées, gris pour futures

API
===
- GET /api/cand/applications?status=&page=
- GET /api/cand/applications/:id (détail + historique transitions)
- POST /api/cand/applications/:id/withdraw (retirer candidature)
- POST /api/cand/applications/:id/follow-up (envoyer message RH)
- GET /api/cand/applications/:id/timeline (chronologie complète)

COMPOSANTS src/components/cand/candidatures/
==============================================
- ApplicationsHeader.tsx
- ApplicationsTabs.tsx
- ApplicationCard.tsx ⚠️ avec pipeline visuel
- ApplicationPipelineVisual.tsx ⚠️ CRITIQUE — réutilisable (proche du workflow GED)
- StaleApplicationAlert.tsx (si > 14 j sans retour)
- ApplicationDetailDrawer.tsx (timeline complète)
- FollowUpModal.tsx (relancer RH poliment)
- WithdrawApplicationModal.tsx (avec confirmation)

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /cand/candidatures

LIVRABLES
=========
- Code complet
- Test : Jean a 3 candidatures avec statuts différents
- Test : pipeline visuel affiche correctement les transitions
- Test : Jean retire candidature Chef Chantier Bonabéri → withdrawn
- Test : Jean envoie follow-up → notification RH
- Audit responsive 7/7 OK
- Commit "feat(cand): candidatures + pipeline 5 étapes — fn 1.3"
```

### PROMPT 1.4 — Mes entretiens

```
Fonction 1.4 : gestion des entretiens candidat.

PROTOTYPE HTML
==============
screen-cand-entretiens. Reproduire avec :
- Section "À venir" : card focus border violet entretien demain 14h
  * Détails 4 cards (Poste, Avec, Lieu, Mode)
  * Section "Préparation" avec 4 items checkmarks verts
  * 4 boutons 48px (Confirmer ma présence, Itinéraire, Calendrier, Contacter RH)
- Section "Entretiens effectués" : 2 lignes historique avec statut Validé

API
===
- GET /api/cand/interviews/upcoming
- GET /api/cand/interviews/past
- GET /api/cand/interviews/:id (détail)
- POST /api/cand/interviews/:id/confirm (candidateConfirmed = true)
- POST /api/cand/interviews/:id/request-reschedule
- GET /api/cand/interviews/:id/itinerary (Maps URL)
- GET /api/cand/interviews/:id/preparation-tips
- GET /api/cand/interviews/:id/ics (export calendrier .ics)

COMPOSANTS src/components/cand/entretiens/
============================================
- UpcomingInterviewCard.tsx ⚠️ CRITIQUE — card focus avec préparation
- PreparationChecklist.tsx
- ConfirmAttendanceButton.tsx
- ItineraryModal.tsx (avec Google Maps URL)
- AddToCalendarButton.tsx (.ics download)
- ContactRhModal.tsx
- PastInterviewsList.tsx

⚠️ NOTIFICATIONS
=================
- J-2 avant entretien : email + WhatsApp rappel
- J-0 matin : WhatsApp "Votre entretien aujourd'hui à 14h"
- Si pas de confirmation 24h avant : email "Merci de confirmer"

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /cand/entretiens

LIVRABLES
=========
- Code complet
- Test : Jean voit son entretien demain 14h avec préparation détaillée
- Test : confirmation présence → status mis à jour + notification RH
- Test : génération .ics → fichier téléchargeable
- Test : si pas de confirmation 24h avant → notification rappel
- Audit responsive 7/7 OK
- Commit "feat(cand): entretiens + préparation + notifications — fn 1.4"
```

### PROMPT 1.5 — Offres recommandées

```
Fonction 1.5 : matching automatique offres ↔ profil candidat.

PROTOTYPE HTML
==============
screen-cand-offres. Reproduire avec :
- Header "5 offres avec score > 75%"
- Liste 5 offres en cards avec :
  * **Score matching circulaire** (cercle 64×64 gradient violet avec %)
  * Titre + chips contrat
  * Méta-infos (📍 entreprise + chantier, 💰 fourchette salaire, ⏱ date publi)
  * **Chips compétences matchées** avec ✓ vert ou warning ambré
  * Bouton "Voir l'offre →"
- Astuce en bas : compléter profil pour meilleur matching

ALGORITHME MATCHING
====================
Calcul score 0-100 basé sur :
- 40% : skills overlap (% des skills offre dans candidate.skills)
- 25% : experience minimum (si candidate experience >= offer.experienceMin)
- 15% : location match (candidate.desiredLocation vs offer.location)
- 10% : contract type match
- 10% : salary range overlap

Cron job recompute quotidien (3h00 du matin) :
- Pour chaque candidate ACTIVE
- Pour chaque jobOffer PUBLISHED non-dismissed
- Calculer score + update JobMatch
- Si nouveau match > 75% → notification email candidat "Une nouvelle offre pour
  vous"

API
===
- GET /api/cand/recommendations?minScore=75
- GET /api/cand/recommendations/all (paginé)
- POST /api/cand/recommendations/:jobId/dismiss (pas intéressé)
- POST /api/cand/recommendations/:jobId/apply (raccourci candidature)
- POST /api/cand/recommendations/recompute (forcer recalcul immédiat)

COMPOSANTS src/components/cand/offres/
========================================
- RecommendationsHeader.tsx
- JobMatchCard.tsx ⚠️ CRITIQUE — score circulaire + chips skills
- MatchScoreCircle.tsx (64×64 gradient violet selon score)
- MatchedSkillsChips.tsx (vert si ✓, ambré si manque)
- ImproveMatchingHint.tsx (astuce profil à compléter)

⚠️ COULEURS SCORE
==================
- Score 90-100 : gradient #A855F7 → #7E22CE (violet foncé)
- Score 80-89 : gradient #A855F7 → #C084FC (violet clair)
- Score 75-79 : gradient #C084FC → #A855F7 (violet pastel)
- Score < 75 : pas affiché par défaut

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /cand/offres

LIVRABLES
=========
- Code complet
- Cron job recompute quotidien
- Test : Jean a 5 recommandations triées par score (92%, 88%, 82%, 78%, 76%)
- Test : Jean tape "Postuler" sur recommandation → wizard candidature rempli
  auto avec profile + cv existant
- Test : nouvelle JobOffer publiée → 24h après, Jean reçoit email si score > 75
- Test : Jean dismiss une recommandation → JobMatch.dismissedAt = now() → ne
  réapparaît pas
- Audit responsive 7/7 OK
- Commit "feat(cand): recommandations + matching automatique — fn 1.5"
```

---

## ✅ FIN — Zone publique + Espace candidat complets

Tu viens de couvrir :
- **Zone 1** : Landing T-ERP publique (1 page longue scrollable, 10 sections)
- **Zone 2** : Portail recrutement BatimCAM (2 pages : liste + détail offre)
- **Zone 3** : Espace candidat connecté (5 fonctions)

**Total : 8 écrans ajoutés**, prototype passe de 106 à 114 écrans.

POINTS FORTS DE CETTE ZONE
============================
- **Landing T-ERP marketing** professionnelle (tarifs FCFA, témoignages CM,
  comparaison Sage/Odoo, FAQ)
- **Portail tenant** avec branding dynamique (logo + couleurs tenant)
- **Pipeline visuel 5 étapes** cohérent avec workflows GED
- **Matching automatique** offres ↔ candidats avec score 0-100
- **Notifications multicanal** : email + WhatsApp + push pour candidats
- **Authentification séparée** : auth candidate distincte de auth employee
- **Isolation V1** : un candidat par tenant (Talent Pool en V2)
- **Conformité Cameroun** : loi 2010/012 protection données personnelles,
  consentement RGPD-like, droit à l'effacement

ESTIMATION EFFORT
==================
- **Zone 1 Landing** : 4-5 jours (statique + formulaire démo + SEO + Lighthouse)
- **Zone 2 Portail** : 6-7 jours (8 models Prisma + 2 pages publiques + auth
  candidat + upload CV + matching cron)
- **Zone 3 Candidat** : 7-9 jours (5 fonctions avec pipeline visuel + matching
  + notifications multicanal + auth séparée)
- **TOTAL : 17-21 jours**

INTERACTIONS AVEC AUTRES PROFILS
=================================
- **RH (Sandrine)** : crée les JobOffer, traite les CandidateApplication,
  valide les statuts (preselection, interview, offer, hired)
- **Manager du poste** : interviewer.userId, conduit l'entretien, donne
  feedback dans Interview.feedback + recommendNext
- **DG (Albert)** : valide les embauches finales avant signature
- **GED (Christelle)** : archive les CV et applications hors-DUA
  (5 ans après refus)
- **IT (Étienne)** : ne crée PAS de compte employé tant que candidat pas hired
- **WhatsApp Business** : 3 nouveaux templates approuvés :
  * APPLICATION_RECEIVED
  * APPLICATION_STATUS_CHANGED
  * INTERVIEW_SCHEDULED

PROCHAINE ÉTAPE
================
L'écosystème complet T-ERP est maintenant en place :
- 13 profils internes (DG → Ouvrier)
- 3 zones publiques (Landing + Portail tenant + Espace candidat)
- 114 écrans dans le prototype

Prochaine ambition naturelle :
1. **Déploiement Railway/Neon production** (J7 du plan initial)
2. **Tests E2E** sur les 75+ fonctions
3. **Module Sous-traitance** (encore à concevoir : sous-traitants BTP, contrats,
   factures, retenue de garantie)
4. **Internationalisation** : Sénégal, Côte d'Ivoire, Gabon
