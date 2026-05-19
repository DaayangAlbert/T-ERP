# Déploiement T-ERP en production — VPS OVH

**Cible** : VPS OVH Ubuntu 22.04/24.04, domaine `terpgroup.com`
**Stack runtime** : Node 20 LTS · PostgreSQL 16 · Nginx · PM2 · Let's Encrypt

> ⚠️ **Sécurité préalable** : si tu as déjà reçu le mot de passe ubuntu par
> email/chat, change-le **immédiatement** au premier login :
>
> ```
> ssh ubuntu@51.91.126.95
> passwd
> ```

---

## Vue d'ensemble

```
Internet ──▶ Nginx (443) ──▶ PM2 → Next.js standalone (3000) ──▶ Postgres 16 local
            │
            └─ Certbot Let's Encrypt (renouvellement auto)
```

- **Une seule machine** au démarrage : app + DB + Nginx + Postgres sur le même VPS. Suffisant pour ~50 tenants / 5000 users.
- **Backup quotidien** local + (option) remote OVH Object Storage.
- **Sortie** : `terpgroup.com`, `www.terpgroup.com`, `*.terpgroup.com` (sous-domaines tenant).

---

## Étape 1 — Sécuriser le VPS (15 min)

```bash
ssh ubuntu@51.91.126.95
```

### 1.1 Changer le mot de passe
```bash
passwd
```

### 1.2 Générer une paire de clés SSH **depuis ton poste local** (pas le VPS)
```bash
# sur ta machine Windows (PowerShell) ou Mac/Linux
ssh-keygen -t ed25519 -C "albert@terpgroup.com" -f ~/.ssh/terp_ovh
ssh-copy-id -i ~/.ssh/terp_ovh.pub ubuntu@51.91.126.95
# ou manuellement :
#   cat ~/.ssh/terp_ovh.pub
#   puis sur le VPS : nano ~/.ssh/authorized_keys et coller
```

### 1.3 Désactiver l'auth par mot de passe (sur le VPS)
```bash
sudo nano /etc/ssh/sshd_config
# Mettre :
#   PasswordAuthentication no
#   PermitRootLogin no
#   PubkeyAuthentication yes
sudo systemctl reload sshd
```

