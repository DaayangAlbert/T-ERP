# SUPER-ADMIN T-ERP · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Super-Admin Anthropic T-ERP (2-3 personnes max chez Anthropic
côté éditeur de la plateforme — pas côté client)

---

## ⚠️ DISTINCTION CRITIQUE — Super-Admin vs IT_ADMIN tenant

| Aspect | **Super-Admin T-ERP (Anthropic)** | IT_ADMIN BatimCAM (Étienne) |
|--------|------------------------------------|------------------------------|
| Périmètre | **Tous les tenants** | Un seul tenant |
| Console | /admin (thème noir/cyan) | /it (thème violet client) |
| Login | superadmin@terp.cm | etienne@batimcam.cm |
| Crée | **Nouveaux tenants** | Utilisateurs dans son tenant |
| Facture | **Abonnements T-ERP** | Rien (côté T-ERP) |
| Infra | Railway, Neon, Cloudflare | Rien |
| Logs vus | **Système global** | Tenant local uniquement |
| Sécurité | **MFA hardware YubiKey FIDO2** | MFA OTP standard |
| Effectif | **2-3 personnes max** chez Anthropic | 1 personne par tenant |

**Position dans T-ERP :** rôle **trans-tenant**. Bypass des contraintes
tenant. Accès en lecture à toutes les données de tous les tenants pour le
support, en écriture limité aux opérations plateforme (provisionnement,
suspension, facturation, configuration globale).

**Sécurité maximale :** MFA hardware YubiKey FIDO2 obligatoire (pas
seulement OTP), IP whitelisting strict, tous les accès cross-tenant tracés
dans `GlobalAuditLog` immuable, signature électronique des actions critiques
(suspension, suppression tenant).

