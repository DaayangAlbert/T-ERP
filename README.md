# T-ERP — Démarrage rapide

ERP BTP multi-tenant Cameroun · Next.js 14 + Prisma + PostgreSQL.

## 📌 Référence visuelle

Avant toute chose, ouvrir **`terp_prototype.html`** dans un navigateur. C'est le prototype interactif de référence (41 écrans, 763 Ko, autonome) que les développeurs doivent reproduire en React.

Workflow recommandé pour chaque écran :
1. Ouvrir le prototype, naviguer jusqu'à l'écran à coder
2. F12 → copier la structure HTML de la zone à reproduire
3. Convertir en JSX en remplaçant les classes par les utilitaires Tailwind équivalents
4. Tester en parallèle dans le navigateur côté prototype et côté React
5. Pixel-perfect : si ça diffère, le prototype gagne

Le prototype contient déjà toutes les animations (transitions d'écran 250ms, barre de chargement violette, modales slide-up, hover lifts) — elles sont reportées dans `tailwind.config.ts` sous forme de keyframes Tailwind.

## Prérequis

- Node.js 20+ (`node -v`)
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 15+ local OU compte gratuit Neon.tech
- Git
- VS Code avec extensions : **Prisma**, **Tailwind CSS IntelliSense**, **ESLint**, **Prettier**

## Installation en 5 minutes

```bash
# 1. Cloner et installer
git clone <ton-repo> t-erp
cd t-erp
pnpm install

# 2. Variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec :
#   DATABASE_URL (Neon ou local)
#   JWT_SECRET (générer : openssl rand -base64 32)
#   NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. Initialiser la base
pnpm prisma migrate dev --name init
pnpm prisma db seed

# 4. Lancer en dev
pnpm dev
```

Application disponible sur `http://localhost:3000`.

Pour tester le multi-tenant en local, ajouter dans `/etc/hosts` :
```
127.0.0.1  app.terp.local
127.0.0.1  batimcam.terp.local
127.0.0.1  njoya.terp.local
```

Et accéder via `http://batimcam.terp.local:3000`.

## Comptes démo (après seed)

- Portail public : `http://app.terp.local:3000`
- Tenant BatimCAM : `http://batimcam.terp.local:3000`
  - DG : `albert@batimcam.cm` / `Demo2026!`
  - DAF : `marie@batimcam.cm` / `Demo2026!`
  - Informaticien : `olivier@batimcam.cm` / `Demo2026!`

## Scripts disponibles

```bash
pnpm dev              # Serveur de dev avec hot reload
pnpm build            # Build production
pnpm start            # Lancer le build de prod
pnpm lint             # ESLint
pnpm test             # Tests Vitest
pnpm prisma studio    # Interface graphique base de données
pnpm prisma generate  # Régénérer client Prisma après modif schema
pnpm prisma migrate dev --name <nom>  # Nouvelle migration
pnpm db:seed          # Re-seed des données démo
pnpm db:reset         # Reset complet (attention : perte données)
```

## Déploiement production

### 1. Base de données — Neon.tech

1. Créer compte sur https://neon.tech (free tier)
2. Créer projet "t-erp-prod"
3. Copier la DATABASE_URL dans le fichier .env de Railway

### 2. Application — Railway.app

1. Créer compte sur https://railway.app
2. New Project → Deploy from GitHub repo
3. Variables d'environnement à configurer :
   - `DATABASE_URL` (depuis Neon)
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL=https://app.terp.cm`
   - `NODE_ENV=production`
4. Settings → Domains → ajouter `*.terp.cm` (wildcard CNAME)

### 3. DNS — Cloudflare

1. Acheter `terp.cm` (chez ANIC ou autre)
2. Pointer les NS vers Cloudflare
3. Ajouter un CNAME `*` → `<projet>.up.railway.app`
4. Activer "Full" SSL strict

### 4. Email transactionnel — Resend

1. Créer compte sur https://resend.com (free 3000/mois)
2. Vérifier domaine `terp.cm`
3. Ajouter `RESEND_API_KEY` dans Railway

### 5. Monitoring — Sentry

1. Créer compte sur https://sentry.io (free 5K events/mois)
2. Créer projet Next.js
3. `pnpm add @sentry/nextjs`
4. `npx @sentry/wizard@latest -i nextjs`

## Coûts mensuels

| Service | Coût démarrage | Coût à 50 utilisateurs |
|---------|----------------|------------------------|
| Neon DB | gratuit | gratuit |
| Railway | gratuit (500h/mois) | ~10 USD |
| Cloudflare | gratuit | gratuit |
| Resend | gratuit | gratuit |
| Sentry | gratuit | gratuit |
| Domaine terp.cm | ~12 000 FCFA/an | — |
| **Total** | **~1 000 FCFA/mois** | **~7 000 FCFA/mois** |

## Documentation

- [Cahier des charges](./CAHIER_DES_CHARGES_DEV.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Déploiement détaillé](./docs/DEPLOYMENT.md)
- [Rôles et permissions](./docs/ROLES_PERMISSIONS.md)
- [Codes paie SYSCOHADA](./docs/PAYROLL_CODES.md)

## Contact

Albert DAAYANG — Yaoundé, Cameroun — `contact@terp.cm`
