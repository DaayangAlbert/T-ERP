# DG · BLOC 2 — Pilotage et validations

**4 modules · 4 prompts à enchaîner**

Méthode : à chaque prompt, l'agent lit le contexte projet, ouvre le prototype HTML
sur l'écran concerné, et livre **prototype + code + commit** en une seule passe.

---

## 🟣 PROMPT 2.1 — Mes validations (vue DG enrichie)

```
Module : Mes validations · vue DG.

CONTEXTE
========
L'écran screen-validations existe dans le prototype mais reste basique. On l'enrichit
pour le DG : workflow visuel, historique, délégation, validation en lot.

PROTOTYPE HTML — ENRICHISSEMENT screen-validations
===================================================

1. Garde la structure existante (KPIs + filtres + listview), mais ajoute :

2. Section "Workflow visuel" (au-dessus de la listview, repliable) :
   Pour la demande sélectionnée, affiche un diagramme horizontal des étapes :
   Initiateur → N1 RH (✓) → N2 DAF (✓) → N3 DG (en attente, mon icône en violet) → Notification banque
   Avec dates de validation et durée à chaque étape.

3. Sélection multiple + bouton "Valider en lot" :
   Quand des lignes sont cochées, bouton vert "Valider sélection (N)" apparaît,
   qui ouvre une modale de confirmation avec total cumulé.

4. Action "Demander justification" sur chaque ligne :
   Bouton secondaire qui ouvre une modale pour demander un complément
   d'information à l'initiateur (sans rejeter).

5. Action "Déléguer cette validation" :
   Modale permettant de déléguer ponctuellement à un autre cadre
   (DAF, Directeur technique) sans modifier les délégations permanentes.

6. Onglet "Historique" en haut :
   Liste paginée des validations passées (validées, rejetées, expirées) avec
   filtre par période et par type. Recherche full-text sur le libellé.

7. Onglet "Délégations permanentes" :
   Tableau des délégations actives : qui peut valider en mon absence,
   pour quels types, jusqu'à quel montant, sur quelle période. Bouton "+ Nouvelle délégation".

CODE NEXT.JS
============

a) PRISMA — Étendre :
   model Validation {
     ...
     workflow      Json     // étapes du workflow avec dates
     comments      Json[]   // historique commentaires + demandes justification
   }
   model Delegation {
     id          String   @id @default(cuid())
     tenantId    String
     fromUserId  String
     toUserId    String
     types       ValidationType[]
     maxAmount   BigInt?
     startDate   DateTime
     endDate     DateTime?
     active      Boolean  @default(true)
     createdAt   DateTime @default(now())
   }
   Migration : pnpm prisma migrate dev --name validation_workflow_delegations

b) API :
   - GET /api/validations (liste pending courant, déjà existante : enrichir avec workflow)
   - GET /api/validations/history (paginée)
   - POST /api/validations/:id/approve
   - POST /api/validations/:id/reject (avec motif)
   - POST /api/validations/:id/request-info
   - POST /api/validations/bulk-approve (ids[])
   - GET /api/validations/delegations
   - POST /api/validations/delegations
   - PATCH /api/validations/delegations/:id (désactiver)

c) Composants src/components/validations/ :
   - WorkflowDiagram.tsx
   - BulkApproveBar.tsx
   - RequestInfoModal.tsx
   - DelegateModal.tsx
   - DelegationsTab.tsx
   - ValidationHistoryTab.tsx

d) Pages :
   - /validations/page.tsx (refonte avec tabs : En attente / Historique / Délégations)
   - /validations/[id]/page.tsx (détail + workflow + actions)

SEED
====
Ajouter 7 validations en attente (déjà dans le prototype : paie Avril, avenant Pont,
BC carburant, embauche 3 ingénieurs, BC pelle CAT 320, marché Bonabéri, congé Bello),
plus 30 validations historiques (validées/rejetées dans les 60 derniers jours),
plus 2 délégations actives (DAF peut valider jusqu'à 20 M FCFA en mon absence).

TESTS
=====
- Validation simple : un clic ✓ valide la demande, statut change, notification envoyée
- Validation en lot : sélectionner 3 lignes, valider, les 3 passent en validé
- Demande justification : modale → message envoyé à l'initiateur (audit_log + notification)
- Délégation : créer une délégation au DAF, vérifier qu'elle apparaît côté DAF dans son
  écran de validations

LIVRABLES
=========
- Prototype enrichi (screen-validations modifié, sans nouvel id)
- Code complet
- Commit "feat(dg): mes validations enrichies — workflow, lot, délégation"
```