**Theme distinctif :** noir profond (#0F172A) + cyan (#22D3EE) au lieu du
violet client. Cela évite toute confusion mentale entre console plateforme
et espace tenant — un super-admin connecté ne doit JAMAIS se croire dans
un espace client.

---

## ⚠️ ARCHITECTURE TRANS-TENANT

Le Super-Admin n'est PAS un utilisateur d'un tenant. C'est un utilisateur
de la table `PlatformAdmin` distincte de `User` :

```prisma
model PlatformAdmin {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  firstName       String
  lastName        String
  role            PlatformAdminRole
  // Sécurité
  mfaSecret       String?  // FIDO2 credential
  mfaEnabled      Boolean  @default(false)
  yubikeyId       String?  // Hardware key ID
  whitelistedIps  String[] // Liste IPs autorisées
  // Permissions granulaires
  canCreateTenants        Boolean @default(false)
  canSuspendTenants       Boolean @default(false)
  canDeleteTenants        Boolean @default(false)
  canManageBilling        Boolean @default(false)
  canManagePlatformConfig Boolean @default(false)
  canViewAllTenantsData   Boolean @default(false)  // Support L3
  canManageGlobalIntegrations Boolean @default(false)
  canViewGlobalAudit      Boolean @default(false)
  // Statut
  status          PlatformAdminStatus
  lastLoginAt     DateTime?
  lastLoginIp     String?
  createdAt       DateTime @default(now())
  createdBy       String?  // Premier super-admin créé manuellement
  globalAuditLogs GlobalAuditLog[]
}

enum PlatformAdminRole {
  CTO                  // Permissions totales
  SUPPORT_L3           // Support technique étendu
  BILLING_ADMIN        // Facturation uniquement
  COMPLIANCE_OFFICER   // Audit et GDPR
}

enum PlatformAdminStatus { ACTIVE SUSPENDED REVOKED }
```

**PostgreSQL Row-Level Security (RLS) :**
- **TOUTES les tables tenant** ont RLS activé filtrant sur `tenantId`
- **Le Super-Admin BYPASSE le RLS** via une connection role spéciale `superadmin_role`
- Chaque requête trans-tenant est tracée avec `current_setting('app.platform_admin_id')`
- Aucun User normal ne peut accéder à la connection `superadmin_role`

---

## ⚠️ PROTOCOLE RESPONSIVE

Profil bureau dédié. Tap targets 40-44px. Tableaux denses acceptés.
Theme dark obligatoire (CSS variables override).

```bash
pnpm exec tsx scripts/audit-responsive.ts /admin/<route>
```

Format commit : "✅ Audit : 6/6 responsive OK · dark theme cohérent"

---

## 🟪 PROMPT 0 — PRÉAMBULE SUPER-ADMIN

```
Phase de développement du profil Super-Admin Anthropic.

CONTEXTE
========
- Le prototype HTML contient 6 écrans Super-Admin :
  screen-admin-dashboard, screen-admin-tenants, screen-admin-billing,
  screen-admin-platform, screen-admin-monitoring, screen-admin-audit
- Tous ont les attributs data-admin-screen + data-rh-screen
- Theme distinctif : noir profond (#0F172A) + cyan (#22D3EE)
- 2 super-admins par défaut : superadmin@terp.cm (CTO) et support@terp.cm (L3)
- MFA hardware YubiKey FIDO2 obligatoire

CONVENTIONS
============
- Écrans prototype : id="screen-admin-<fonction>"
- Pages Next.js : src/app/(admin)/admin/<fonction>/page.tsx
- Composants : src/components/admin/<NomFonction>.tsx
- API routes : src/app/api/admin/<fonction>/route.ts
- Auth séparée : src/middleware-admin.ts distinct du middleware tenant
- Hooks : src/hooks/useAdmin<Fonction>.ts

TÂCHES PRÉPARATOIRES
====================

1. Créer le router séparé :
   - src/app/(admin)/admin/layout.tsx
   - Vérification PlatformAdmin (pas User)
   - Vérification MFA hardware actif (sinon redirect /admin/mfa-setup)
   - Vérification IP whitelisting
   - Wrap children avec <div data-admin-screen className="admin-app">

2. Étendre Prisma — 8 nouveaux/étendus models plateforme :

   model Tenant {
     id              String   @id @default(cuid())
     name            String
     slug            String   @unique  // "batimcam"
     subdomain       String   @unique  // "batimcam.terp.cm"
     country         String   @default("CM")
     niu             String?
     legalForm       LegalForm
     planId          String
     plan            SubscriptionPlan @relation(fields: [planId], references: [id])
     status          TenantStatus
     provisionedAt   DateTime @default(now())
     suspendedAt     DateTime?
     suspensionReason String?
     terminatedAt    DateTime?
     dataRetentionEndAt DateTime?
     maxUsers        Int
     maxSites        Int
     maxStorageGb    Int
     brandingLogoUrl String?
     brandingPrimaryColor String?
     brandingSecondaryColor String?
     billingContactEmail String
     billingContactName  String
     billingAddress  String?
     paymentMethod   PaymentMethod
     isDemoTenant    Boolean  @default(false)
     demoExpiresAt   DateTime?
     subscriptions   Subscription[]
     invoices        Invoice[]
     incidents       PlatformIncident[]
     auditLogs       GlobalAuditLog[]
     featureFlags    TenantFeatureFlag[]
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   enum LegalForm { SA SARL SAS GIE INDIVIDUAL OTHER }
   enum TenantStatus { PROVISIONING ACTIVE DEMO SUSPENDED TERMINATED PURGED }
   enum PaymentMethod { BANK_TRANSFER MOBILE_MONEY CARD INVOICE_30D }

   model SubscriptionPlan {
     id              String   @id @default(cuid())
     code            String   @unique
     name            String
     description     String?
     monthlyPriceXAF BigInt
     annualPriceXAF  BigInt?
     maxUsers        Int
     maxSites        Int
     maxStorageGb    Int
     enabledModules  String[]
     hasWhatsAppBusiness Boolean
     hasJobPortal    Boolean
     hasSgModule     Boolean
     supportSlaHours Int
     isRecommended   Boolean  @default(false)
     isPublic        Boolean  @default(true)
     orderIndex      Int      @default(0)
     active          Boolean  @default(true)
     tenants         Tenant[]
   }

   model Subscription {
     id              String   @id @default(cuid())
     tenantId        String
     tenant          Tenant   @relation(fields: [tenantId], references: [id])
     planId          String
     startDate       DateTime
     endDate         DateTime?
     billingCycle    BillingCycle
     status          SubscriptionStatus
     autoRenew       Boolean  @default(true)
     mrrXAF          BigInt
     invoices        Invoice[]
     cancelledAt     DateTime?
     cancellationReason String?
   }
   enum BillingCycle { MONTHLY ANNUAL }
   enum SubscriptionStatus { ACTIVE PAUSED CANCELLED EXPIRED }

   model Invoice {
     id              String   @id @default(cuid())
     reference       String   @unique
     tenantId        String
     tenant          Tenant   @relation(fields: [tenantId], references: [id])
     subscriptionId  String
     subscription    Subscription @relation(fields: [subscriptionId], references: [id])
     periodStart     DateTime
     periodEnd       DateTime
     amountHT        BigInt
     vatRate         Float    @default(19.25)
     vatAmount       BigInt
     amountTTC       BigInt
     currency        String   @default("XAF")
     status          InvoiceStatus
     issuedAt        DateTime @default(now())
     dueAt           DateTime
     paidAt          DateTime?
     paidAmount      BigInt?
     paymentMethod   PaymentMethod?
     paymentReference String?
     pdfUrl          String?
     reminderCount   Int      @default(0)
     lastReminderAt  DateTime?
   }
   enum InvoiceStatus { DRAFT ISSUED PAID OVERDUE CANCELLED REFUNDED }

   model SaasMetric {
     id              String   @id @default(cuid())
     date            DateTime @db.Date
     mrrXAF          BigInt
     arrXAF          BigInt
     activeTenants   Int
     newTenants      Int
     churnedTenants  Int
     activeUsers     Int
     dau             Int
     mau             Int
     arpuXAF         BigInt
     conversionRate  Float?
     @@unique([date])
   }

   model PlatformIncident {
     id              String   @id @default(cuid())
     reference       String   @unique
     title           String
     description     String   @db.Text
     severity        IncidentSeverity
     status          IncidentStatus
     affectedTenants String[]
     module          String?
     usersImpacted   Int?
     detectedAt      DateTime @default(now())
     acknowledgedAt  DateTime?
     resolvedAt      DateTime?
     postmortemUrl   String?
     assignedTo      String?
     hypothesis      String?  @db.Text
     resolution      String?  @db.Text
   }
   enum IncidentSeverity { P1_CRITICAL P2_MAJOR P3_MINOR P4_INFO }
   enum IncidentStatus { OPEN INVESTIGATING IDENTIFIED MONITORING RESOLVED CLOSED }

   model GlobalAuditLog {
     id              String   @id @default(cuid())
     timestamp       DateTime @default(now())
     platformAdminId String?
     platformAdmin   PlatformAdmin? @relation(fields: [platformAdminId], references: [id])
     actorEmail      String
     actorRole       PlatformAdminRole?
     action          AuditAction
     targetType      String
     targetId        String?
     targetDescription String?
     tenantId        String?
     ipAddress       String
     userAgent       String?
     justification   String?
     ticketReference String?
     beforeState     Json?
     afterState      Json?
     @@index([timestamp])
     @@index([platformAdminId, timestamp])
     @@index([tenantId, timestamp])
     @@index([action, timestamp])
   }
   enum AuditAction {
     TENANT_PROVISIONED TENANT_SUSPENDED TENANT_REACTIVATED TENANT_DELETED
     PLAN_UPGRADED PLAN_DOWNGRADED
     INVOICE_ISSUED INVOICE_CANCELLED PAYMENT_RECORDED
     CONFIG_MODIFIED FEATURE_FLAG_TOGGLED
     CROSS_TENANT_ACCESS DATA_EXPORTED GDPR_EXPORT
     DB_MIGRATION DEPLOYMENT INTEGRATION_CONFIGURED
     AUTH_MFA_SUCCESS AUTH_MFA_FAILURE
     ADMIN_CREATED ADMIN_REVOKED PERMISSIONS_CHANGED
   }

   model TenantFeatureFlag {
     id              String   @id @default(cuid())
     tenantId        String
     tenant          Tenant   @relation(fields: [tenantId], references: [id])
     flagKey         String
     enabled         Boolean
     enabledBy       String
     enabledAt       DateTime @default(now())
     expiresAt       DateTime?
     @@unique([tenantId, flagKey])
   }

   model GlobalIntegration {
     id              String   @id @default(cuid())
     code            String   @unique
     name            String
     provider        String
     status          IntegrationStatus
     apiVersion      String?
     credentialsRef  String?
     lastHealthCheckAt DateTime?
     metricsLast24h  Json?
   }
   enum IntegrationStatus { ACTIVE DEGRADED DOWN MAINTENANCE DEPRECATED }

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 8 models plateforme
- Connection PostgreSQL séparée `superadmin_role` bypassant RLS
- Router /admin séparé avec auth PlatformAdmin
- Middleware MFA hardware + IP whitelisting
- Layout dark theme avec CSS variables override
- Seed initial : 2 PlatformAdmin (superadmin@terp.cm CTO + support@terp.cm L3)
- Seed : 3 SubscriptionPlan (Essentiel 95K, Pro 285K, Enterprise sur devis)
- Seed : 42 Tenant (BatimCAM, Razel-Bec, Mvog-Mbi, BTP Express, Njoya,
  Carrière Mfou, SOTCO-BTP suspendu, etc.)
- Seed : 142 Invoice avec 3 impayés
- Seed : 30 SaasMetric (1 par jour avril 2026)
- Seed : 2 PlatformIncident ouverts
- Seed : 8 GlobalIntegration (CNPS, DGI, WhatsApp, R2, Resend, Afriland,
  Sentry, Neon)
- Seed : 418 GlobalAuditLog 30 derniers jours
- Test : superadmin se connecte avec YubiKey → MFA OK → dashboard
- Test sécurité : tentative login IP non whitelistée → 403 + alerte
- Test sécurité : User normal tente d'accéder à /admin → 404
- Audit responsive 6/6 OK · dark theme cohérent
- Commit "chore(admin): bootstrap super-admin plateforme + 8 models + RLS"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 6 fonctions Super-Admin

### PROMPT 1.1 — Dashboard global plateforme

```
Fonction 1.1 : tableau de bord trans-tenant de la plateforme.

PROTOTYPE HTML
==============
screen-admin-dashboard. Reproduire avec :
- Header noir + badge cyan "CONSOLE PLATEFORME · ANTHROPIC"
- Bandeau gradient bleu profond → cyan "Console plateforme · production ·
  42 tenants actifs" + badge "Tous services UP · 99,98 % SLA"
- Salutation horodatée
- KPIs (Tenants actifs 42, MRR cyan 14,8 M, Users 1 287, Uptime 99,98 %)
- Alertes plateforme : 5 alertes border-left coloré
- 2 colonnes : Croissance + Top 5 tenants par MRR
- Métriques système temps réel : 8 cards
- Activité récente 24h : tableau 6 lignes

API
===
- GET /api/admin/dashboard
- GET /api/admin/dashboard/growth
- GET /api/admin/dashboard/top-tenants?limit=5
- GET /api/admin/dashboard/system-metrics (live via WebSocket optionnel)
- GET /api/admin/dashboard/recent-activity?limit=20

COMPOSANTS src/components/admin/dashboard/
==========================================
- AdminHeaderBanner.tsx (gradient bleu profond)
- AdminKpiRow.tsx (valeurs cyan)
- AdminAlertsList.tsx (5 alertes priorisées)
- GrowthMetricsCard.tsx (4 progress bars)
- TopTenantsCard.tsx (5 tenants par MRR)
- SystemMetricsGrid.tsx (8 cards live)
- RecentActivityTable.tsx

⚠️ THEME DARK
==============
- background: #0F172A
- card background: #1E293B
- borders: #334155
- accents cyan: #22D3EE
- success: #22C55E, warning: #F59E0B, danger: #EF4444
- text primary: #fff, secondary: #CBD5E1, muted: #94A3B8

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin

LIVRABLES
=========
- Code complet
- Test : superadmin → dashboard avec 5 alertes + 8 métriques live
- Test : refresh auto métriques toutes les 30s (WebSocket)
- Test : click "Contacter" SOTCO-BTP → workflow contact relance
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): dashboard global plateforme — fn 1.1"
```

### PROMPT 1.2 — Gestion des tenants

```
Fonction 1.2 : CRUD complet des tenants avec wizard de provisionnement.

