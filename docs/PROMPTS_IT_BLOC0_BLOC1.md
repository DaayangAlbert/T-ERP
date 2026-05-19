# INFORMATICIEN D'ENTREPRISE · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Informaticien d'entreprise (Étienne ONANA · siège BatimCAM Yaoundé)

**Position hiérarchique :** rapporte à la DG (en pratique souvent à la DAF dans
les PME camerounaises). Profil **technique côté client** : administre le tenant
batimcam.cm, gère les utilisateurs, configure les paramètres, surveille les
intégrations.

**Architecture RBAC** : `role: IT_ADMIN` + `assignedSiteIds: []` (pas de chantier)
+ pouvoirs spéciaux (`canManageUsers`, `canManageRoles`, `canManageTenantSettings`,
`canManageIntegrations`, `canViewTechnicalLogs`).

**Pas de PWA** : profil bureau au siège uniquement. Responsive standard (40-44px
tap targets), tableaux denses acceptés.

---

## ⚠️ DIFFÉRENCE CRUCIALE SUPER-ADMIN vs IT_ADMIN

| Aspect | Super-Admin Anthropic/T-ERP | Informaticien BatimCAM |
|--------|---------------------------|------------------------|
| Périmètre | TOUS les tenants | UN seul tenant (batimcam.cm) |
| Console | /admin (theme noir/cyan) | /it (theme violet BatimCAM) |
| Login | superadmin@terp.cm | etienne@batimcam.cm |
| Crée | Nouveaux tenants | Utilisateurs dans BatimCAM |
| Facture | Abonnements T-ERP | Rien |
| Infra | Railway/Neon/Cloudflare | Rien |
| Sécurité | MFA hardware obligatoire | MFA OTP |
| Logs vus | Système global | Tenant BatimCAM uniquement |

**Garde-fous critiques** : un IT_ADMIN **ne peut pas** :
- Se promouvoir DG ou créer un autre IT_ADMIN (nécessite workflow DG)
- Désactiver le compte du DG
- Modifier les écritures comptables, paies, contrats
- Lire les documents confidentiels (paie individuelle, contentieux RH)
- Voir les autres tenants T-ERP

---

## ⚠️ PROTOCOLE RESPONSIVE

Tap targets standards desktop. Tableaux denses acceptés.

```bash
pnpm exec tsx scripts/audit-responsive.ts /it/<route>
```

Format commit : "✅ Audit : 7/7 responsive OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE INFORMATICIEN