**Test depuis ton poste** dans un nouveau terminal (sans fermer l'actuel) :
```bash
ssh -i ~/.ssh/terp_ovh ubuntu@51.91.126.95
```
✅ Si ça marche, ferme l'ancien terminal. ❌ Si ça échoue, ne touche à rien et reconfigure.

### 1.4 (optionnel) Ajouter une entrée `~/.ssh/config` côté poste local
```
Host terp-ovh
  HostName 51.91.126.95
  User ubuntu
  IdentityFile ~/.ssh/terp_ovh
```
Désormais : `ssh terp-ovh`.

---

## Étape 2 — Provisioning automatique (10 min)

Sur le VPS :

```bash
# Générer un mot de passe DB fort (à conserver !)
export TERP_DB_PWD=$(openssl rand -base64 32 | tr -d '=+/')
echo "DB PASSWORD: $TERP_DB_PWD"   # ⬅ copie-le quelque part de sûr

# Cloner le repo (depuis GitHub privé : prévoir un deploy key)
sudo mkdir -p /var/www && sudo chown -R ubuntu:ubuntu /var/www
git clone https://github.com/<votre-org>/T-ERP.git /var/www/terp
cd /var/www/terp

# Provisionnement (Node 20 + Postgres + Nginx + Certbot + UFW + Fail2ban)
chmod +x deploy/server-setup.sh
./deploy/server-setup.sh
```

Le script installe tout, crée la DB `terp_prod` + user `terp_app`, et bloque toutes les entrées sauf SSH/HTTP/HTTPS.

---

## Étape 3 — Configurer l'environnement

```bash
cd /var/www/terp
cp .env.production.example .env.production
nano .env.production
```

À remplir :
- `DATABASE_URL` : remplace `CHANGE_ME_STRONG_DB_PWD` par la valeur de `$TERP_DB_PWD` (étape 2)
- `JWT_SECRET` : `openssl rand -base64 48` → coller
- `RESEND_API_KEY` : inscription gratuite https://resend.com (3000 emails/mois)

Protéger le fichier :
```bash
chmod 600 .env.production
```

---

## Étape 4 — DNS chez OVH

Va dans le manager OVH → Domaines → `terpgroup.com` → Zone DNS et ajoute :

| Type | Sous-domaine | Cible |
|---|---|---|
| **A** | `@` (terpgroup.com) | `51.91.126.95` |
| **AAAA** | `@` | `2001:41d0:404:200::7d78` |
| **A** | `www` | `51.91.126.95` |
| **A** | `*` (wildcard sous-domaines tenant) | `51.91.126.95` |
| **AAAA** | `*` | `2001:41d0:404:200::7d78` |

Propagation : 5 min à 4h. Vérifie avec :
```bash
dig terpgroup.com +short
dig batimcam.terpgroup.com +short   # doit aussi renvoyer 51.91.126.95
```

---

## Étape 5 — Première installation de l'app

```bash
cd /var/www/terp
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma db push --skip-generate

# Seed initial — les 3 commandes peuvent prendre 2-3 min
pnpm db:seed          # tenant BatimCAM + filiales + users de base
pnpm db:seed-emp      # employés détaillés
pnpm db:seed-it       # IT_ADMIN avec pouvoirs spéciaux
pnpm db:seed-cand     # candidat Jean NGONGO + 12 offres
pnpm db:seed-admin    # super-admin Anthropic + plans + factures démo

# Build Next.js standalone
NODE_ENV=production pnpm build

# Copier les assets manquants dans le bundle standalone
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
```

Vérif : `curl http://127.0.0.1:3000` doit renvoyer le HTML de la landing.

---

## Étape 6 — Nginx + SSL Let's Encrypt

```bash
# Copier la conf
sudo cp /var/www/terp/deploy/nginx/terpgroup.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/terpgroup.com.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 6.1 SSL simple (apex + www, sans wildcard)
```bash
sudo certbot --nginx -d terpgroup.com -d www.terpgroup.com \
  --agree-tos --redirect --email albert@terpgroup.com --no-eff-email
```

### 6.2 SSL wildcard `*.terpgroup.com` (pour les sous-domaines tenant)
Nécessite le challenge **DNS-01** car HTTP-01 ne supporte pas le wildcard.

```bash
sudo certbot certonly --manual --preferred-challenges=dns \
  -d terpgroup.com -d www.terpgroup.com -d "*.terpgroup.com" \
  --agree-tos --email albert@terpgroup.com --no-eff-email
```

Certbot affichera un enregistrement TXT à ajouter dans la zone DNS OVH :
- **Type** : TXT
- **Nom** : `_acme-challenge.terpgroup.com`
- **Valeur** : (la chaîne donnée par certbot)

Attendre 2-3 min, puis valider dans certbot. Recharger Nginx :
```bash
sudo systemctl reload nginx
```

### 6.3 Renouvellement auto
Certbot installe son propre cron / systemd timer. Vérification :
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Étape 7 — Backup quotidien

```bash
chmod +x /var/www/terp/deploy/backup.sh
# Test manuel
/var/www/terp/deploy/backup.sh

# Cron quotidien 03h00
crontab -e
# Ajouter :
0 3 * * * /var/www/terp/deploy/backup.sh >> /var/log/terp/backup.log 2>&1
```

Les backups vont dans `/var/backups/terp/daily/` (rotation 7j) + `weekly/` (rotation 4 semaines).

---

## Étape 8 — Comptes de démo à supprimer/changer en prod

⚠️ **Avant d'ouvrir au public**, change ces 3 mots de passe créés par les seeds :

```sql
-- Se connecter à la DB
psql -h 127.0.0.1 -U terp_app -d terp_prod

-- Lister les comptes ACTIVE
SELECT email, role, status FROM users WHERE status='ACTIVE' ORDER BY role;
```

À traiter :
1. **Albert DG** (`albert@batimcam.cm`) — vrai utilisateur, lui faire changer son mdp à la 1ère connexion
2. **Super-admin** (`superadmin@terp.cm`) — soit le supprimer, soit lui assigner ton vrai email + activer MFA hardware
3. **Tous les autres** (`*.batimcam.cm`) — démo, à conserver ou supprimer selon ta stratégie

Helper pour changer un mot de passe en CLI :
```bash
cd /var/www/terp
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
(async () => {
  const p = new PrismaClient();
  const hash = await bcrypt.hash('NouveauMdpFort2026!', 12);
  await p.user.update({ where: { email: 'albert@batimcam.cm' }, data: { passwordHash: hash } });
  console.log('OK');
  await p.\$disconnect();
})();"
```

---

## Étape 9 — Vérifications finales

| Test | Commande / URL |
|---|---|
| Frontend public | https://terpgroup.com |
| Tenant BatimCAM | https://batimcam.terpgroup.com |
| Login candidat | https://terpgroup.com/cand/login |
| Console super-admin | https://terpgroup.com/admin/login |
| Headers sécurité | `curl -I https://terpgroup.com` (doit contenir HSTS, X-Frame, etc.) |
| Score SSL | https://www.ssllabs.com/ssltest/analyze.html?d=terpgroup.com (cible A+) |
| Performance | https://pagespeed.web.dev/?url=https://terpgroup.com |

---

## Mise à jour ultérieure

À chaque release :

```bash
ssh terp-ovh
cd /var/www/terp
./deploy/deploy.sh
```

Le script fait `git pull` + `pnpm install` + `prisma db push` + `next build` + `pm2 reload`. Zero-downtime grâce au `reload` PM2.

---

## Monitoring & logs

| Source | Commande |
|---|---|
| Logs app (live) | `pm2 logs terp` |
| Logs app (file) | `tail -f /var/log/terp/*.log` |
| Logs Nginx | `sudo tail -f /var/log/nginx/{access,error}.log` |
| Logs Postgres | `sudo tail -f /var/log/postgresql/postgresql-16-main.log` |
| Logs fail2ban | `sudo journalctl -u fail2ban -f` |
| Status système | `pm2 monit` (CPU/RAM par process) · `htop` (global) |
| Espace disque | `ncdu /var` |

---

## Troubleshooting fréquent

### 502 Bad Gateway après deploy
```bash
pm2 list                 # terp doit être "online"
pm2 logs terp --lines 50 # voir l'erreur
```
Si PM2 a planté : `pm2 restart terp --update-env`. Si erreur Prisma : `pnpm exec prisma generate && pm2 restart terp`.

### Certificat SSL expiré
```bash
sudo certbot renew --force-renewal -d terpgroup.com
sudo systemctl reload nginx
```

### DB connection refused
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\du"   # vérifier user terp_app
# Mot de passe oublié : reset via
sudo -u postgres psql -c "ALTER USER terp_app WITH PASSWORD 'nouveau-mdp';"
# Puis mettre à jour .env.production et pm2 restart terp
```

### Plus d'espace disque
```bash
df -h
# nettoyer les vieux logs PM2 :
pm2 flush
# nettoyer les vieux backups :
find /var/backups/terp -name "*.gz" -mtime +30 -delete
```

---

## Roadmap "scale up" quand on dépassera ce VPS

| Étape | Quand |
|---|---|
| Migrer Postgres → instance dédiée (Neon, OVH Managed) | > 100 tenants ou > 10 Go DB |
| Ajouter CDN devant Nginx (Cloudflare, Bunny) | trafic public > 100 K req/jour |
| Multi-instances Next.js (cluster PM2) + Redis sessions | > 1000 users connectés simultanés |
| Storage R2/S3 pour uploads | > 50 Go documents |
| Monitoring Sentry/Datadog | dès le premier client payant |
