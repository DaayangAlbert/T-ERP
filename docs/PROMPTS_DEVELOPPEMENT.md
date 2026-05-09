# PROMPT DE DÉMARRAGE — Projet T-ERP

À coller dans **Claude Code** (terminal), **Cursor** (chat), ou **Claude.ai avec accès code execution**.

Avant de lancer le prompt, place dans le dossier de travail les fichiers suivants (livrés séparément) :
- `terp_prototype.html` (le prototype 41 écrans, à la racine)
- `CAHIER_DES_CHARGES_DEV.md`
- `schema.prisma`
- `seed.ts`
- `package.json`
- `.env.example`
- `tailwind.config.ts`
- `next.config.js`
- `middleware.ts`
- `Sidebar.tsx`, `Header.tsx`, `Button.tsx`

L'agent IA aura ainsi tout le contexte pour bootstrapper le projet correctement.

---

## ⭐ PROMPT INITIAL (J0 — bootstrap)

```
Je démarre le développement d'un ERP BTP multi-tenant pour le Cameroun appelé T-ERP.

CONTEXTE
========
J'ai préparé tout le matériel de spécification :
- Le prototype HTML interactif complet (terp_prototype.html, 41 écrans pixel-perfect, 763 Ko)
  C'est LA SOURCE DE VÉRITÉ VISUELLE. Toute interface doit lui ressembler exactement.
- Le cahier des charges (CAHIER_DES_CHARGES_DEV.md)
- Le schéma Prisma complet (schema.prisma)
- Le seed de données démo (seed.ts)
- Les fichiers de configuration (package.json, tailwind.config.ts, next.config.js, middleware.ts, .env.example)
- 3 composants starter (Sidebar.tsx, Header.tsx, Button.tsx) qui montrent les conventions

STACK
=====
- Next.js 14 App Router + TypeScript
- Prisma 5 + PostgreSQL (Neon.tech)
- Tailwind CSS 3 (palette T-ERP déjà dans tailwind.config.ts)
- Zustand pour le state, TanStack Query pour les API
- React Hook Form + Zod pour les formulaires
- bcrypt + jsonwebtoken pour l'auth
- Recharts pour les graphes
- React-PDF pour les bulletins de paie
- pnpm pour la gestion de paquets

CHARTE
======
- Couleur primaire : #A855F7 (violet)
- Sidebar sombre : #2A1B3D
- Polices : Inter (corps) + IBM Plex Mono (chiffres)
- Le tailwind.config.ts contient déjà toute la palette dérivée

OBJECTIF DU MVP (7 JOURS)
=========================
Plateforme déployée en ligne couvrant :
1. Portail public emploi (accueil, liste offres, détail offre)
2. Authentification multi-tenant (login + 2 flux d'inscription : candidat / informaticien d'entreprise)
3. Tableau de bord DG avec KPIs et graphes
4. Liste des chantiers
5. Mon profil (lecture + édition)
6. Ma paie (historique des bulletins)
7. Bulletin officiel format CNPS Cameroun (PDF téléchargeable)
8. Messagerie style WhatsApp
9. Multi-tenant fonctionnel (sous-domaines)
10. Modale changement de profil démo (12 profils dans le même tenant)

TÂCHE J0 — BOOTSTRAP
====================
1. Initialise le projet Next.js 14 avec App Router et TypeScript :
   pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir=false --import-alias "@/*"
   (utilise les flags pour skip toutes les questions)

2. Installe les dépendances exactes listées dans le package.json fourni :
   Remplace le package.json généré par celui que je fournis, puis pnpm install.

3. Crée la structure de dossiers complète selon STRUCTURE_PROJET.md :
   src/app/(public)/, src/app/(app)/, src/app/(admin)/, src/app/api/
   src/components/{ui,layout,dashboard,sites,payroll,messaging,public,auth}/
   src/{lib,hooks,stores,types,schemas}/
   prisma/, tests/, docs/

4. Place les fichiers fournis aux bons emplacements :
   - schema.prisma → prisma/schema.prisma
   - seed.ts → prisma/seed.ts
   - tailwind.config.ts, next.config.js, package.json, .env.example → racine
   - middleware.ts → src/middleware.ts
   - Sidebar.tsx, Header.tsx → src/components/layout/
   - Button.tsx → src/components/ui/

5. Crée les fichiers de configuration manquants :
   - .gitignore (Node + Next.js + .env.local + uploads/)
   - .prettierrc (config Prettier avec plugin Tailwind)
   - .eslintrc.json (config Next.js standard)
   - tsconfig.json (paths @/* configurés)
   - postcss.config.js

6. Crée les utilitaires de base dans src/lib/ :
   - prisma.ts (singleton Prisma client avec gestion dev hot reload)
   - auth.ts (signJwt, verifyJwt, hashPassword, comparePassword)
   - tenant.ts (getTenantFromHeaders, getTenantBySlug)
   - format.ts (formatFCFA, formatDate FR, formatRelativeDate)
   - api-client.ts (config TanStack Query avec QueryClient et provider)

7. Crée les hooks Zustand de base dans src/stores/ :
   - auth-store.ts (user, login, logout, updateProfile)
   - ui-store.ts (sidebarCompact, mobileSidebarOpen, toggleSidebarCompact, toggleMobileSidebar)
   - tenant-store.ts (tenant, setTenant)

8. Crée src/app/layout.tsx (root) avec :
   - Polices Inter + IBM Plex Mono via next/font/google
   - Providers : QueryClientProvider, AuthProvider
   - Variables CSS globales dans globals.css (reprendre depuis le prototype : --primary, --sidebar-bg, etc.)

9. Crée une page d'accueil src/app/(public)/page.tsx minimaliste qui affiche :
   "T-ERP — projet initialisé. Prochaine étape : J1 portail public."
   avec le logo SVG et un bouton style violet pour vérifier que Tailwind fonctionne.

10. Initialise Git, fait le premier commit "chore: bootstrap T-ERP project"

LIVRABLES J0 ATTENDUS
=====================
- pnpm install passe sans erreur
- pnpm dev lance l'app sur http://localhost:3000
- Page d'accueil s'affiche avec le bouton violet correctement stylé
- pnpm prisma generate génère le client sans erreur
- Structure complète prête pour J1

Si une étape échoue, arrête-toi et demande-moi avant de continuer.
Procède étape par étape, montre-moi le résultat de chaque étape clé, et confirme avant de passer à la suivante.
```