```
Phase de développement du profil Informaticien d'entreprise (Étienne ONANA).

CONTEXTE
========
- Le prototype HTML contient 5 écrans Espace IT :
  screen-it-dashboard, screen-it-users, screen-it-settings,
  screen-it-sites, screen-it-integrations
- Tous ont les attributs data-rh-screen + data-it-screen
- Étienne ONANA a role=IT_ADMIN avec 5 flags spéciaux
- assignedSiteIds=[] (pas de chantier)
- Il rapporte au DG (Albert DAAYANG)
- Profil TECHNIQUE côté client : administre tenant batimcam.cm

CONVENTIONS
============
- Écrans prototype : id="screen-it-<fonction>"
- Pages Next.js : src/app/(app)/it/<fonction>/page.tsx
- Composants : src/components/it/<NomFonction>.tsx
- API routes : src/app/api/it/<fonction>/route.ts
- Hooks : src/hooks/useIt<Fonction>.ts

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     IT_ADMIN
   }

2. Étendre le User model avec pouvoirs spéciaux IT :
   model User {
     ...
     canManageUsers          Boolean @default(false)
     canManageRoles          Boolean @default(false)
     canManageTenantSettings Boolean @default(false)
     canManageIntegrations   Boolean @default(false)
     canViewTechnicalLogs    Boolean @default(false)
   }

3. Créer le layout dédié src/app/(app)/it/layout.tsx :
   - Vérifie Role.IT_ADMIN (sinon redirect /dashboard)
   - Charge le ItContext avec compteurs (sessions, alertes, intégrations)
   - Vérifie MFA actif (sinon redirect /mfa/setup)
   - Wrap children dans <div data-it-screen data-rh-screen className="rh-page">

4. Étendre Prisma — 5 nouveaux/étendus models :

   model TenantSettings {
     id                String   @id @default(cuid())
     tenantId          String   @unique
     // Identité
     legalName         String
     legalForm         String   // SA, SARL, SAS
     rcNumber          String
     niu               String   // NIU DGI Cameroun
     cnpsNumber        String
     headquartersAddress String
     // Branding
     logoUrl           String?
     primaryColor      String   @default("#A855F7")
     secondaryColor    String   @default("#7E22CE")
     tagline           String?
     // Localisation
     defaultLanguage   String   @default("fr-CM")
     defaultCurrency   String   @default("XAF")
     timezone          String   @default("Africa/Douala")
     dateFormat        String   @default("DD/MM/YYYY")
     firstDayOfWeek    Int      @default(1)  // 1 = lundi
     // Sécurité
     minPasswordLength Int      @default(12)
     passwordRequireUppercase Boolean @default(true)
     passwordRequireDigit     Boolean @default(true)
     passwordRequireSymbol    Boolean @default(true)
     passwordExpiryDays       Int    @default(90)
     sessionInactivityMinutes Int    @default(30)
     mfaRequiredForDirection  Boolean @default(true)
     mfaRequiredForTransverse Boolean @default(true)
     mfaRequiredForAll        Boolean @default(false)
     autoDeactivateInactiveDays Int  @default(60)
     // Exercice fiscal
     fiscalYearStart   Int      @default(1)   // mois de début
     chartOfAccounts   String   @default("SYSCOHADA_2018")
     standardVatRate   Float    @default(19.25)
     // Notifications globales
     emailEnabled      Boolean  @default(true)
     whatsappEnabled   Boolean  @default(true)
     browserPushEnabled Boolean @default(true)
     smsEnabled        Boolean  @default(false)
     digestWeeklyEnabled Boolean @default(true)
     // Quotas
     storageQuotaGb    Int      @default(200)
     storageUsedGb     Float    @default(0)
     updatedAt         DateTime @updatedAt
     updatedBy         String?
   }

   model Integration {
     id              String   @id @default(cuid())
     tenantId        String
     code            String   // "CNPS_DIPE", "DGI_ETAX", "AFRILAND", "SGBC"
     name            String
     category        IntegrationCategory
     endpoint        String?
     credentials     Json?    // chiffrés
     status          IntegrationStatus
     lastSyncAt      DateTime?
     lastSyncSuccess Boolean?
     lastError       String?
     retryCount      Int      @default(0)
     maxRetries      Int      @default(5)
     frequency       String?  // "hourly", "daily_6am", "monthly_day5"
     webhookSecret   String?
     active          Boolean  @default(true)
     @@unique([tenantId, code])
   }
   enum IntegrationCategory {
     SOCIAL_SECURITY  // CNPS
     TAX_AUTHORITY    // DGI
     BANK             // Afriland, SGBC, BICEC
     EMAIL            // Resend, Sendgrid
     SMS_MESSAGING    // WhatsApp, Orange
     STORAGE          // Cloudflare R2, S3
     MONITORING       // Sentry, Datadog
     OTHER
   }
   enum IntegrationStatus { ACTIVE ERROR PAUSED DEACTIVATED }

   model ApiKey {
     id              String   @id @default(cuid())
     tenantId        String
     name            String   // "Application mobile BatimCAM"
     keyPrefix       String   // tEr_live_xxx... (visible)
     keyHash         String   // bcrypt(secret) en BDD
     scopes          String[] // ["read:sites", "write:timesheets"]
     ipWhitelist     String[] // optionnel
     createdBy       String   // User
     lastUsedAt      DateTime?
     expiresAt       DateTime?
     revokedAt       DateTime?
     revokedBy       String?
     @@unique([tenantId, keyPrefix])
   }

   model WebhookEndpoint {
     id              String   @id @default(cuid())
     tenantId        String
     name            String
     url             String
     secret          String   // pour HMAC
     events          String[] // ["site.created", "timesheet.validated"]
     active          Boolean  @default(true)
     lastDeliveryAt  DateTime?
     lastDeliverySuccess Boolean?
     deliveryCount   Int      @default(0)
     failureCount    Int      @default(0)
   }

   model UserSession {
     id              String   @id @default(cuid())
     userId          String
     user            User     @relation(fields: [userId], references: [id])
     tenantId        String
     ipAddress       String
     userAgent       String
     country         String?  // géolocalisation IP
     mfaVerified     Boolean  @default(false)
     createdAt       DateTime @default(now())
     lastActivityAt  DateTime @default(now())
     expiresAt       DateTime
     revokedAt       DateTime?
     @@index([userId, tenantId])
   }

   model TechnicalLog {
     id              String   @id @default(cuid())
     tenantId        String
     timestamp       DateTime @default(now())
     level           LogLevel
     service         String   // "cnps-integration", "auth", "sgbc-webhook"
     message         String   @db.Text
     details         Json?    // structure libre
     userId          String?
     ipAddress       String?
     @@index([tenantId, timestamp])
     @@index([tenantId, level])
   }
   enum LogLevel { DEBUG INFO WARN ERROR FATAL }

5. ÉTENDRE le model Site existant avec champs IT :
   model Site {
     ...
     code            String   @unique  // "CH-2026-001"
     status          SiteStatus
     // ... autres champs métier
   }
   enum SiteStatus { PREPARATION ACTIVE PAUSED CLOSED ARCHIVED }

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 5 nouveaux models IT
- Layout IT protégé par rôle IT_ADMIN + MFA obligatoire
- Logique RBAC : pouvoirs spéciaux activables par DG uniquement
- Seed : TenantSettings BatimCAM avec valeurs par défaut SYSCOHADA Cameroun
- Seed : 8 Integration (CNPS, DGI, Afriland, SGBC, Resend, WhatsApp,
  Cloudflare R2, Sentry) dont 2 en erreur
- Seed : 4 ApiKey + 12 WebhookEndpoint
- Seed : 142 UserSession actives + 4 200 000 entrées TechnicalLog YTD
- Seed : Étienne ONANA etienne@batimcam.cm / Demo2026! avec MFA actif
- Test : Étienne se connecte (avec OTP) → dashboard IT
- Test RBAC : Étienne tente de modifier paie albert → 403 (audit log)
- Test RBAC : Étienne tente de désactiver compte albert → 403 "Pas autorisé"
- Test RBAC : Étienne tente de se promouvoir DG → 403 + AuditLog WARN
- Audit responsive 7/7 OK
- Commit "chore(it): bootstrap informaticien + 5 models + RBAC pouvoirs spéciaux"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 5 fonctions Espace Informaticien

### PROMPT 1.1 — Tableau de bord IT

```
Fonction 1.1 : tableau de bord technique du tenant.