PROTOTYPE HTML
==============
screen-admin-tenants. Reproduire avec :
- KPIs (Actifs 42, Démo 4, Suspendus 1 rouge, Répartition 28/12/2)
- Onglets (Tous 47, Actifs 42, Démo 4, Suspendus 1)
- Filtres (Recherche, Plan, Statut, Pays)
- Tableau 10 tenants avec avatars colorés
- Ligne SOTCO-BTP fond rouge brique
- Ligne EKO Bâtiment fond bleu profond (démo 28j)

WORKFLOW : PROVISIONNEMENT TENANT (5 étapes)
==============================================

**Wizard** :
1. **Identité** : Nom, slug auto, sous-domaine, pays, forme juridique, NIU
2. **Plan** : Essentiel/Pro/Enterprise + limites + démo 30j optionnel
3. **Contact facturation** : nom, email, adresse, méthode paiement
4. **Premier admin** : email IT_ADMIN, nom, téléphone, mot de passe temp
5. **Confirmation** : récap + coût mensuel + "Provisionner maintenant"

**Pipeline automatisé asynchrone (~3 min)** :
1. Création Tenant en PROVISIONING
2. Création schéma DB isolé Postgres (search_path)
3. Application migrations Prisma sur le schéma
4. Seed initial : Plan + Branding + RolePermissions
5. Création User IT_ADMIN du tenant
6. DNS Cloudflare : enregistrement {slug}.terp.cm
7. SSL automatique
8. R2 bucket initial
9. Email transactionnel credentials
10. WhatsApp Business message bienvenue
11. Slack interne #provisioning
12. GlobalAuditLog TENANT_PROVISIONED
13. Tenant en ACTIVE (ou DEMO)