---

## J1 — Authentification + Portail public

```
Aujourd'hui J1 : authentification multi-tenant + portail emploi public.

PRÉREQUIS
- Avant de coder, ouvre `terp_prototype.html` dans un navigateur, navigue vers
  l'écran "screen-portal" (accueil emploi) et "screen-login".
- Inspecte la structure HTML/CSS, c'est ce qu'on va reproduire.

TÂCHES
======

1. Configure une base PostgreSQL :
   - Crée un compte sur Neon.tech (ou utilise une base locale)
   - Met DATABASE_URL dans .env.local
   - pnpm prisma migrate dev --name init
   - pnpm db:seed
   - Vérifie avec pnpm prisma studio que les 12 utilisateurs et 6 chantiers sont créés

2. API Auth (src/app/api/auth/) :
   - POST /api/auth/login : valide email+password, retourne JWT + refresh token
   - POST /api/auth/register/candidate : inscription candidat (User avec role=CANDIDATE, tenantId=null)
   - POST /api/auth/register/company : inscription informaticien (crée Tenant + User role=TENANT_ADMIN)
   - POST /api/auth/refresh
   - POST /api/auth/logout
   - GET /api/auth/me : retourne le profil utilisateur courant

   Toutes les routes valident les inputs avec Zod (créer src/schemas/auth.ts).
   Tokens stockés en cookie httpOnly Secure SameSite=Strict.

3. API publique des offres (src/app/api/public/jobs/) :
   - GET /api/public/jobs : liste paginée des offres avec status=PUBLISHED, agrège tous tenants
   - GET /api/public/jobs/:id : détail d'une offre

4. Page portail public (src/app/(public)/page.tsx) :
   Reproduit "screen-portal" du prototype : hero violet, header avec bouton "Connexion" et "Publier
   une offre", grille de 6 cartes d'offres (utilise la query useJobs() avec TanStack Query).

5. Composants nécessaires (src/components/public/) :
   - PortalHero.tsx (le hero violet avec dégradé radial)
   - JobCard.tsx (la carte offre avec catégorie, salaire, région, bouton "Postuler")
   - JobsGrid.tsx (grille responsive 1/2/3 colonnes)
   - PortalFooter.tsx

6. Modale d'authentification (src/components/auth/) :
   - AuthModal.tsx (modale centrale avec 3 onglets : Connexion / Inscription candidat / Inscription entreprise)
   - LoginForm.tsx (email + password, React Hook Form + Zod)
   - RegisterCandidateForm.tsx (nom, email, téléphone, password, CV optionnel)
   - RegisterCompanyForm.tsx (nom entreprise, slug suggéré, contribuable, votre nom, email, password)

7. Page détail offre (src/app/(public)/jobs/[id]/page.tsx) :
   Affiche le détail complet, avec bouton "Postuler" qui ouvre la modale (ou redirige vers le formulaire si déjà connecté).

LIVRABLES
=========
- Le portail s'ouvre sur http://localhost:3000
- 6 offres réelles (issues du seed) s'affichent
- Un visiteur peut s'inscrire en candidat OU en informaticien d'entreprise
- Un informaticien obtient un nouveau tenant (slug auto-généré, valider l'unicité)
- Un utilisateur seedé (albert@batimcam.cm / Demo2026!) peut se connecter
- Après login, redirection vers /dashboard
- Les tokens sont en cookies httpOnly

Travaille étape par étape. À chaque grande étape, montre-moi un test (curl ou capture).
```