PROTOTYPE HTML
==============
L'écran screen-it-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau gradient violet "⚙ Tenant batimcam.cm · environnement production"
  + badge vert "● Tous services opérationnels" (ou rouge si dégradé)
- Salutation "Bonjour Étienne · 487 utilisateurs · 142 sessions actives ·
  2 alertes intégration · MFA activé"
- KPIs (Utilisateurs actifs 487, Sessions en cours 142 vert pic 218,
  Alertes sécurité 2 ambré, Intégrations OK 6/8 vert avec mention 2 erreurs)
- Section "Alertes techniques" : 5 alertes hiérarchisées
  * CNPS timeout API DIPE 09/05 08:14 (rouge)
  * Webhook SGBC signature invalide (rouge)
  * 2 tentatives login bloquées IP hors-CM (ambré)
  * 45 utilisateurs inactifs > 30j (ambré)
  * Quota stockage 68% / 200 Go (bleu, anticiper)
- **Section "État des services et intégrations"** : grille 8 cards (CNPS,
  DGI, Afriland, SGBC, Resend, WhatsApp, Cloudflare R2, Sentry) avec
  border-left coloré selon statut et statistiques
- Tableau "Sessions actives par catégorie de rôle" : 6 lignes avec catégorie,
  utilisateurs, sessions, taux d'activité, dernière connexion

API
===
- GET /api/it/dashboard
  → KPIs (users, sessions, security alerts, integrations status)
  → alertes techniques hiérarchisées
  → 8 intégrations avec statuts
- GET /api/it/dashboard/sessions-by-role
- GET /api/it/dashboard/services-health

COMPOSANTS src/components/it/dashboard/
=========================================
- ItHeaderBanner.tsx (gradient + badge global status)
- ItGreeting.tsx
- ItKpiRow.tsx (4 KPIs)
- TechnicalAlertsList.tsx (5 alertes hiérarchisées)
- ServicesHealthGrid.tsx (8 cards intégrations)
- SessionsByRoleTable.tsx

⚠️ RESPONSIVE
==============
- KPIs : 4 col → 2x2 → 1 col
- Grid services : 4 col → 2 col → 1 col
- Tableau sessions : ::before content labels mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /it

LIVRABLES
=========
- Code complet
- Test : Étienne se connecte → dashboard avec 5 alertes + 8 intégrations
- Test : tap "CNPS Erreur" → drawer logs détaillés + bouton Retester
- Audit responsive 7/7 OK
- Commit "feat(it): tableau de bord technique tenant — fn 1.1"
```

---

### PROMPT 1.2 — Utilisateurs et habilitations

```
Fonction 1.2 : gestion des 487 utilisateurs avec rôles, MFA, sessions.