WORKFLOW : SUSPENSION POUR IMPAYÉS
====================================

```
Échéance facture J+0
├── J+7  : email rappel automatique
├── J+15 : email + WhatsApp rappel
├── J+30 : warning "suspension dans 15j"
├── J+45 : limitation accès (lecture seule)
├── J+60 : suspension complète accès tenant
│       Status SUSPENDED · users redirect /suspended
├── J+90 : rétention données encore active
└── J+180 : purge définitive si impayé non résolu
        Status PURGED · DB dropped · R2 deleted
```

**Annulation suspension** : règlement → réactivation 1-click

WORKFLOW : SUPPRESSION DÉFINITIVE
===================================

Demande client fin de contrat :
- Email officiel support@terp.cm + ticket
- Génération export GDPR complet (toutes données chiffrées)
- Tenant → TERMINATED
- Rétention 90 jours obligatoire (loi 2010/012 + GDPR)
- Après 90 jours : purge automatique + AuditLog TENANT_PURGED

API
===
- GET /api/admin/tenants?status=&plan=&country=&search=
- GET /api/admin/tenants/:id
- POST /api/admin/tenants/provision (déclenche workflow async)
- POST /api/admin/tenants/:id/suspend (avec raison)
- POST /api/admin/tenants/:id/reactivate
- POST /api/admin/tenants/:id/terminate (génère export GDPR)
- DELETE /api/admin/tenants/:id (PURGE après 90j)
- PATCH /api/admin/tenants/:id/plan (changement avec prorata)
- PATCH /api/admin/tenants/:id/limits (override Enterprise)
- POST /api/admin/tenants/:id/feature-flags (toggle)
- GET /api/admin/tenants/:id/audit-log
- GET /api/admin/tenants/:id/health (métriques tenant)
- GET /api/admin/tenants/provisioning-jobs (suivi pipelines)

COMPOSANTS src/components/admin/tenants/
==========================================
- TenantsHeader.tsx, TenantsKpis.tsx, TenantsTabs.tsx
- TenantsFiltersCard.tsx, TenantsTable.tsx
- TenantDetailDrawer.tsx (8 onglets : Infos, Plan, Users, Sites,
  Storage, Facturation, Audit, Feature flags)
- ProvisionTenantWizard.tsx ⚠️ 5 étapes
- ProvisionProgressDialog.tsx (suivi temps réel)
- SuspendTenantModal.tsx (raison obligatoire)
- TerminateTenantModal.tsx (validation double + GDPR export)
- TenantPlanChangeModal.tsx (calcul prorata)

