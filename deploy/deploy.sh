#!/usr/bin/env bash
# =============================================================================
#  T-ERP — Déploiement / Mise à jour sur le VPS de production
# =============================================================================
#
#  Exécuté sur le VPS (en user `ubuntu`) à chaque release :
#
#    cd /var/www/terp
#    git pull origin main
#    ./deploy/deploy.sh
#
#  Étapes :
#   1. Pull du code (si lancé sans avoir pull au préalable)
#   2. pnpm install --frozen-lockfile --prod=false (besoin des devDeps pour build)
#   3. prisma generate + db push (migrations)
#   4. next build (production)
#   5. Copie des assets dans .next/standalone
#   6. PM2 restart (zero-downtime via reload)
#
#  Anti-bricolage : ne pas exécuter en sudo. PM2 tourne en user ubuntu.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log() { echo -e "${GREEN}[deploy]${NC} $*"; }
fail() { echo -e "${RED}[fail]${NC} $*"; exit 1; }

cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

[[ -f .env.production ]] || fail ".env.production manquant — copier .env.production.example et remplir."

log "Pull dernière version main…"
git fetch origin
git checkout main
git pull --ff-only origin main

log "Installation dépendances (frozen lockfile)…"
pnpm install --frozen-lockfile

log "Prisma generate + push schema…"
pnpm exec prisma generate
pnpm exec prisma db push --skip-generate

log "Build Next.js (standalone)…"
NODE_ENV=production pnpm build

log "Copie des assets dans .next/standalone…"
# Le build standalone ne copie PAS automatiquement public/ et .next/static
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Charger .env.production dans le runtime PM2
log "Restart PM2 (zero-downtime)…"
if pm2 describe terp >/dev/null 2>&1; then
  pm2 reload terp --update-env
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

pm2 list

log "✓ Déploiement terminé."
log "  Logs : pm2 logs terp"
log "  Status : pm2 monit"