PROTOTYPE HTML
==============
L'écran screen-it-users existe. Reproduire avec :
- Header "487 comptes · 442 actifs · 45 inactifs · MFA activé sur 142 comptes
  (direction + sensibles)"
- Actions "Import CSV" + "Export" + "+ Nouvel utilisateur"
- KPIs (Comptes actifs 442, MFA activé 142 vert, Inactifs >30j 45 ambré,
  À créer 3)
- Card filtres 5 colonnes (Recherche, Rôle, Statut, Chantier, MFA)
- Tableau utilisateurs avec colonnes : avatar 32×32, nom, email mono,
  rôle chip, chantier(s), MFA badge (OTP/-), statut (Actif vert/Verrouillé
  ambré/Inactif gris), dernière connexion, action Éditer
- Pagination "10 sur 487 · Voir suivants"

WORKFLOW MÉTIER
================

**Création d'un utilisateur** :
1. Étienne tape "+ Nouvel utilisateur"
2. Wizard 4 étapes :
   - **Étape 1 · Identité** : matricule auto-généré, nom/prénom, email pro,
     téléphone, langue
   - **Étape 2 · Affectation** : rôle (parmi 14 disponibles SAUF SUPER_ADMIN
     et IT_ADMIN sans validation DG), chantier(s) si applicable
   - **Étape 3 · Sécurité** : génération mot de passe temporaire (forcer
     changement à 1ère connexion), MFA obligatoire selon politique tenant
     et rôle, expiration compte si CDD
   - **Étape 4 · Récap + activation** : envoi email d'accueil avec lien
     activation (24h) + notification WhatsApp si numéro
3. Compte créé en statut PENDING_ACTIVATION
4. Utilisateur clique lien d'activation → définit son mot de passe → si
   MFA requis, setup OTP → statut ACTIVE

**Modification d'un utilisateur** :
- Étienne peut modifier : nom, email, téléphone, rôle (avec workflow si
  promotion direction), chantier affecté, statut (activer/désactiver/verrouiller)
- Toute modification de rôle critique (DG, IT_ADMIN, ARCHIVIST) déclenche
  un workflow de validation par le DG
- Réinitialisation mot de passe : envoi lien temporaire 1h

**Verrouillage automatique** :
- 3 tentatives échouées → compte VERROUILLÉ 15 min
- 5 tentatives sur 1h → compte VERROUILLÉ jusqu'à action IT_ADMIN
- IP hors-Cameroun + login non-MFA → blocage + notification

**Désactivation auto inactifs** :
- 30j sans connexion → alerte
- 60j sans connexion → désactivation auto (réversible par IT_ADMIN)
- 1 an sans connexion → suppression GDPR-friendly (anonymisation données)

API
===
- GET /api/it/users?search=&role=&status=&site=&mfa=&page=
- GET /api/it/users/:id (détail + historique sessions + AuditLog)
- POST /api/it/users (création)
- PATCH /api/it/users/:id (modification)
- POST /api/it/users/:id/lock (verrouillage manuel)
- POST /api/it/users/:id/unlock
- POST /api/it/users/:id/reset-password
- POST /api/it/users/:id/reset-mfa
- POST /api/it/users/:id/deactivate
- POST /api/it/users/:id/reactivate
- GET /api/it/users/:id/sessions (sessions actives)
- POST /api/it/users/:id/sessions/:sessionId/revoke
- POST /api/it/users/import-csv
- GET /api/it/users/export?format=xlsx&filters=
- POST /api/it/users/:id/promote-to-critical (rôle critique → workflow DG)

COMPOSANTS src/components/it/users/
=====================================
- UsersHeader.tsx
- UsersKpis.tsx
- UsersFiltersCard.tsx (5 filtres)
- UsersTable.tsx ⚠️ avec 10 colonnes
- NewUserWizard.tsx (4 étapes)
- UserDetailDrawer.tsx (fiche + sessions + AuditLog historique)
- UserRoleEditModal.tsx (avec workflow si critique)
- PasswordResetModal.tsx
- MfaResetModal.tsx
- ImportCsvModal.tsx (avec preview + validation)
- LockUnlockButton.tsx

⚠️ RESPONSIVE
==============
- Tableau utilisateurs : ::before content labels mobile, avatar + nom
  toujours visibles
- Filtres : 5 col → 3 col → 1 col
- Wizard : étapes verticales mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /it/users