---

## J2 — Layout authentifié + Sidebar + Profile switcher

```
J2 : structure de l'app authentifiée avec sidebar uniformisée et modale de switch profil démo.

PRÉREQUIS
- Ouvre terp_prototype.html, navigue dans plusieurs écrans pour observer
  la sidebar (Pilotage / Activité / Administration / Mon espace) et le header.
- Note les comportements responsive (sidebar passe en mode compact icônes seules à 1280px,
  tiroir overlay à 768px).

TÂCHES
======

1. Crée le layout authentifié src/app/(app)/layout.tsx :
   - Header (composant déjà fourni, à compléter avec données réelles via useTenant et useAuth)
   - Sidebar (composant déjà fourni, ajuster selon le rôle utilisateur si besoin)
   - Main content avec barre de chargement violette (NavProgress.tsx) + breadcrumbs + children
   - Protection : si pas authentifié, redirect /login
   - Detect hostname pour multi-tenant : si pas de tenant slug ou inexistant, redirect /

2. Composants layout (src/components/layout/) :
   - NavProgress.tsx (barre de chargement violette en haut, déclenchée par les transitions
     de route via useEffect sur pathname)
   - Breadcrumbs.tsx (liste des segments de l'URL avec liens)
   - ProfileSwitcher.tsx (modale "Changer de profil" avec les 12 boutons des profils démo,
     reproduit fidèlement le screen-portal/profile-modal du prototype)
   - TenantBadge.tsx (badge tenant cliquable dans le header)

3. Modale profile switcher :
   - 12 boutons grille 3 colonnes correspondant aux 12 utilisateurs démo
   - Au clic : appelle API /api/auth/switch-profile (à créer, simule en dev sans
     vrai login en réutilisant le JWT mais en changeant l'userId)
   - En PROD ce sera désactivé, mais en MVP démo c'est essentiel
   - Bouton "Super-admin SaaS" qui redirige vers admin.terp.local:3000
   - Bouton "Retour au portail public" qui redirige vers app.terp.local:3000

4. Page /dashboard qui redirige selon le rôle :
   - DG → /dashboard/dg
   - DAF → /dashboard/daf
   - etc.

5. Crée /dashboard/dg/page.tsx (squelette uniquement aujourd'hui, contenu en J3)

LIVRABLES
=========
- Après login, l'utilisateur arrive sur le layout authentifié avec sa sidebar
- La sidebar passe en mode compact à 1280px, tiroir mobile à 768px
- Le toggle chevron permet de forcer manuellement compact/étendu
- Item actif souligné en violet à gauche
- Tooltips au survol en mode compact
- La modale "Changer profil" permet de basculer entre les 12 utilisateurs démo
- Animations fluides : screen fade-in 250ms, barre de chargement violette à chaque navigation
```

