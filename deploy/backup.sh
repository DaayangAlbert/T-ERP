#!/usr/bin/env bash
# =============================================================================
#  T-ERP — Backup quotidien PostgreSQL + uploads
# =============================================================================
#
#  À installer via cron (en user ubuntu) :
#
#    crontab -e
#    0 3 * * * /var/www/terp/deploy/backup.sh >> /var/log/terp/backup.log 2>&1
#
#  Conserve 7 backups quotidiens + 4 hebdo en local. Optionnellement
#  upload vers OVH Object Storage / Cloudflare R2 via rclone.
# =============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/terp"
DATE="$(date +%Y%m%d_%H%M%S)"
DAY_OF_WEEK="$(date +%u)" # 1=lundi … 7=dimanche
DB_NAME="terp_prod"
DB_USER="terp_app"
DB_HOST="127.0.0.1"
RETENTION_DAILY=7
RETENTION_WEEKLY=4

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# Source PGPASSWORD depuis .env.production
if [[ -f /var/www/terp/.env.production ]]; then
  # shellcheck disable=SC1091
  export PGPASSWORD="$(grep '^DATABASE_URL=' /var/www/terp/.env.production | sed -E 's/.*:([^:@]+)@.*/\1/' | tr -d '"')"
fi

OUT="$BACKUP_DIR/daily/terp_${DATE}.sql.gz"
echo "[$(date)] Dump $DB_NAME → $OUT"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$OUT"

# Uploads (CV, photos avatar, etc.)
if [[ -d /var/www/terp/public/uploads ]]; then
  tar -czf "$BACKUP_DIR/daily/uploads_${DATE}.tar.gz" -C /var/www/terp/public uploads
fi

# Rotation : garde les 7 derniers daily
find "$BACKUP_DIR/daily" -name "terp_*.sql.gz" -mtime +${RETENTION_DAILY} -delete
find "$BACKUP_DIR/daily" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAILY} -delete

# Copie hebdo (le lundi)
if [[ "$DAY_OF_WEEK" == "1" ]]; then
  cp "$OUT" "$BACKUP_DIR/weekly/"
  [[ -f "$BACKUP_DIR/daily/uploads_${DATE}.tar.gz" ]] && cp "$BACKUP_DIR/daily/uploads_${DATE}.tar.gz" "$BACKUP_DIR/weekly/"
  find "$BACKUP_DIR/weekly" -name "*.gz" -mtime +$((RETENTION_WEEKLY * 7)) -delete
fi

# (Optionnel) upload vers OVH Object Storage si rclone configuré
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "ovh:"; then
  echo "[$(date)] Upload remote ovh:terp-backups/"
  rclone copy "$OUT" "ovh:terp-backups/daily/" --quiet
fi

echo "[$(date)] Backup OK · $(du -sh "$OUT" | cut -f1)"