LIVRABLES
=========
- Code complet
- Test : Étienne crée nouvel utilisateur "Jacques EBALÉ · Chef Chantier ·
  Bonabéri" → email d'accueil envoyé → Jacques active compte → MFA setup OTP
- Test : Étienne tente de promouvoir Robert ETONDÉ en DG → workflow vers Albert
- Test : Étienne tente de désactiver Albert (DG) → 403 "Action non autorisée"
- Test : import CSV 50 ouvriers → 48 succès + 2 erreurs (emails doublons)
- Test : recherche "@batimcam.cm" → 487 résultats paginés 50/page
- Audit responsive 7/7 OK
- Commit "feat(it): utilisateurs + RBAC + MFA + workflow rôles critiques — fn 1.2"
```

---

### PROMPT 1.3 — Paramètres tenant

```
Fonction 1.3 : configuration générale du tenant BatimCAM.

PROTOTYPE HTML
==============
L'écran screen-it-settings existe. Reproduire avec :
- Header "Configuration générale, branding, sécurité, localisation · journalisé
  dans AuditLog"
- Actions "Annuler" + "Sauvegarder"
- **Grille de 6 sections** dans des cards :
  * 🏢 Identité tenant (Raison sociale, Forme juridique SA, RC YAO, NIU DGI,
    N° CNPS, Adresse)
  * 🎨 Identité visuelle (Logo 64×64 + bouton Modifier, Couleur primaire
    avec swatch, Couleur secondaire, Slogan)
  * 🌍 Localisation (Langue Français CM, Devise FCFA BEAC, Fuseau Africa/Douala
    UTC+1, Format date DD/MM/YYYY, 1er jour Lundi)
  * 🔐 Sécurité (Longueur min MDP 12, Complexité majuscule+chiffre+symbole,
    Expiration 90j, Session inactive 30 min, MFA checkboxes par catégorie,
    Désactivation auto inactifs 60j)
  * 📅 Exercice fiscal (Début 1er janvier, Plan comptable SYSCOHADA Révisé
    2018, TVA 19,25%, Exercice courant disabled)
  * 🔔 Notifications globales (Email, WhatsApp, Push, SMS, Digest hebdo DG)

WORKFLOW MÉTIER
================

**Politique de modification** :
- Étienne peut modifier la plupart des paramètres seul
- 4 paramètres **critiques nécessitent workflow DG** :
  - Changement de raison sociale ou forme juridique
  - Changement de NIU ou N° CNPS
  - Réduction de la politique sécurité (longueur MDP, désactivation MFA)
  - Réduction du quota stockage

**Audit** : chaque modification de paramètre est journalisée dans AuditLog
avec ancienne valeur + nouvelle valeur + utilisateur + timestamp + IP +
justification optionnelle.

**Validation côté backend** :
- Format NIU camerounais (P/M + chiffres)
- Format RC (RC/[VILLE]/[ANNÉE]/[CLASSE]/[N°])
- Couleurs hex valides
- Devise dans liste BEAC (XAF, XOF, EUR, USD)
- Fuseau dans liste IANA
- TVA Cameroun 19,25% (warning si modifié)

API
===
- GET /api/it/tenant/settings
- PATCH /api/it/tenant/settings (audit log + workflow si critique)
- POST /api/it/tenant/logo (upload + redimensionnement)
- POST /api/it/tenant/settings/validate-niu (validation API DGI optionnelle)
- POST /api/it/tenant/settings/reset-defaults (réinit aux valeurs SYSCOHADA)
- GET /api/it/tenant/settings/audit-log (historique modifications)

COMPOSANTS src/components/it/settings/
========================================
- SettingsHeader.tsx
- IdentityCard.tsx (6 champs identité légale)
- BrandingCard.tsx (logo + couleurs + slogan)
- LocalizationCard.tsx (langue + devise + fuseau + dates)
- SecurityCard.tsx ⚠️ avec politique MDP + MFA + désactivation
- FiscalYearCard.tsx (exercice + plan comptable + TVA)
- NotificationsCard.tsx (5 canaux toggleables)
- CriticalChangeWarning.tsx (alerte avant modification critique)
- SettingsAuditLogDrawer.tsx

⚠️ RESPONSIVE
==============
- Grid 6 cards : 2 col → 1 col empilé < 1024px
- Chaque card : champs verticaux mobile
- Color swatches : flex row toujours visible

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /it/settings

LIVRABLES
=========
- Code complet
- Test : Étienne modifie couleur primaire #A855F7 → #9333EA → sauvegarde →
  AuditLog enregistré → branding mis à jour partout