---

## J3 — Tableau de bord DG

```
J3 : tableau de bord DG complet, le plus riche fonctionnellement.

PRÉREQUIS
- Ouvre terp_prototype.html → screen-dg
- Note les 4 KPIs avec sparklines, les 2 graphes (CA/marge en barres+ligne, donut répartition),
  la liste des alertes, et le top chantiers.

TÂCHES
======

1. API GET /api/dashboard/dg :
   Retourne un objet structuré :
   {
     kpis: { revenue: { value, trend, sparkline[] }, margin: {...}, treasury: {...}, headcount: {...} },
     revenueChart: { months: [...], revenue: [...], margin: [...] },
     siteTypeBreakdown: [{ type, value, percentage }],
     alerts: [{ severity, title, description, link }],
     pendingValidations: [{ ref, type, amount, deadline }],
     topSites: [{ code, name, progress, margin, status }]
   }

   Les données sont calculées depuis Prisma. Pour le MVP, on simule certaines (sparklines)
   en générant des arrays de 12 valeurs qui montent.

2. Page src/app/(app)/dashboard/dg/page.tsx :
   - useDashboardDg() hook avec TanStack Query
   - Loader skeleton pendant le chargement
   - Layout : view-header + KPI row + 2 graphes côte-à-côte + alertes/validations + listview top chantiers

3. Composants (src/components/dashboard/) :
   - KpiCard.tsx (label, value, unit, sparkline SVG, delta avec flèche, clickable)
   - Sparkline.tsx (mini courbe SVG inline 56x20)
   - RevenueChart.tsx (Recharts ComposedChart avec barres CA + ligne marge sur 12 mois)
   - DonutChart.tsx (Recharts PieChart avec center text, légende latérale)
   - AlertsList.tsx (liste avec bordure colorée gauche selon sévérité)
   - ValidationsList.tsx (liste compacte avec montants alignés)
   - TopSitesTable.tsx (listview avec ProgressInline)

4. Hooks dans src/hooks/ :
   - useDashboardDg.ts

5. Data formatters dans src/lib/format.ts :
   - formatFCFA(amount, options) : "186,4 M FCFA" ou "2,84 Md FCFA" ou "412 000"
   - formatPercent, formatDelta avec couleur

6. Responsive :
   - 4 KPIs en row sur desktop, 2x2 sur tablette, 1 colonne sur mobile
   - Graphes côte-à-côte sur desktop, empilés en mobile
   - Listview avec scroll horizontal sur mobile (déjà géré par les classes du prototype)

LIVRABLES
=========
- /dashboard/dg charge en moins de 2 secondes
- Tous les chiffres sont issus de la base (avec calculs Prisma sur les chantiers seedés)
- Les graphes sont interactifs (tooltip Recharts au survol)
- Le clic sur une carte KPI navigue vers le module correspondant (Finances, Sites, RH...)
- 100% conforme au prototype au pixel près
```

---

## J4 — Chantiers + Mon profil + Ma paie