---

## 🟣 PROMPT 2.2 — Rapports consolidés (vue DG)

```
Module : Rapports consolidés · vue DG.

CONTEXTE
========
L'écran screen-reports existe avec des cards favoris et une listview. On l'enrichit
pour permettre au DG de générer des rapports stratégiques personnalisés.

PROTOTYPE HTML — ENRICHISSEMENT screen-reports
===============================================

1. Garde les 4 favoris en haut (CA marge, Trésorerie, Avancement chantiers, Effectifs).

2. Ajoute une section "Rapports stratégiques DG" (3-4 cards en haut, gradient violet pâle) :
   - Synthèse exécutive hebdomadaire (1 page A4 : KPIs + alertes + actions)
   - Tableau de bord stratégique mensuel (5 pages : finance + opérations + RH + HSE)
   - Bilan annuel groupe (rapport intégral pour AG)
   - Note d'activité trimestrielle (pour banques et investisseurs)

3. Bouton primary "Créer un rapport sur mesure" qui ouvre un wizard :
   Étape 1 : Type (financier / opérationnel / RH / HSE / mixte / sur-mesure)
   Étape 2 : Période et périmètre (groupe / société / chantiers)
   Étape 3 : Indicateurs et graphes (multi-select dans une bibliothèque de blocs)
   Étape 4 : Mise en page (logo, signataire, destinataires)
   Étape 5 : Aperçu + génération PDF + envoi email

4. Section "Rapports planifiés" (nouvelle) :
   Liste des rapports générés automatiquement chaque période :
   - Tableau de bord lundi 6h → DG, DAF, Dir. technique
   - Synthèse mensuelle 1er du mois 8h → conseil d'administration
   Avec boutons activer/désactiver, modifier destinataires.

5. Section "Historique" (existante, à enrichir) :
   Filtres par type, auteur, période. Bouton "re-générer" sur chaque ligne.

CODE
====

a) PRISMA :
   model Report {
     id            String   @id @default(cuid())
     tenantId      String
     authorId      String
     templateId    String?
     type          ReportType
     title         String
     period        String
     parameters    Json
     blocks        Json     // [{ type: "kpi", ... }, { type: "chart", ... }]
     pdfUrl        String?
     status        ReportStatus
     scheduledRule String?  // cron-like si rapport planifié
     recipients    Json?
     generatedAt   DateTime?
     createdAt     DateTime @default(now())
   }
   enum ReportType { EXECUTIVE_SUMMARY MONTHLY_DASHBOARD ANNUAL_GROUP QUARTERLY_NOTE CUSTOM }
   enum ReportStatus { DRAFT GENERATED PUBLISHED ARCHIVED }
   Migration : pnpm prisma migrate dev --name reports

b) API :
   - GET /api/reports (avec filtres)
   - POST /api/reports (création depuis wizard)
   - GET /api/reports/:id/pdf (génération à la volée si pas en cache)
   - POST /api/reports/:id/regenerate
   - POST /api/reports/:id/send (email aux destinataires)
   - GET /api/reports/scheduled
   - POST /api/reports/scheduled (créer rapport planifié)

c) Pages :
   - /rapports/page.tsx (refonte avec sections stratégiques + planifiés + historique)
   - /rapports/nouveau/page.tsx (wizard 5 étapes)
   - /rapports/[id]/page.tsx (preview + actions)

d) Composants src/components/reports/ :
   - StrategicReportCard.tsx
   - ReportWizard.tsx (avec stepper)
   - BlockLibrary.tsx (bibliothèque de blocs : KPI, graphe, tableau, texte)
   - ReportPreview.tsx
   - ScheduledReportsTable.tsx
   - ReportPDF.tsx (template React-PDF avec layout multi-pages, logo, footer)

SEED
====
- 4 templates de rapports stratégiques pré-configurés
- 8 rapports historiques (4 mensuels + 4 trimestriels) avec PDF générés
- 2 rapports planifiés actifs

TESTS
=====
- Cliquer "Synthèse exécutive hebdomadaire" → wizard pré-rempli → génération PDF en < 5s
- Wizard sur-mesure : créer un rapport mixte avec 3 KPIs et 2 graphes → PDF cohérent
- Rapport planifié : créer un rapport hebdomadaire, vérifier que la cron-like est en base

LIVRABLES
=========
- Prototype enrichi
- Code complet avec PDF multi-pages fonctionnel
- Commit "feat(dg): rapports consolidés stratégiques + wizard sur-mesure"
```