⚠️ SÉCURITÉ
============
- Suspension : confirmation double (MDP + MFA)
- Suppression : triple (saisir nom tenant + MFA + raison écrite)
- Toutes actions tracées GlobalAuditLog
- Webhooks Slack + email équipe Anthropic

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin/tenants

LIVRABLES
=========
- Code complet
- Test : provision "demo-yaounde" → pipeline 3 min OK
- Test : SOTCO-BTP suspendu → 42 users redirect /suspended
- Test : réactivation après paiement → accès restauré
- Test : changement plan Essentiel → Pro → facturation prorata
- Test : toggle sg_governance pour njoya-construction
- Test : tentative suppression sans MFA → 403
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): tenants CRUD + provisionnement automatisé — fn 1.2"
```

### PROMPT 1.3 — Facturation SaaS

```
Fonction 1.3 : facturation SaaS T-ERP.

PROTOTYPE HTML
==============
screen-admin-billing. Reproduire avec :
- KPIs (MRR 14,8 M cyan, ARR 177,6 M, Impayés 3 rouge, ARPU 352 K)
- Onglets (Factures 142, Impayés 3, Abonnements 42, Renouvellements 8)
- Section "🚨 Impayés à traiter en priorité" : 3 lignes
- Tableau "Factures récentes mai 2026" : 6 lignes avec HT/TVA 19,25%/TTC
- Section "Répartition revenus par plan" : 3 cards

WORKFLOW : CYCLE FACTURATION MENSUEL
======================================

**Émission auto (cron 1er du mois 02:00 UTC)** :
- Pour chaque tenant ACTIVE + DEMO
- Calcul MRR + prorata si changement plan
- Génération Invoice F-AAAA-NNNN
- TVA 19,25 % Cameroun
- Génération PDF + email contact facturation
- Status ISSUED

**Suivi paiements** :
- Webhook bank/Stripe → match par reference
- Update Invoice.PAID + paidAt + paidAmount
- Confirmation email tenant
- Update Subscription.lastPaidAt

**Relances auto** :
- J+7, J+15, J+30, J+45, J+60 (cf workflow tenant)

**Comptabilité** :
- Export mensuel SYSCOHADA pour comptable Anthropic
- Reconciliation bank avec Invoices
- TVA collectée trimestrielle reversée DGI

API
===
- GET /api/admin/billing/dashboard
- GET /api/admin/billing/invoices?status=&dateFrom=&dateTo=
- GET /api/admin/billing/invoices/:id
- POST /api/admin/billing/invoices/:id/send (renvoyer)
- POST /api/admin/billing/invoices/:id/record-payment
- POST /api/admin/billing/invoices/:id/cancel
- POST /api/admin/billing/invoices/:id/refund
- GET /api/admin/billing/overdue
- POST /api/admin/billing/overdue/:id/remind
- GET /api/admin/billing/subscriptions
- GET /api/admin/billing/cohort-analysis
- GET /api/admin/billing/export?format=syscohada&period=2026-04

COMPOSANTS src/components/admin/billing/
==========================================
- BillingHeader.tsx, BillingKpis.tsx, BillingTabs.tsx
- OverdueInvoicesAlert.tsx
- InvoicesTable.tsx (HT/TVA/TTC)
- RevenueByPlanCards.tsx
- IssueInvoiceModal.tsx, RecordPaymentModal.tsx
- RemindOverdueModal.tsx (email + WhatsApp)
- CohortAnalysisChart.tsx (Recharts)
- ExportSyscohadaButton.tsx

⚠️ COMPTABILITÉ ANTHROPIC
==========================
- Tous revenus en FCFA (devise base)
- TVA 19,25 % reversée trimestriellement
- Export SYSCOHADA mensuel
- Reconciliation relevés bancaires
- Provisionnement IFRS impayés > 90 jours

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin/billing

LIVRABLES
=========
- Code complet
- Test : cron 1er du mois → 42 factures générées
- Test : paiement BatimCAM 2,8 M → Invoice PAID
- Test : relance SOTCO-BTP → email + WhatsApp
- Test : export SYSCOHADA avril 2026 → OFX/CSV
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): facturation SaaS + cycle mensuel auto — fn 1.3"
```

### PROMPT 1.4 — Configuration plateforme

```
Fonction 1.4 : configuration globale.

PROTOTYPE HTML
==============
screen-admin-platform. Reproduire avec :
- Onglets (Plans & tarifs 3, Modules 12, Intégrations 8, Feature flags 24,
  Paramètres globaux)
- 3 cards plans (Essentiel, Pro RECOMMANDÉ, Enterprise)
- Tableau 10 modules avec feature flags
- 8 cards intégrations (CNPS, DGI, WhatsApp, R2 78%, Resend, Afriland,
  Sentry, Neon)

WORKFLOW : GESTION DES PLANS
==============================

**Modification plan existant** :
- Backup config actuelle
- Calcul impact MRR (delta tenants actuels)
- Workflow approbation CTO si baisse prix
- Migration tenants : grandfathering ou opt-in nouveau prix
- Notification email tenants concernés
- AuditLog CONFIG_MODIFIED

**Création nouveau plan** :
- Wizard 4 étapes
- Activation différée possible
- Test A/B optionnel landing terp.cm

WORKFLOW : FEATURE FLAGS
==========================