```
J4 : 3 modules en lecture pour donner de la matière à la démo.

CHANTIERS
=========
1. API CRUD :
   - GET /api/sites (liste paginée avec filtres status, type, region, search)
   - GET /api/sites/:id (détail)
   - POST /api/sites (création, droits Role.DG/DAF/TECH_DIRECTOR)
   - PUT /api/sites/:id
   - DELETE /api/sites/:id (soft delete : status = ARCHIVED)

2. Page /chantiers :
   Reproduit screen-sites du prototype.
   - 4 KPIs en haut
   - Filtres (statut, type, région, search)
   - Listview avec colonnes code, libellé, client, dir. travaux, avancement (ProgressInline),
     budget, marge, date livraison, état
   - Pagination

3. Page /chantiers/[id] :
   Détail d'un chantier (à enrichir en phase 2, MVP minimal aujourd'hui).

MON PROFIL
==========
1. API :
   - GET /api/users/me (profil détaillé avec rôle, employeeId, contrat, etc.)
   - PUT /api/users/me (modification champs autorisés : phone, address)
   - PUT /api/users/me/password (changement mot de passe avec ancien + nouveau)

2. Page /profil :
   Reproduit screen-profile :
   - Hero violet avec avatar XL, nom, poste, coordonnées en ligne
   - Onglets Informations / Documents / Activité / Sécurité / Préférences
   - 4 KPIs personnels (solde congés, ancienneté, documents, connexions)
   - Form-card "Identité & coordonnées" (édition)
   - Form-card "Informations professionnelles" (lecture seule)
   - Liste documents personnels (placeholder pour MVP)
   - Card sécurité (mot de passe, 2FA, sessions, notifications)

MA PAIE
=======
1. API :
   - GET /api/users/me/payslips (historique paginé avec brut, net, statut, période)
   - GET /api/users/me/payslips/:id (détail bulletin avec lignes A001-A072)

2. Page /paie :
   Reproduit screen-pay :
   - Card hero gradient violet avec bulletin du mois courant (4 tuiles : brut, cotisations, avantages, net)
   - 4 KPIs (salaire moyen avec sparkline, cumul YTD, solde congés, heures sup)
   - Graphe évolution 12 mois (barres brut + ligne net)
   - Listview historique des bulletins
   - Card "Décomposition Avril" + "Conformité fiscale & sociale"

3. Page /paie/bulletin/[id] :
   Reproduit screen-payslip — le bulletin officiel format ENSAH SARL avec :
   - En-tête multi-zones (employeur bandeau bleu, période, paiement)
   - Identité salarié (matricule, catégorie, ancienneté, CNPS)
   - Grille codes A001-A072 (15 lignes)
   - TOTAL + NET À PAYER encadré
   - Bandeau cumul bas
   - Imprimable directement (CSS @media print)

LIVRABLES
=========
- /chantiers liste les 6 chantiers seedés avec données réelles
- /profil édite réellement les champs autorisés (test : modifier téléphone, recharger, persistance OK)
- /paie affiche l'historique du bulletin seedé pour Albert DAAYANG
- /paie/bulletin/<id> reproduit le bulletin officiel pixel-perfect
```

---

## J5 — PDF bulletin + Messagerie