---

## 🟣 PROMPT 2.3 — Configuration (vue DG/admin)

```
Module : Configuration · vue DG (admin tenant).

CONTEXTE
========
L'écran screen-config existe avec 8 cards-tuiles. On le rend pleinement fonctionnel
pour que le DG paramètre son tenant : identité entreprise, modules actifs, plan
comptable, paramètres paie, workflows de validation.

PROTOTYPE HTML — ENRICHISSEMENT screen-config
==============================================

Crée 8 sous-écrans détaillés derrière chaque card existante :

1. screen-config-entreprise : identité tenant
   - Raison sociale, RCCM, NIU, capital
   - Logo (upload), couleur primaire (color picker, met à jour le CSS du tenant)
   - Coordonnées siège + établissements multiples
   - Représentants légaux (DG, DAF...)
   - Comptes bancaires entreprise
   - Plan d'abonnement T-ERP et facturation

2. screen-config-modules : activation modules
   - Liste des 19 modules avec switch on/off
   - Indicateurs "essentiel", "premium" sur certains modules
   - Date d'activation, par qui

3. screen-config-comptable : plan comptable SYSCOHADA
   - Arborescence du plan (classes 1 à 9)
   - Personnalisations entreprise (sous-comptes ajoutés)
   - Import/export plan

4. screen-config-paie : paramètres paie
   - Barèmes IRPP par tranche (éditable, historisé par date d'effet)
   - Taux CNPS, CFC, FNE, RAV, TC, CAC, CFS (éditables)
   - Codes paie A001-A072 (libellés et règles de calcul)
   - Conventions collectives applicables
   - Périodicité paie (mensuelle / quinzaine pour journaliers)

5. screen-config-workflows : workflows de validation
   - Tableau seuils par type (paie, dépense, achat, embauche, marché)
   - Niveaux N1/N2/N3 avec rôles validateurs
   - Bouton "Tester un workflow" qui simule

6. screen-config-notifications : règles notifications
   - Matrice destinataires × événements × canaux (email, push, in-app, SMS)
   - Templates email (sujet + corps avec variables)

7. screen-config-referentiels : référentiels et codes
   - Catégories employés, postes, départements
   - Types de chantiers, statuts
   - Tiers (clients, fournisseurs)

8. screen-config-integrations : intégrations API
   - Banques (UBA, BICEC, Afriland, Ecobank, SGBC) — clés API
   - CNPS, DGI (placeholders pour quand les API seront dispo)
   - Mobile money (MTN MoMo, Orange Money)
   - Email (Resend, configuré globalement)
   - Stockage (S3 / R2 / Backblaze)

CODE
====

a) PRISMA :
   model TenantSettings {
     id            String   @id @default(cuid())
     tenantId      String   @unique
     tenant        Tenant   @relation(fields: [tenantId], references: [id])
     identity      Json     // raison sociale, NIU, capital...
     modules       Json     // { msg: true, payroll: true, ... }
     payrollRates  Json     // barèmes paie historisés
     workflows     Json     // règles de validation
     notifications Json
     integrations  Json     // clés API chiffrées
     updatedAt     DateTime @updatedAt
   }
   Migration : pnpm prisma migrate dev --name tenant_settings

b) API :
   - GET /api/config/:section
   - PATCH /api/config/:section (avec validation Zod selon section)
   - POST /api/config/test-workflow (simule un workflow)
   - POST /api/config/integrations/:service/test (test connexion API)

c) Pages :
   - /configuration/page.tsx (les 8 cards)
   - /configuration/[section]/page.tsx (détail de chaque section)

d) Composants src/components/config/ :
   - ConfigCard.tsx (card-tuile cliquable)
   - IdentityForm.tsx
   - ModulesGrid.tsx (avec switches)
   - PayrollRatesEditor.tsx (table éditable + historisation)
   - WorkflowEditor.tsx (drag-and-drop niveaux)
   - NotificationsMatrix.tsx
   - IntegrationCard.tsx (avec test connexion)

SÉCURITÉ
========
- Toutes les routes /configuration sont protégées par Role.DG ou Role.TENANT_ADMIN
- Toute modification est tracée dans audit_log avec ancien et nouveau valeurs
- Les clés API d'intégration sont chiffrées en base (utilise crypto-js avec un secret en env)

SEED
====
- Initialiser TenantSettings pour BatimCAM SA avec valeurs réalistes
- Barèmes IRPP 2026 corrects, taux CNPS 4.20% salarié + 7%+4.20%+5% patronal
- 5 workflows de validation seedés (paie 50M, dépense 30M, achat 20M, embauche, marché 100M)

TESTS
=====
- Modifier le logo : upload → s'affiche dans le header en moins de 5 secondes
- Modifier la couleur primaire → le thème entier du tenant change
- Désactiver un module → l'item disparaît de la sidebar à la prochaine navigation
- Modifier un taux CNPS et regénérer un bulletin → le nouveau calcul s'applique
- Audit log : toutes les modifications visibles dans /securite > audit

LIVRABLES
=========
- Prototype : screen-config + 8 sous-écrans
- Code complet
- Commit "feat(dg): configuration entreprise complète — 8 sections"

⚠️ NOTE
========
Module dense. Si l'agent estime trop large, livrer en V1 :
- Sections 1, 2, 4, 5 fonctionnelles
- Sections 3, 6, 7, 8 en placeholder éditable mais non exploité par le système
Marquer dans le commit "V1 fonctionnelle, sections 3/6/7/8 en V2".
```