**Activation per-tenant** :
- Toggle ON/OFF + expiration optionnelle
- Notification UX au tenant (toast in-app)
- AuditLog avec justification

**Rollout progressif** :
1. 1 tenant pilote (BatimCAM)
2. 5 tenants élargis
3. 50% tenants
4. Disponible tous (intégration au plan)

WORKFLOW : INTÉGRATIONS GLOBALES
==================================

**Configuration** :
- Credentials chiffrés (secret manager)
- Health check auto toutes les 5 min
- Métriques agrégées (requêtes, latence, erreurs)
- Alertes Sentry si DEGRADED/DOWN

**Pannes** :
- Détection auto via health check
- Statut DOWN → notification équipe
- Page status publique mise à jour
- Communication client si > 15 min

API
===
- GET /api/admin/platform/plans
- POST/PATCH/DELETE /api/admin/platform/plans/:id
- GET /api/admin/platform/modules
- POST /api/admin/platform/modules/:id/toggle-feature-flag
- GET /api/admin/platform/feature-flags?tenantId=
- POST /api/admin/platform/feature-flags
- DELETE /api/admin/platform/feature-flags/:id
- GET /api/admin/platform/integrations
- POST /api/admin/platform/integrations/:id/test (health check)
- PATCH /api/admin/platform/integrations/:id/credentials (rotate)
- GET /api/admin/platform/settings
- PATCH /api/admin/platform/settings

COMPOSANTS src/components/admin/platform/
==========================================
- PlatformHeader.tsx, PlatformTabs.tsx
- PricingPlansCards.tsx (3 cards)
- EditPlanWizard.tsx (4 étapes)
- ModulesTable.tsx (avec feature flags)
- IntegrationsGrid.tsx (8 cards)
- IntegrationDetailDrawer.tsx (credentials + métriques + health)
- FeatureFlagsBuilder.tsx (per-tenant override)
- GlobalSettingsForm.tsx

⚠️ SÉCURITÉ
============
- Modifications plans : validation CTO si impact > 5%
- Credentials : chiffrement repos + audit décryptage
- Feature flags critiques : double validation

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin/platform

LIVRABLES
=========
- Code complet
- Test : modification Pro 285K → 320K → workflow CTO
- Test : activation sg_governance pour njoya-construction
- Test : health check CNPS → UP confirmed
- Test : rotation credentials Cloudflare R2 → secrets mis à jour
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): config plateforme + plans + features — fn 1.4"
```

### PROMPT 1.5 — Monitoring système

```
Fonction 1.5 : monitoring infrastructure et gestion incidents.

PROTOTYPE HTML
==============
screen-admin-monitoring. Reproduire avec :
- KPIs (Uptime 99,98% vert, p95 128ms cyan, Erreurs 12 rouge, Incidents 2)
- 2 incidents focus (INC-2026-0142 P2 Major paie njoya border-left rouge,
  INC-2026-0141 P3 Minor latence R2 border-left ambré)
- 8 cards métriques système 24h (Requêtes 4,2M, p50 42ms, p99 582ms, etc.)
- Tableau logs techniques 6 lignes (ERROR x2, WARN x2, INFO x2)

WORKFLOW : CYCLE DE VIE D'UN INCIDENT
=======================================

```
OPEN (créé par Sentry/alerte)
├── INVESTIGATING : acknowledge
├── IDENTIFIED : cause racine identifiée
├── MONITORING : fix déployé, surveillance
└── RESOLVED : confirmé résolu, postmortem
   └── CLOSED : postmortem publié
```

**Sévérités** :
- **P1 Critical** : plateforme down ou data loss · SLA 30 min
- **P2 Major** : module clé impacté · plusieurs tenants · SLA 2h
- **P3 Minor** : impact limité · 1 tenant · SLA 24h
- **P4 Info** : pas d'impact utilisateur · SLA 1 semaine

**Notifications** :
- P1 : tous super-admins + CTO + on-call dev
- P2 : super-admins + dev team
- P3 : super-admins + dev assigné
- P4 : super-admins seulement

**Postmortem obligatoire P1 + P2** :
- Timeline complet
- Root cause analysis
- Actions correctives
- Mesures préventives
- Publication interne sous 48h

WORKFLOW : ALERTES TEMPS RÉEL
===============================

**Sources** :
- Sentry : erreurs applicatives
- Datadog : métriques système (latence, HTTP, DB)
- UptimeRobot : disponibilité endpoints publics
- Cron health checks : intégrations tierces
- Logs anomalies : ML-based (V2)

**Routing** :
- Slack #t-erp-alerts
- Email super-admins
- SMS on-call (P1/P2)
- Page Status terp.cm

API
===
- GET /api/admin/monitoring/dashboard
- GET /api/admin/monitoring/incidents?status=&severity=
- GET /api/admin/monitoring/incidents/:id
- POST /api/admin/monitoring/incidents (créer manuel)
- PATCH /api/admin/monitoring/incidents/:id/status
- POST /api/admin/monitoring/incidents/:id/postmortem
- GET /api/admin/monitoring/metrics?period=24h&type=
- GET /api/admin/monitoring/logs?level=&source=&q=
- GET /api/admin/monitoring/health (all integrations)
- POST /api/admin/monitoring/manual-deploy
- POST /api/admin/monitoring/rollback/:version