```
J5 : génération PDF du bulletin et messagerie temps quasi-réel.

BULLETIN PDF (React-PDF)
========================
1. Composant src/components/payroll/PayslipPDF.tsx avec @react-pdf/renderer :
   - Reproduire la mise en page du bulletin officiel ENSAH SARL en PDF
   - Document A4 portrait
   - Tables avec borders #999
   - En-tête bandeau bleu, grille codes A001-A072, NET À PAYER encadré, bandeau cumul
   - Police par défaut Helvetica (intégrée React-PDF)

2. API GET /api/payslips/:id/pdf :
   - Génère le PDF avec React-PDF côté serveur
   - Renvoie blob avec headers Content-Type: application/pdf, Content-Disposition: attachment

3. Bouton "Télécharger PDF" sur /paie/bulletin/[id] :
   - Appelle l'API, déclenche le téléchargement

MESSAGERIE
==========
1. API :
   - GET /api/conversations (mes conversations triées par lastMessageAt desc)
   - GET /api/conversations/:id/messages (paginé, ordre chrono)
   - POST /api/conversations/:id/messages (envoyer un message)
   - POST /api/conversations (créer une conversation 1-1 ou groupe)

2. Page /messagerie :
   Reproduit screen-msg :
   - Layout 2 panneaux desktop (sidebar 340px conversations + panneau conversation actif)
   - Layout mobile : un panneau à la fois (liste OU conversation)
   - Sidebar : recherche, filtres tabs (Tous / Non lus / Groupes), liste des conversations
     avec avatar, nom, last message, timestamp, badge non lu
   - Panneau actif : header (avatar + nom + statut en ligne), zone messages avec bulles
     (bulles violettes pour soi à droite, blanches pour autres à gauche), composer en bas
   - Indicateur de frappe animé (3 points qui pulsent)

3. Composants (src/components/messaging/) :
   - ConversationList.tsx
   - ConversationView.tsx
   - MessageBubble.tsx (avec gestion timestamps groupés, lecture, attachments)
   - Composer.tsx (textarea auto-resize, bouton emoji, bouton attachment, bouton envoyer)
   - TypingIndicator.tsx

4. Polling (MVP) :
   useQuery avec refetchInterval: 3000ms sur la conversation active.
   En phase 2 on passera à WebSocket / SSE.

LIVRABLES
=========
- Le PDF du bulletin se télécharge et s'ouvre correctement, mise en page conforme
- 2 sessions navigateur peuvent s'envoyer des messages dans la conversation seedée
  "Pont Mfoundi · équipe", les nouveaux messages apparaissent en moins de 3s
- Responsive : mobile bascule entre liste et conversation
```

---

## J6 — Multi-tenant + Finitions responsive

```
J6 : finaliser le multi-tenant fonctionnel et passer toutes les pages au responsive.

MULTI-TENANT
============
1. Vérifie le middleware.ts :
   - app.terp.local:3000 → portail public
   - batimcam.terp.local:3000 → tenant BatimCAM
   - admin.terp.local:3000 → super-admin
   - Header x-tenant-slug correctement injecté

2. Pour le développement local sans modifier /etc/hosts, ajoute dans next.config.js
   un dev rewrite qui interprète un query param ?tenant=batimcam comme le slug.

3. Crée un deuxième tenant via inscription "informaticien d'entreprise" :
   - "Groupe NJOYA" avec slug auto njoya
   - Vérifie que les données sont isolées (njoya.terp.local n'affiche pas les chantiers de batimcam)

4. Page super-admin minimaliste src/app/(admin)/tenants/page.tsx :
   - Liste des tenants avec status, plan, date création, nb utilisateurs
   - Bouton suspendre/réactiver un tenant
   - Reproduit screen-admin du prototype (style noir/cyan #0F172A/#22D3EE)

FINITIONS RESPONSIVE
====================
1. Test toutes les pages déjà créées sur :
   - 1920px (desktop)
   - 1440px (laptop)
   - 1280px (small desktop, sidebar bascule en compact)
   - 1024px (tablette landscape)
   - 768px (tablette portrait)
   - 414px (mobile large)
   - 375px (mobile standard)

2. Corrige tous les bugs visuels observés (overflow, texte tronqué, sidebar mal positionnée).

3. Vérifie que les listviews passent en scroll horizontal sur mobile (déjà géré par
   les classes du prototype, mais peut nécessiter ajustements en JSX).

4. Test des interactions tactiles (tap, swipe pour ouvrir/fermer la sidebar mobile).

ACCESSIBILITY
=============
1. Ajoute les attributs aria-label, aria-describedby, role là où nécessaire.
2. Test la navigation au clavier (Tab, Enter, Escape pour fermer modales).
3. Score Lighthouse Accessibility >= 90 sur le portail public.

LIVRABLES
=========
- 2 tenants (batimcam + njoya) fonctionnent en parallèle, données isolées
- Toutes les pages sont responsives sans bug visuel sur 7 tailles d'écran
- Score Lighthouse Performance >= 80 sur portail public
- Score Lighthouse Accessibility >= 90 partout
```

