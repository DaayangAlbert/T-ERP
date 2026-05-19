#!/usr/bin/env bash
# =============================================================================
#  T-ERP — Provisioning d'un VPS Ubuntu 22.04 / 24.04 pour la production
# =============================================================================
#
#  Cible : VPS OVH (vps-a3710b5c.vps.ovh.net) — Ubuntu LTS minimale
#
#  Usage (en tant que user `ubuntu` avec sudo) :
#    chmod +x deploy/server-setup.sh
#    ./deploy/server-setup.sh
#
#  Étapes :
#   1. Hardening de base (firewall ufw, fail2ban, MAJ système)
#   2. Installation Node 20 LTS + pnpm + PM2
#   3. Installation PostgreSQL 16 + création DB/user
#   4. Installation Nginx + Certbot
#   5. Création de /var/www/terp (futur déploiement)
#
#  Le script est idempotent : peut être relancé sans casser.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }

# -----------------------------------------------------------------------------
# 0. Prérequis
# -----------------------------------------------------------------------------
if [[ $EUID -eq 0 ]]; then
  warn "Ne pas exécuter en root direct. Connecte-toi en 'ubuntu' avec sudo."
  exit 1
fi
sudo -v

# -----------------------------------------------------------------------------
# 1. Hardening
# -----------------------------------------------------------------------------
log "Mise à jour système…"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

log "Installation utilitaires de base…"
sudo apt-get install -y -qq \
  curl wget git build-essential \
  ufw fail2ban unattended-upgrades \
  ca-certificates gnupg lsb-release \
  htop ncdu tree jq

log "Firewall UFW…"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
yes | sudo ufw enable
sudo ufw status

log "Fail2ban (anti brute-force SSH)…"
sudo systemctl enable --now fail2ban

log "Mises à jour de sécurité auto…"
sudo dpkg-reconfigure -plow unattended-upgrades

# -----------------------------------------------------------------------------
# 2. Node 20 LTS + pnpm + PM2
# -----------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Installation Node 20 LTS (NodeSource)…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
log "Node $(node -v) · npm $(npm -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  log "Installation pnpm…"
  sudo npm install -g pnpm@9
fi
log "pnpm $(pnpm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installation PM2…"
  sudo npm install -g pm2
  sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
fi
log "pm2 $(pm2 -v)"

# -----------------------------------------------------------------------------
# 3. PostgreSQL 16
# -----------------------------------------------------------------------------
if ! command -v psql >/dev/null 2>&1; then
  log "Installation PostgreSQL 16…"
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-16 postgresql-client-16
fi
sudo systemctl enable --now postgresql
log "Postgres $(psql --version)"

# Création DB + user (idempotent)
DB_NAME="terp_prod"
DB_USER="terp_app"
# Mot de passe DB stocké côté .env.production. À générer aléatoirement :
#   openssl rand -base64 32
# Le user devra remplacer ci-dessous AVANT exécution.
DB_PWD="${TERP_DB_PWD:-CHANGE_ME_OR_EXPORT_TERP_DB_PWD_BEFORE}"

if [[ "$DB_PWD" == "CHANGE_ME_OR_EXPORT_TERP_DB_PWD_BEFORE" ]]; then
  warn "Définis le mot de passe DB avant de lancer ce script :"
  warn "  export TERP_DB_PWD=\$(openssl rand -base64 32 | tr -d '=+/')"
  warn "  ./deploy/server-setup.sh"
  warn "Et conserve ce mdp dans .env.production (DATABASE_URL)."
  exit 1
fi

log "Création DB $DB_NAME + user $DB_USER…"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PWD';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >/dev/null

log "DB prête : postgresql://$DB_USER:***@127.0.0.1:5432/$DB_NAME"

# -----------------------------------------------------------------------------
# 4. Nginx + Certbot
# -----------------------------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  log "Installation Nginx…"
  sudo apt-get install -y -qq nginx
fi
sudo systemctl enable --now nginx

if ! command -v certbot >/dev/null 2>&1; then
  log "Installation Certbot (Let's Encrypt)…"
  sudo apt-get install -y -qq certbot python3-certbot-nginx
fi
log "Nginx $(nginx -v 2>&1 | cut -d/ -f2) · certbot $(certbot --version | cut -d' ' -f2)"

# -----------------------------------------------------------------------------
# 5. Arborescence app
# -----------------------------------------------------------------------------
log "Création /var/www/terp + /var/log/terp…"
sudo mkdir -p /var/www/terp /var/log/terp /var/www/certbot
sudo chown -R ubuntu:ubuntu /var/www/terp /var/log/terp

# -----------------------------------------------------------------------------
# 6. Fin
# -----------------------------------------------------------------------------
echo ""
log "============================================================"
log "  Provisioning terminé !"
log "============================================================"
echo ""
echo "  Prochaines étapes (cf docs/DEPLOYMENT.md) :"
echo "    1. Pointer le DNS terpgroup.com → 51.91.126.95 (A) + IPv6 (AAAA)"
echo "       + wildcard *.terpgroup.com vers la même IP"
echo "    2. git clone https://github.com/<toi>/T-ERP.git /var/www/terp"
echo "    3. cp .env.production.example /var/www/terp/.env.production"
echo "       et remplir DATABASE_URL avec : $DB_USER / le mdp ci-dessus"
echo "    4. cd /var/www/terp && pnpm install --frozen-lockfile"
echo "    5. pnpm db:push && pnpm db:seed && pnpm db:seed-admin"
echo "    6. pnpm build"
echo "    7. cp -r .next/static .next/standalone/.next/"
echo "       cp -r public .next/standalone/"
echo "    8. pm2 start ecosystem.config.js --env production && pm2 save"
echo "    9. Copier nginx config + obtenir SSL :"
echo "       sudo cp deploy/nginx/terpgroup.com.conf /etc/nginx/sites-available/"
echo "       sudo ln -s /etc/nginx/sites-available/terpgroup.com.conf /etc/nginx/sites-enabled/"
echo "       sudo nginx -t && sudo systemctl reload nginx"
echo "       sudo certbot --nginx -d terpgroup.com -d www.terpgroup.com"
echo "       # Pour le wildcard, voir DEPLOYMENT.md (DNS-01 challenge)"
echo ""