COMPOSANTS src/components/admin/monitoring/
=============================================
- MonitoringHeader.tsx, MonitoringKpis.tsx
- OpenIncidentsList.tsx (2 cards focus)
- IncidentDetailCard.tsx (timeline + actions)
- SystemMetricsGrid.tsx (8 métriques live)
- TechnicalLogsTable.tsx (filtres avancés)
- IncidentCreateModal.tsx, IncidentResolveModal.tsx
- RollbackModal.tsx (validation MFA)
- StatusPageEmbed.tsx (iframe page status publique)

⚠️ INTÉGRATIONS
================
- Sentry : webhook entrant pour création auto incidents
- Datadog : embed dashboards via API
- PagerDuty : routage SMS on-call (V2)
- Slack : notifications + commandes (/incident, /resolve)

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin/monitoring

LIVRABLES
=========
- Code complet
- Test : alerte Sentry → création incident auto P2
- Test : assignation à dev → notification Slack
- Test : résolution → postmortem rédigé + publié
- Test : rollback v2.3.8 → déploiement Railway en 90s
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): monitoring système + gestion incidents — fn 1.5"
```

### PROMPT 1.6 — Audit & sécurité

```
Fonction 1.6 : audit trans-tenant + GDPR + sécurité comptes.

PROTOTYPE HTML
==============
screen-admin-audit. Reproduire avec :
- KPIs (Actions 418, Cross-tenant 28, Exports GDPR 2, Échecs MFA 0)
- Card "✓ Posture sécurité excellente" gradient vert (A+ Mozilla,
  94% CIS, 0 CVE critiques)
- Onglets (Audit log 418, Accès cross-tenant 28, GDPR & exports 2,
  Sécurité comptes 2, IP whitelisting)
- Filtres journal d'audit
- Tableau 8 entrées avec types d'actions
- 2 cards Super-Admin (CTO + Support L3) avec MFA YubiKey + IPs + permissions

WORKFLOW : AUDIT TRANS-TENANT
===============================

**Capture automatique** :
- Toutes actions super-admin → GlobalAuditLog
- Toutes actions cron jobs → GlobalAuditLog
- Tous déploiements CI/CD → GlobalAuditLog
- Tous accès cross-tenant → GlobalAuditLog avec justification obligatoire

**Conservation** :
- Logs immuables (append-only)
- Conservation 7 ans (loi camerounaise)
- Hash chaîné pour détection altération
- Export trimestriel sécurisé chiffré

WORKFLOW : GDPR & DROITS CLIENTS
==================================

**Demande de droit d'accès (loi 2010/012 art. 4)** :
1. Client envoie demande à support@terp.cm
2. Vérification identité (CNI + signature)
3. Export complet des données :
   - Toutes tables du tenant
   - Logs d'accès au tenant
   - Bulletins, contrats, courriers
   - Format JSON + CSV
4. Chiffrement export (mot de passe partagé séparément)
5. Envoi via email sécurisé
6. AuditLog GDPR_EXPORT
7. Conservation copie 1 an puis purge

**Demande de suppression** :
- Validation juridique (obligations légales conservation)
- Pseudonymisation vs suppression complète
- Notification aux autres tables liées
- AuditLog DATA_DELETED

**Demande de portabilité** :
- Export format ouvert (CSV, JSON, XLSX)
- Format compatible Sage, Odoo (V2)

WORKFLOW : SÉCURITÉ COMPTES
=============================

**Création nouveau super-admin** :
- Validation par 2 super-admins existants (CTO obligatoire)
- Setup MFA hardware YubiKey FIDO2 obligatoire
- IP whitelisting initial
- Permissions granulaires définies
- Période probatoire 30j (limited write)
- AuditLog ADMIN_CREATED

**Révocation immédiate** :
- En cas de compromission ou départ
- Toutes sessions invalidées
- YubiKey désenrôlée
- IPs retirées whitelist
- Conservation logs (compliance)

**Audit régulier sécurité** :
- Pentest externe annuel
- CIS Benchmark trimestriel
- SOC 2 Type II (V2 - 2027)
- Mozilla Observatory continu (A+ cible)

API
===
- GET /api/admin/audit/logs?action=&actor=&tenant=&dateFrom=&dateTo=
- GET /api/admin/audit/logs/:id
- POST /api/admin/audit/logs/export (PDF signé pour autorités)
- GET /api/admin/audit/cross-tenant-access?period=
- POST /api/admin/audit/gdpr-export (déclencher export tenant)
- GET /api/admin/audit/gdpr-export/:id/download (lien temporaire chiffré)
- GET /api/admin/audit/security/admins
- POST /api/admin/audit/security/admins (créer nouveau super-admin)
- DELETE /api/admin/audit/security/admins/:id (révocation)
- PATCH /api/admin/audit/security/admins/:id/whitelisted-ips
- POST /api/admin/audit/security/admins/:id/mfa-reset