---

## J7 — Déploiement production + Démo

```
J7 : déploiement public et préparation de la démo client.

DÉPLOIEMENT
===========
1. Base de données prod :
   - Crée projet "t-erp-prod" sur Neon.tech
   - Lance pnpm prisma migrate deploy depuis local pointant vers prod
   - Lance le seed prod (avec données démo OU données vierges selon stratégie)

2. Application :
   - Push le repo Git vers GitHub
   - Crée un projet Railway depuis le repo GitHub
   - Configure les variables d'environnement Railway :
     DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL=https://app.terp.cm,
     RESEND_API_KEY, NODE_ENV=production
   - Vérifie le déploiement automatique sur push main

3. Domaine et DNS :
   - Achète terp.cm (chez ANIC ou autre, ~12 000 FCFA/an)
   - Pointe les NS vers Cloudflare
   - Ajoute CNAME * → <projet>.up.railway.app
   - Active SSL Full strict
   - Vérifie que app.terp.cm, admin.terp.cm, batimcam.terp.cm sont accessibles

4. Email :
   - Vérifie le domaine terp.cm sur Resend
   - Configure RESEND_FROM_EMAIL=noreply@terp.cm
   - Test : envoie un email de bienvenue à l'inscription

5. Monitoring :
   - Crée projet Sentry, ajoute SENTRY_DSN dans Railway
   - npx @sentry/wizard@latest -i nextjs
   - Vérifie qu'une erreur volontaire est bien captée

DÉMO PRÊTE
==========
1. Vérifie le parcours démo complet :
   a) Visiteur arrive sur app.terp.cm → portail emploi avec 6 offres
   b) Clic "Connexion" → modale → connexion DG batimcam
   c) Atterrit sur dashboard DG avec KPIs et graphes
   d) Clic "Changer profil" → bascule vers chef de chantier
   e) Navigation vers messagerie, envoi d'un message
   f) Retour DG → consultation d'un chantier
   g) /paie → consultation bulletin → téléchargement PDF
   h) Inscription d'une nouvelle entreprise (sous-domaine créé à la volée)
   i) Page super-admin sur admin.terp.cm avec liste des tenants

2. Prépare un script de démo de 10 minutes pour un prospect.

3. Crée un fichier DEMO_SCRIPT.md avec le déroulé.

LIVRABLES FINAUX
================
- https://app.terp.cm accessible publiquement
- 6 offres réelles sur le portail
- 12 profils démo accessibles dans BatimCAM SA
- Bulletin PDF téléchargeable
- Messagerie fonctionnelle
- Inscription nouvelle entreprise génère un nouveau tenant
- Score Lighthouse Performance >= 80
- Démo de 10 minutes prête pour prospect
```

---

## NOTES FINALES POUR L'AGENT

À chaque étape, l'agent doit :
1. Lire la section pertinente du prototype HTML avant de coder
2. Suivre la convention TypeScript stricte (pas de `any`)
3. Valider tous les inputs avec Zod
4. Gérer les erreurs avec try/catch et retours JSON structurés
5. Tester chaque endpoint avec curl ou via le navigateur
6. Commit Git après chaque tâche complétée
7. **En cas de blocage, s'arrêter et demander** plutôt que de bricoler

Le prototype est la vérité. Le cahier complète. La stack est fixée.
Les compromis acceptables sont uniquement sur le scope (reporter en phase 2),
jamais sur la qualité visuelle.