- Test : Étienne tente de réduire longueur MDP de 12 à 6 → modal "Modification
  critique → workflow DG" → notification Albert
- Test : Étienne change devise FCFA → EUR → warning "Modification impacte
  toutes les transactions futures" → confirmation explicite requise
- Audit responsive 7/7 OK
- Commit "feat(it): paramètres tenant + branding + sécurité + audit — fn 1.3"
```

---

### PROMPT 1.4 — Chantiers (administration)

```
Fonction 1.4 : création et administration des 23 chantiers actifs.

PROTOTYPE HTML
==============
L'écran screen-it-sites existe. Reproduire avec :
- Header "23 chantiers actifs · 8 clôturés cette année · 142 historiques ·
  2,8 Md FCFA portefeuille"
- Actions "Export Excel" + "+ Créer un chantier"
- KPIs (Actifs 23, En préparation 3 ambré, Clôturés YTD 8, Archivés 142)
- Card filtres 5 colonnes (Recherche, Statut, Type, MOA, Région)
- Tableau 8 chantiers avec colonnes : Code mono, Nom, MOA, Conducteur,
  Budget HT mono, Avancement %, Phase, Statut chip

WORKFLOW MÉTIER
================

**Création d'un chantier** :
1. Étienne tape "+ Créer un chantier"
2. Wizard 5 étapes :
   - **Étape 1 · Identification** : code auto-généré (CH-AAAA-NNN), nom,
     localisation (adresse + GPS), région, type (Ouvrage d'art / Bâtiment
     résidentiel / VRD / AEP / Réfection route)
   - **Étape 2 · Maître d'ouvrage** : type (Public Commune / Public Ministère
     / Privé), entité MOA, contact référent
   - **Étape 3 · Contrat** : référence marché, montant HT, durée prévue,
     date démarrage, date fin contractuelle, retenue de garantie, jalons
     contractuels (J1 fondations, J2 piles, J3 piles centrales, J4 tablier,
     J5 réception définitive)
   - **Étape 4 · Affectations initiales** : DTrav responsable, CondTrav, CC,
     Magasinier (4 utilisateurs)
   - **Étape 5 · Récap + création** : génération espace documentaire GED,
     création WarehouseStock vide, notifications affectés

**Cycle de vie** :
- PREPARATION : créé, équipes affectées, démarrage proche
- ACTIVE : travaux en cours
- PAUSED : suspension temporaire (intempéries, contentieux)
- CLOSED : réception définitive signée
- ARCHIVED : 5 ans après clôture, archivage froid

**Clôture d'un chantier** :
1. Étienne valide PV réception définitive signé (vérifie GED)
2. Génère le DOE final (compilation tous documents techniques)
3. Calcule retenue de garantie restante (10% du marché habituellement)
4. Désaffecte les utilisateurs (CC/MAG/CondTrav passent à autre chantier
   ou siège)
5. Archive l'espace documentaire chantier (passe en semi-actif)
6. Statut → CLOSED

API
===
- GET /api/it/sites?status=&type=&moaType=&region=&search=&page=
- GET /api/it/sites/:id (détail + équipes + GED + stocks + finances)
- POST /api/it/sites (création avec wizard)
- PATCH /api/it/sites/:id (modification métadonnées)
- POST /api/it/sites/:id/pause (avec raison)
- POST /api/it/sites/:id/resume
- POST /api/it/sites/:id/close (workflow réception)
- POST /api/it/sites/:id/archive
- POST /api/it/sites/:id/team-assignments
- GET /api/it/sites/export?format=xlsx

COMPOSANTS src/components/it/sites/
=====================================
- SitesHeader.tsx
- SitesKpis.tsx
- SitesFiltersCard.tsx
- SitesTable.tsx
- NewSiteWizard.tsx (5 étapes)
  - Step1Identification.tsx
  - Step2MaitreOuvrage.tsx
  - Step3Contrat.tsx (avec jalons J1-J5)
  - Step4Affectations.tsx (DTrav/CondTrav/CC/MAG)
  - Step5Recap.tsx
- SiteDetailDrawer.tsx (avec onglets identité/équipes/GED/finances)
- CloseSiteWizard.tsx (vérifications avant clôture)
- ArchiveSiteButton.tsx

⚠️ RESPONSIVE
==============
- Tableau chantiers : ::before content labels mobile
- Wizard 5 étapes : stepper vertical mobile
- Filtres : 5 col → 3 col → 1 col

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /it/sites