COMPOSANTS src/components/admin/audit/
========================================
- AuditHeader.tsx, AuditKpis.tsx
- SecurityPostureCard.tsx (gradient vert + 3 scores)
- AuditTabs.tsx (5 onglets)
- AuditFiltersCard.tsx
- AuditLogTable.tsx (avec actions colorées)
- CrossTenantAccessTable.tsx (avec justifications)
- GdprExportsList.tsx
- GdprExportWizard.tsx (4 étapes)
- SuperAdminsList.tsx (2 cards)
- CreateSuperAdminWizard.tsx (5 étapes + validation 2 admins)
- RevokeSuperAdminModal.tsx (avec triple confirmation)
- IpWhitelistEditor.tsx

⚠️ SÉCURITÉ MAXIMALE
=====================
- Toute action sur super-admin requiert MFA + signature numérique
- Export GDPR : génération à durée limitée (1h) chiffré AES-256
- Logs immuables : impossibilité de modifier ou supprimer entrée
- Hash chaîné : vérification intégrité chaque heure
- Backup logs encrypted in 2 régions différentes (Cameroun + Europe)

⚠️ CONFORMITÉ LÉGALE
=====================
- Loi camerounaise 2010/012 sur protection données personnelles
- RGPD (Règlement Général Protection Données) pour clients EU
- SOC 2 Type II (planifié 2027)
- ISO 27001 (planifié 2028)
- Acte Uniforme OHADA pour données comptables

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /admin/audit

LIVRABLES
=========
- Code complet
- Test : recherche audit log par tenant batimcam → 142 entrées
- Test : export GDPR tenant njoya-construction → fichier chiffré sous 24h
- Test : création nouveau super-admin → validation par superadmin + CTO
- Test : révocation super-admin → sessions invalidées immédiatement
- Test : tentative modification ancien log audit → 403 + alerte
- Audit responsive 7/7 OK · dark cohérent
- Commit "feat(admin): audit + GDPR + sécurité comptes — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil Super-Admin complet

Tu viens de couvrir l'**ensemble du profil Super-Admin Anthropic** :
- Bloc 0 : 8 nouveaux models plateforme + RBAC trans-tenant + RLS bypass
- Bloc 1 : 6 fonctions (Dashboard, Tenants, Facturation, Configuration,
  Monitoring, Audit)

**Total profil Super-Admin : 6 fonctions livrées**

---

## POINTS FORTS DE CE PROFIL

- **Profil trans-tenant unique** distinct du IT_ADMIN tenant
- **Console plateforme** complète pour Anthropic en tant qu'éditeur SaaS
- **Provisionnement automatisé** de nouveaux tenants en ~3 min
- **Workflow suspension/facturation** automatisé avec relances multicanal
- **Sécurité maximale** : MFA hardware YubiKey + IP whitelisting + RLS bypass
- **Theme noir/cyan distinctif** pour distinguer du violet client
- **Audit immuable** : GlobalAuditLog conservation 7 ans
- **Conformité GDPR + loi 2010/012 Cameroun** complète
- **Monitoring trans-tenant** avec gestion incidents P1-P4
- **Configuration plateforme** : plans, modules, intégrations, feature flags
- **2-3 super-admins maximum** : modèle responsabilité partagée

## ESTIMATION EFFORT

- Bloc 0 (8 models + RBAC + RLS + MFA hardware + IP whitelisting) : 4-5 jours
- Bloc 1 (6 fonctions) : 11-13 jours
  - fn 1.1 Dashboard : 1,5 jour
  - fn 1.2 Tenants (provisionnement pipeline) : 3 jours
  - fn 1.3 Facturation (cycle mensuel + relances) : 2 jours
  - fn 1.4 Configuration (plans + flags + intégrations) : 2 jours
  - fn 1.5 Monitoring (incidents + alertes) : 1,5 jour
  - fn 1.6 Audit (GDPR + sécurité comptes) : 1,5 jour
- **TOTAL : 15-18 jours**

## INTERACTIONS AVEC AUTRES PROFILS

- **IT_ADMIN tenant (Étienne)** : reçoit notifications opérations sur son tenant
- **DG tenant (Albert)** : reçoit notifications facturation + suspension
- **Tous les Users tenants** : redirect vers `/suspended` si tenant suspendu
- **Aucun User normal n'a accès** à la console plateforme

## SCHEMAS BUREAUX & EFFECTIFS ANTHROPIC

Côté Anthropic, l'organisation type pour T-ERP :
- **1 CTO** : superadmin@terp.cm (toutes permissions)
- **1 Support L3** : support@terp.cm (accès lecture cross-tenant + limited write)
- **1 Billing Admin** (optionnel) : billing@terp.cm (facturation uniquement)
- **1 Compliance Officer** (optionnel) : compliance@terp.cm (audit + GDPR)

**Maximum 4 super-admins par mesure de sécurité.**

## PROCHAINES ÉTAPES POSSIBLES

L'écosystème T-ERP est maintenant **complet du point de vue produit** :
- **15 profils** (14 internes + 1 super-admin)
- **3 zones publiques** (landing + portail + candidat)
- **127 écrans HTML**
- **~100 models Prisma**

Pistes naturelles :
1. **Déploiement Railway/Neon production** (J7 du plan initial)
2. **Tests E2E Playwright** sur les 91 fonctions
3. **Module Sous-traitance** (à concevoir)
4. **Module Devis-Marchés amont** (cycle commercial avant SG)
5. **Internationalisation CEMAC** (Sénégal, Côte d'Ivoire, Gabon)
6. **Marketing terp.cm production** avec analytics