---

## 🟣 PROMPT 2.4 — Sécurité & rôles (vue DG)

```
Module : Sécurité & rôles · vue DG.

CONTEXTE
========
L'écran screen-security existe avec 13 rôles et un audit log. On le rend pleinement
fonctionnel pour que le DG gère utilisateurs, rôles, permissions, audit, sessions.

PROTOTYPE HTML — ENRICHISSEMENT screen-security
================================================

1. Garde la structure existante (KPIs, listview rôles, journal audit).

2. Ajoute des onglets en haut :
   - Rôles (existant)
   - Utilisateurs
   - Audit
   - Sessions
   - Authentification

3. Onglet "Utilisateurs" :
   Listview des 487 utilisateurs avec colonnes :
   matricule, nom, email, rôle, statut, dernière connexion, 2FA on/off.
   Filtres : rôle, statut (actif / suspendu / archivé), 2FA.
   Actions par ligne : modifier rôle, suspendre, réinitialiser mot de passe,
   forcer 2FA, voir sessions actives.
   Bouton "+ Nouvel utilisateur" ouvre une modale (formulaire complet).
   Bouton "Importer en lot" (CSV upload).

4. Onglet "Rôles" (enrichissement) :
   Sur clic d'un rôle, ouvrir un panneau latéral avec :
   - Liste détaillée des permissions (matrice modules × actions CRUD)
   - Liste des utilisateurs ayant ce rôle (cliquable)
   - Bouton "Dupliquer ce rôle" pour créer un rôle personnalisé

5. Onglet "Audit" (enrichissement) :
   Listview paginée du audit log avec filtres avancés :
   période, utilisateur, type d'action, entité.
   Recherche full-text. Export CSV.
   Visualisation en timeline pour un utilisateur spécifique.

6. Onglet "Sessions" :
   Listview des sessions actives :
   utilisateur, IP, localisation (basée sur IP), navigateur, début, dernière activité.
   Bouton "Déconnecter" par session, "Tout déconnecter" pour un utilisateur.
   Détection sessions suspectes (IP inhabituelle) avec alertes.

7. Onglet "Authentification" :
   - Politique de mots de passe (longueur min, complexité, expiration)
   - 2FA obligatoire pour quels rôles
   - SSO (Google Workspace, Microsoft 365 — placeholders)
   - Liste des appareils de confiance par utilisateur

CODE
====

a) PRISMA :
   model Session {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     token       String   @unique
     ipAddress   String?
     userAgent   String?
     location    String?  // résolu via API IP geolocation
     lastActivityAt DateTime @default(now())
     expiresAt   DateTime
     createdAt   DateTime @default(now())
   }
   model CustomRole {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     basedOn     Role
     permissions Json     // { sites: ["read"], payroll: ["read", "write"], ... }
     userCount   Int      @default(0)
     createdAt   DateTime @default(now())
   }
   Migration : pnpm prisma migrate dev --name security_sessions_custom_roles

b) API :
   - GET /api/security/users (paginée + filtres)
   - POST /api/security/users (création)
   - PATCH /api/security/users/:id
   - POST /api/security/users/:id/suspend
   - POST /api/security/users/:id/reset-password (envoie email)
   - POST /api/security/users/:id/force-2fa
   - GET /api/security/users/import-template (CSV)
   - POST /api/security/users/import (CSV upload)
   - GET /api/security/audit (paginée + filtres)
   - GET /api/security/sessions (toutes les sessions actives)
   - DELETE /api/security/sessions/:id
   - DELETE /api/security/sessions/user/:userId (toutes sessions d'un user)
   - GET/PATCH /api/security/auth-policy

c) Pages :
   - /securite/page.tsx (onglets)
   - /securite/users/[id]/page.tsx (détail utilisateur)

d) Composants src/components/security/ :
   - UsersTable.tsx
   - UserFormModal.tsx
   - UserImportModal.tsx
   - RoleDetailPanel.tsx
   - PermissionsMatrix.tsx
   - AuditLogTable.tsx (avec filtres avancés)
   - SessionsTable.tsx
   - AuthPolicyForm.tsx

SÉCURITÉ
========
- Toutes routes protégées Role.DG ou Role.TENANT_ADMIN
- Toute action sur un utilisateur génère une entrée audit_log
- Réinitialisation mot de passe : token de 24h envoyé par email Resend
- Suppression session : invalide le JWT côté serveur (blacklist en cache)

SEED
====
- 487 utilisateurs déjà seedés depuis J1
- 30 sessions actives simulées (IP variées, dont 2 suspectes)
- 100 entrées audit_log historiques (60 derniers jours)
- 2 rôles personnalisés : "Validateur dérogatoire" (déjà mentionné), "Auditeur externe"
- Politique mot de passe : 10 caractères min, complexité requise, expiration 90j

TESTS
=====
- Créer un utilisateur via formulaire → email d'invitation envoyé
- Modifier rôle d'un user → accès au modules change immédiatement
- Suspendre un user → tentative de connexion bloquée
- Déconnecter une session → user redirigé vers /login lors du prochain refresh
- Filtre audit par utilisateur Albert → voir uniquement ses actions
- Import CSV : préparer un fichier de 5 utilisateurs, importer, vérifier création

LIVRABLES
=========
- Prototype : screen-security enrichi avec 5 onglets
- Code complet
- Commit "feat(dg): sécurité et rôles complets — utilisateurs, audit, sessions, auth"
```

---

## ✅ Fin Bloc 2

Une fois les 4 modules livrés, demande le Bloc 3 (Pilotage opérationnel : Chantiers,
Planning, Ressources humaines).

Format : "Bloc 2 terminé. Tu peux me livrer le Bloc 3."