LIVRABLES
=========
- Code complet avec 23 chantiers seedés
- Test : création nouveau chantier "École primaire Mfoundi" → wizard 5 étapes →
  équipes affectées → espace GED créé → notifications
- Test : clôture chantier "Réfection route N3" → vérifications PV → DOE
  compilé → statut CLOSED → désaffectations
- Test : export Excel 23 chantiers + 8 clôturés YTD + 142 archivés
- Audit responsive 7/7 OK
- Commit "feat(it): chantiers + cycle de vie + clôture/archivage — fn 1.4"
```

---

### PROMPT 1.5 — Intégrations et journaux techniques

```
Fonction 1.5 : gestion 8 intégrations partenaires + API keys + webhooks + logs.

PROTOTYPE HTML
==============
L'écran screen-it-integrations existe. Reproduire avec :
- Header "8 intégrations · 6 OK · 2 en erreur · 4 200 000 appels API ce mois ·
  clés API gérées"
- Actions "Documentation API" + "+ Nouvelle intégration"
- 4 onglets (Intégrations 8 / Clés API 4 / Webhooks 12 / Journaux techniques)
- **Section Intégrations** : grille 8 cards avec :
  * Card CNPS Erreur (border rouge, détails endpoint + tentatives + message
    erreur + boutons Retester/Voir logs/Documentation)
  * Card SGBC Erreur (border rouge, détails webhook + signature invalide +
    28 messages bloqués + boutons Régénérer clé/Voir messages)
  * Card DGI OK (border vert, sync 6h, latence 412 ms)
  * Card Afriland OK (border vert, sync horaire, 142 mouvements/mois)
  * Card Resend OK (envois 2 484/mois, tx délivré 99,8%, SPF/DKIM valides)
  * Card WhatsApp Business OK (numéro vérifié, 12 templates, tx 100%)
  * Card Cloudflare R2 OK (142 Go, 68% quota)
  * Card Sentry OK (12 erreurs 24h, 0 critique)
- Tableau "Journaux techniques (extrait dernières 24h)" : 6 lignes avec date
  mono, niveau (ERROR rouge / WARN ambré / INFO bleu), service, message,
  détails

WORKFLOW MÉTIER
================

**Intégrations CNPS DIPE** (cas pratique camerounais) :
- API officielle CNPS pour transmettre les Déclarations Individuelles
  Préétablies des Employés (cotisations sociales)
- Calendrier : transmission mensuelle obligatoire avant le 15 du mois suivant
- Format : XML normalisé CNPS
- Workflow auto : génération XML depuis Payslip + envoi API + récupération
  accusé de réception + classement GED
- En cas d'erreur : Étienne notifié, retry avec backoff exponentiel (1min,
  5min, 30min, 2h, 6h), puis alerte critique

**Intégrations DGI e-Tax** :
- Transmission des déclarations TVA, IS, IRPP, taxes locales
- Sync quotidienne pour récupération avis fiscaux

**Intégrations bancaires (Afriland First Bank, SGBC, BICEC)** :
- Réception webhooks pour mouvements bancaires
- Sync horaire pour relevés
- Signature HMAC-SHA256 pour authentification
- En cas de rotation de clé bancaire, signature invalide → Étienne doit
  régénérer

**Clés API** :
- Création par Étienne pour applications externes (mobile, intégrations
  partenaires)
- Format : `terp_live_xxx...` ou `terp_test_xxx...`
- Scopes granulaires (`read:sites`, `write:timesheets`, etc.)
- IP whitelist optionnelle
- Stockage : preview visible + hash bcrypt en BDD
- Révocation immédiate possible
- Log de chaque utilisation

**Webhooks sortants** :
- T-ERP émet des webhooks pour notifier des systèmes tiers
- Événements : `site.created`, `timesheet.validated`, `purchase_order.emitted`,
  `payment.received`, etc.
- HMAC-SHA256 signature, retry 5 fois si 5xx
- Logs détaillés des deliveries

API
===
- GET /api/it/integrations
- GET /api/it/integrations/:id
- POST /api/it/integrations (création nouvelle intégration)
- PATCH /api/it/integrations/:id (config)
- POST /api/it/integrations/:id/test (test connexion)
- POST /api/it/integrations/:id/retry-sync
- POST /api/it/integrations/:id/regenerate-secret
- POST /api/it/integrations/:id/pause
- POST /api/it/integrations/:id/resume
- GET /api/it/integrations/:id/logs?limit=100

- GET /api/it/api-keys
- POST /api/it/api-keys (création, retourne secret 1x)
- POST /api/it/api-keys/:id/revoke
- GET /api/it/api-keys/:id/usage (statistiques)

