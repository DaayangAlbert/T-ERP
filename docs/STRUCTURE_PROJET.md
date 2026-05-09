# STRUCTURE PROJET T-ERP

Monorepo Next.js + Prisma · TypeScript de bout en bout · Multi-tenant PostgreSQL.

```
t-erp/
│
├── README.md                           # Démarrage rapide
├── CAHIER_DES_CHARGES_DEV.md           # Cahier des charges v3
├── .gitignore
├── .env.example                        # Variables env de référence
├── .env.local                          # Variables locales (gitignored)
├── package.json                        # Scripts pnpm
├── pnpm-lock.yaml
├── next.config.js                      # Config Next.js (sous-domaines)
├── tailwind.config.ts                  # Charte T-ERP (palette violet)
├── tsconfig.json
├── postcss.config.js
├── .eslintrc.json
├── .prettierrc
│
├── prisma/
│   ├── schema.prisma                   # Modèle de données complet
│   ├── seed.ts                         # Données démo (BatimCAM + 12 profils)
│   └── migrations/                     # Migrations versionnées
│
├── public/
│   ├── favicon.ico
│   ├── logo-terp.svg                   # Logo F violet (depuis prototype)
│   └── images/
│       └── og-default.jpg              # Image partage social
│
├── src/
│   │
│   ├── app/                            # Next.js App Router
│   │   │
│   │   ├── (public)/                   # Routes publiques (portail)
│   │   │   ├── layout.tsx              # Layout sans auth
│   │   │   ├── page.tsx                # Portail emploi (accueil)
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx            # Liste des offres
│   │   │   │   └── [id]/page.tsx       # Détail offre
│   │   │   ├── login/page.tsx
│   │   │   ├── register/
│   │   │   │   ├── candidate/page.tsx  # Inscription candidat
│   │   │   │   └── company/page.tsx    # Inscription informaticien
│   │   │   └── about/page.tsx
│   │   │
│   │   ├── (app)/                      # Routes authentifiées tenant
│   │   │   ├── layout.tsx              # Layout sidebar + header
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx            # Redirige vers dashboard du rôle
│   │   │   │   ├── dg/page.tsx         # Dashboard DG
│   │   │   │   ├── daf/page.tsx
│   │   │   │   ├── chef-chantier/page.tsx
│   │   │   │   └── ...
│   │   │   ├── chantiers/
│   │   │   │   ├── page.tsx            # Liste chantiers
│   │   │   │   └── [id]/page.tsx       # Détail chantier
│   │   │   ├── finances/page.tsx
│   │   │   ├── rh/page.tsx
│   │   │   ├── paie/
│   │   │   │   ├── page.tsx            # Ma paie
│   │   │   │   ├── bulletin/[id]/page.tsx
│   │   │   │   └── etats/page.tsx      # États de salaire
│   │   │   ├── messagerie/page.tsx     # Chat WhatsApp-style
│   │   │   ├── profil/page.tsx
│   │   │   ├── validations/page.tsx
│   │   │   ├── rapports/page.tsx
│   │   │   ├── achats/page.tsx
│   │   │   ├── stocks/page.tsx
│   │   │   ├── configuration/page.tsx  # Admin tenant
│   │   │   └── securite/page.tsx       # Rôles
│   │   │
│   │   ├── (admin)/                    # Super-admin SaaS (Anthropic)
│   │   │   ├── layout.tsx
│   │   │   ├── tenants/page.tsx
│   │   │   ├── plans/page.tsx
│   │   │   └── support/page.tsx
│   │   │
│   │   ├── api/                        # API Routes Next.js
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/
│   │   │   │   │   ├── candidate/route.ts
│   │   │   │   │   └── company/route.ts
│   │   │   │   ├── refresh/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── tenant/route.ts
│   │   │   ├── users/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── sites/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── payslips/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── pdf/route.ts    # Génération PDF
│   │   │   ├── conversations/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/messages/route.ts
│   │   │   ├── dashboard/[role]/route.ts
│   │   │   └── public/
│   │   │       └── jobs/
│   │   │           ├── route.ts
│   │   │           └── [id]/apply/route.ts
│   │   │
│   │   ├── layout.tsx                  # Root layout (fonts, providers)
│   │   ├── globals.css                 # Tailwind + variables CSS T-ERP
│   │   ├── not-found.tsx               # Page 404
│   │   └── error.tsx                   # Page erreur globale
│   │
│   ├── components/
│   │   │
│   │   ├── ui/                         # Composants UI atomiques
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Sparkline.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx             # Sidebar uniformisée
│   │   │   ├── Header.tsx              # Header app violet sombre
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── ProfileSwitcher.tsx     # Modale 12 profils démo
│   │   │   ├── TenantBadge.tsx
│   │   │   └── NavProgress.tsx         # Barre chargement violette
│   │   │
│   │   ├── dashboard/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── RevenueChart.tsx        # Recharts bar+line
│   │   │   ├── DonutChart.tsx
│   │   │   ├── AlertsList.tsx
│   │   │   └── ValidationsList.tsx
│   │   │
│   │   ├── sites/
│   │   │   ├── SitesList.tsx
│   │   │   ├── SiteDetail.tsx
│   │   │   ├── ProgressInline.tsx
│   │   │   └── SiteStatusBadge.tsx
│   │   │
│   │   ├── payroll/
│   │   │   ├── PayslipsList.tsx
│   │   │   ├── PayslipPDF.tsx          # React-PDF template
│   │   │   ├── OfficialPayslip.tsx     # Vue HTML imprimable
│   │   │   └── PayrollStateCard.tsx
│   │   │
│   │   ├── messaging/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationView.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── Composer.tsx
│   │   │   └── TypingIndicator.tsx
│   │   │
│   │   ├── public/
│   │   │   ├── PortalHero.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobsGrid.tsx
│   │   │   └── PortalFooter.tsx
│   │   │
│   │   └── auth/
│   │       ├── AuthModal.tsx
│   │       ├── LoginForm.tsx
│   │       ├── RegisterCandidateForm.tsx
│   │       └── RegisterCompanyForm.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                   # Singleton Prisma client
│   │   ├── auth.ts                     # JWT helpers
│   │   ├── tenant.ts                   # Résolution sous-domaine → tenant
│   │   ├── api-client.ts               # TanStack Query setup
│   │   ├── permissions.ts              # Matrice rôles
│   │   ├── format.ts                   # Format FCFA, dates
│   │   ├── pdf.ts                      # Helpers React-PDF
│   │   └── seed-data.ts                # Données démo
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   ├── useUser.ts
│   │   ├── useSidebar.ts               # Compact/expanded state
│   │   └── useNotifications.ts
│   │
│   ├── stores/                         # Zustand
│   │   ├── auth-store.ts
│   │   ├── ui-store.ts                 # Sidebar, modales
│   │   └── tenant-store.ts
│   │
│   ├── types/
│   │   ├── api.ts                      # Types réponses API
│   │   ├── models.ts                   # Types métier
│   │   └── index.ts
│   │
│   ├── schemas/                        # Zod (validation partagée)
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── site.ts
│   │   ├── payslip.ts
│   │   └── job.ts
│   │
│   └── middleware.ts                   # Middleware Next.js (tenant + auth)
│
├── tests/
│   ├── setup.ts
│   ├── auth.test.ts
│   ├── sites.test.ts
│   └── payslips.test.ts
│
└── docs/
    ├── ARCHITECTURE.md                 # Décisions techniques
    ├── DEPLOYMENT.md                   # Guide déploiement Railway/Neon
    ├── ROLES_PERMISSIONS.md            # Matrice complète
    └── PAYROLL_CODES.md                # Codes A001-A072 SYSCOHADA
```