- GET /api/it/webhooks
- POST /api/it/webhooks
- POST /api/it/webhooks/:id/test
- POST /api/it/webhooks/:id/redeliver-failed

- GET /api/it/logs?level=&service=&from=&to=&search=&page=
- GET /api/it/logs/export?format=jsonl

COMPOSANTS src/components/it/integrations/
============================================
- IntegrationsHeader.tsx
- IntegrationsTabs.tsx (4 onglets)
- IntegrationsGrid.tsx (8 cards)
- IntegrationCard.tsx ⚠️ avec border-left coloré selon statut
- IntegrationDetailDrawer.tsx (config + logs + tests)
- NewIntegrationModal.tsx (sélection partenaire + config endpoint)
- ApiKeysTable.tsx
- NewApiKeyModal.tsx (avec affichage secret une seule fois)
- ApiKeyUsageChart.tsx
- WebhooksTable.tsx
- WebhookTestButton.tsx
- TechnicalLogsTable.tsx (avec filtres avancés)
- LogLevelBadge.tsx (ERROR rouge, WARN ambré, INFO bleu, DEBUG gris)

⚠️ RESPONSIVE
==============
- Grid intégrations : 3 col → 2 col → 1 col
- Cards intégrations : structure verticale mobile
- Tableau logs : ::before content labels mobile
- Onglets : scroll horizontal mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /it/integrations

LIVRABLES
=========
- Code complet avec 8 intégrations seedées (2 en erreur réaliste)
- Test : Étienne clique "Retester" CNPS → retry API → succès ou erreur logguée
- Test : Étienne régénère secret SGBC → nouvelle clé HMAC → notification banque
- Test : création nouvelle clé API "Application mobile BatimCAM" → secret affiché
  une seule fois → scopes définis → utilisée par app mobile
- Test : webhook test "site.created" → notification système tiers envoyée
- Test : filtre logs LEVEL=ERROR derniers 24h → 12 entrées
- Audit responsive 7/7 OK
- Commit "feat(it): intégrations + API keys + webhooks + logs techniques — fn 1.5"
```

---

## ✅ FIN BLOC 1 — Profil Informaticien complet

Tu viens de couvrir l'**ensemble du profil Informaticien d'entreprise** :
- Bloc 0 : 5 nouveaux models IT + extension User avec 5 pouvoirs spéciaux
- Bloc 1 : 5 fonctions (Dashboard, Utilisateurs, Paramètres, Chantiers,
  Intégrations)

**Total profil Informaticien : 5 fonctions livrées**

POINTS FORTS DE CE PROFIL
==========================
- Profil **technique côté client** distinct du Super-Admin Anthropic
- Gestion 487 utilisateurs avec workflow rôles critiques
- MFA obligatoire pour direction + transverses (OTP type Google Authenticator)
- 8 intégrations partenaires Cameroun (CNPS, DGI, banques, services tiers)
- API keys + webhooks pour intégrations partenaires personnalisées
- Journaux techniques 4 niveaux (DEBUG/INFO/WARN/ERROR)
- Garde-fous stricts : ne peut pas se promouvoir DG, ni modifier paie/contrats
- Tous les actes journalisés dans AuditLog

ESTIMATION EFFORT
==================
- Bloc 0 (5 models Prisma + RBAC pouvoirs spéciaux + MFA setup) : 3-4 jours
- Bloc 1 (5 fonctions) : 6-8 jours (fn 1.2 Utilisateurs avec wizard + MFA dense,
  fn 1.5 Intégrations avec cards + onglets + logs)
- TOTAL : 9-12 jours

INTERACTIONS AVEC AUTRES PROFILS
=================================
- **DG (Albert)** : valide promotions rôles critiques (DG, IT_ADMIN, ARCHIVIST)
- **DAF (Marie)** : surveille la facturation T-ERP côté super-admin (séparé)
- **Tous les profils** : Étienne crée leurs comptes et gère leurs habilitations
- **Super-Admin Anthropic/T-ERP** : Étienne escalade les problèmes infra

PROCHAINE ÉTAPE
================
Profils restants à développer :
- **Employé bureau · Ouvrier** : comptes basiques (consultation paie, demandes
  congés, pointage perso)

Mon ordre recommandé : **Employé bureau · Ouvrier** ensuite, pour finaliser
l'écosystème complet T-ERP avec les profils les plus simples mais qui
représentent **la majorité des utilisateurs** (418 ouvriers sur 487 dans
BatimCAM).
