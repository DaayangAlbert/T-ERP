# GUIDE OPÉRATIONNEL — Lancement du développement T-ERP

Comment utiliser concrètement les prompts pour développer T-ERP en 7 jours avec un agent IA.

---

## 1. CHOIX DE L'OUTIL

Trois options, par ordre de préférence pour ce projet :

### Option A — **Claude Code** (recommandé)

Le terminal officiel d'Anthropic, accès complet au système de fichiers, exécution de commandes.

```bash
# Installation
npm install -g @anthropic-ai/claude-code

# Démarrage dans le dossier du projet
mkdir t-erp && cd t-erp
claude
```

**Avantage :** l'agent peut créer des fichiers, lancer pnpm install, exécuter prisma migrate, lancer le serveur dev — tout sans intervention manuelle.

### Option B — **Cursor**

IDE basé sur VS Code avec chat IA intégré.

1. Télécharger Cursor (cursor.sh)
2. Créer un dossier `t-erp/`
3. `Cmd+L` pour ouvrir le chat
4. Coller le prompt initial

**Avantage :** confort visuel d'un IDE, mais l'agent demande plus souvent confirmation.

### Option C — **Claude.ai avec code execution**

L'interface web avec création de fichiers activée.

**Limite :** pas d'environnement Node.js réel — utile pour générer le code mais pas pour exécuter `pnpm dev`. À utiliser pour du conseil ponctuel pendant le développement.

---

## 2. PRÉPARATION DU DOSSIER DE TRAVAIL

Avant le premier prompt, place dans le dossier `t-erp/` :

```
t-erp/
├── terp_prototype.html              ← LA RÉFÉRENCE VISUELLE
├── CAHIER_DES_CHARGES_DEV.md
├── STRUCTURE_PROJET.md
├── README.md
├── PROMPTS_DEVELOPPEMENT.md         ← Tes prompts J0-J7
├── package.json
├── .env.example
├── schema.prisma
├── seed.ts
├── tailwind.config.ts
├── next.config.js
├── middleware.ts
├── Sidebar.tsx
├── Header.tsx
└── Button.tsx
```

L'agent IA pourra lire ces fichiers comme contexte.

---

## 3. SÉQUENCE D'EXÉCUTION

### J0 (durée : 1-2h) — Bootstrap

1. Ouvre Claude Code dans le dossier `t-erp/`
2. Copie-colle le **prompt initial J0** depuis `PROMPTS_DEVELOPPEMENT.md`
3. L'agent va :
   - Lire les fichiers fournis
   - Initialiser Next.js
   - Créer la structure de dossiers
   - Installer les dépendances
   - Te demander confirmation à chaque étape clé
4. À la fin : `pnpm dev` doit afficher la page d'accueil sur localhost:5000

**Si ça bloque :** demande à l'agent un état des lieux. "Donne-moi un résumé de ce qui est fait et ce qui ne marche pas."

### J1 → J7 (durée moyenne : 6-10h par jour)

Pour chaque jour :
1. Ouvre une **nouvelle conversation** Claude Code (l'historique sature vite)
2. Demande à l'agent de relire le contexte : `"Lis CAHIER_DES_CHARGES_DEV.md, le terp_prototype.html, et regarde la structure du projet src/"`
3. Colle le prompt du jour correspondant
4. Travaille avec l'agent par allers-retours

À la fin de chaque jour, fais un commit :
```bash
git add .
git commit -m "feat: J<n> — <ce que tu as livré>"
git push
```

---

## 4. RÈGLES D'OR PENDANT LE DÉVELOPPEMENT

### Garde le prototype ouvert en permanence

Un onglet du navigateur sur `terp_prototype.html`. À chaque écran codé, tu compares côte à côte : prototype d'un côté, ton app React de l'autre. **Si ça diffère, le prototype gagne.**

### Test après chaque tâche, pas en bloc

Ne laisse pas l'agent enchaîner 5 tâches sans tester. Demande-lui : "Teste cette API maintenant avant de passer à la suivante." Plus tu valides souvent, moins tu auras de bugs cumulés.

### Ne refonds pas, refait

Si une partie du code est mal faite, **demande à l'agent de la réécrire**, ne corrige pas toi-même les détails. Il sera plus rapide et plus cohérent.

### Coupe le scope avant de couper la qualité

Si tu prends du retard à J3 ou J4, **reporte des fonctionnalités en phase 2** plutôt que livrer du bâclé. Mieux vaut 6 modules nickel que 8 bricolés.

Exemples de coupes acceptables :
- Reporter le bulletin PDF → afficher le bulletin HTML imprimable seulement (Ctrl+P)
- Reporter la modale de switch profil → utiliser un dropdown simple
- Reporter Sentry → live sans monitoring les premiers jours
- Reporter le 2e tenant → démontrer le multi-tenant juste avec batimcam

### Commits fréquents et messages clairs

Format conventionnel :
- `feat: ajoute API auth login`
- `fix: corrige hydration error sur dashboard DG`
- `style: aligne sidebar avec prototype`
- `refactor: extrait useDashboardDg en hook`

Tu pourras revenir en arrière si l'agent casse quelque chose.

### Branche `main` toujours déployable

À partir de J1, déploie sur Railway. Chaque push main re-déploie. Si la prod est cassée, tu sais immédiatement.

---

## 5. EN CAS DE PROBLÈME

### L'agent fait n'importe quoi

Coupe et redémarre une nouvelle conversation. Recharge le contexte avec :
```
Lis CAHIER_DES_CHARGES_DEV.md, terp_prototype.html, et fais-moi un résumé de
l'état actuel du projet en lisant src/.
Ensuite, on reprend à <étape>.
```

### Une dépendance ne s'installe pas

Vérifie ta version Node : `node -v` → doit être >= 20. Si problème npm/pnpm spécifique au Cameroun (proxy, registry), force le registry par défaut :
```bash
pnpm config set registry https://registry.npmjs.org/
```

### Prisma ne se connecte pas à Neon

Le `DATABASE_URL` Neon doit avoir `?sslmode=require`. Exemple :
```
postgresql://user:pass@ep-xxx.neon.tech/terp?sslmode=require
```

### Le multi-tenant ne fonctionne pas en local

`/etc/hosts` (Linux/Mac) ou `C:\Windows\System32\drivers\etc\hosts` (Windows) :
```
127.0.0.1  app.terp.local
127.0.0.1  batimcam.terp.local
127.0.0.1  njoya.terp.local
127.0.0.1  admin.terp.local
```

Puis accéder via `http://batimcam.terp.local:5000` au lieu de localhost.

### Railway dépasse le free tier

500h CPU/mois en gratuit suffisent pour 1-2 utilisateurs réguliers. Si tu fais des démos intensives :
- Mets en pause le service quand tu ne l'utilises pas
- OU passe au plan Hobby ($5/mois) qui débloque les limites

---

## 6. JALONS DE VALIDATION

Coche chaque jour :

**J0 ✓** — `pnpm dev` lance l'app, page d'accueil avec bouton violet visible
**J1 ✓** — Login fonctionnel + portail public affiche 6 offres
**J2 ✓** — Layout authentifié + sidebar responsive + switch profil
**J3 ✓** — Dashboard DG complet, charge en < 2s, conforme prototype
**J4 ✓** — Chantiers + Profil + Paie en lecture
**J5 ✓** — Bulletin PDF + Messagerie 2 sessions
**J6 ✓** — 2 tenants isolés + responsive 7 tailles
**J7 ✓** — Déployé sur app.terp.cm + démo de 10 minutes prête

Si tu valides les 8 jalons, **tu as un MVP démontrable que tu peux présenter à des prospects dès le lundi suivant**.

---

## 7. APRÈS LE MVP

Trois priorités la semaine 2 :

1. **Présentation à 3 prospects BTP camerounais** (utilise ton réseau)
2. **Validation expert-comptable agréé** sur le module paie/comptabilité avant phase 2
3. **Premier client pilote signé** avec engagement à co-construire les modules manquants

Bonne chance Albert. Tu as le matériel, l'organisation, et la méthode.
Le seul ingrédient manquant maintenant, c'est l'exécution. 🚀

---

## ANNEXE A — PIPELINE DE RAPPORTS TECHNIQUES

T-ERP intègre cinq rapports métier qui remontent l'information du terrain jusqu'au COMEX. Chaque rapport suit le même cycle de vie : `DRAFT → SUBMITTED → VALIDATED` (ou `REJECTED` avec motif). Toutes les transitions notifient les destinataires via la cloche de notifications.

### Vue d'ensemble

| Rapport | Périodicité | Auteur | Validateur | Page auteur | Page validateur |
|---|---|---|---|---|---|
| **Avancement chantier** | Mensuel (ou ad hoc) | Chef de Chantier | Directeur de Travaux | `/chef-chantier/rapports` | `/directeur-travaux/validations` |
| **Hebdomadaire CDT** | Hebdomadaire | Conducteur de Travaux | Directeur de Travaux | `/conducteur-travaux/rapports` | `/directeur-travaux/rapports-cdt` |
| **Mensuel technique DT** | Mensuel | Directeur Technique | Directeur Général | `/direction-technique/rapports-mensuels` | `/direction-generale/rapports-dt` |
| **Mensuel synthétique DTrav** | Mensuel | Directeur de Travaux | Directeur Général | `/directeur-travaux/rapports-mensuels` | `/direction-generale/rapports-dtrav` |
| **Sinistralité QHSE** | Mensuel | Responsable QHSE (TECH_DIRECTOR) | Directeur Général | `/direction-technique/rapports-qhse` | `/direction-generale/rapports-qhse` |

### Mécanique commune

- **Brouillon (`DRAFT`)** — l'auteur saisit librement, peut sauvegarder à tout moment, peut supprimer.
- **Soumis (`SUBMITTED`)** — verrouillé pour l'auteur, l'édition est désactivée. Une notification est envoyée à tous les destinataires du tenant ayant le rôle de validation.
- **Validé (`VALIDATED`)** — le rapport est figé, le visa du validateur (nom + date) est imprimé sur le PDF dans le cadre de signatures, l'auteur reçoit une notification.
- **Refusé (`REJECTED`)** — le rapport repasse en brouillon éditable. Le motif du refus est affiché en bandeau rouge dans l'éditeur et imprimé sur le PDF. L'auteur reçoit une notification avec le motif.

### Export PDF

Chaque rapport dispose d'un export PDF dès qu'il est soumis (statut `SUBMITTED` ou `VALIDATED`). Le PDF est constitué :
- d'une **page de garde** avec le logo du tenant, le titre, la période, les KPI clés et le bloc émetteur/date d'émission ;
- d'un **corps** avec sections numérotées (tableaux KPIs + narratives + recommandations) et en-tête/pied de page fixes (`Page X / Y`) ;
- d'un **cadre de validation** en bas avec les zones de signature dématérialisées (signature CDT ou auteur + visa validateur).

Endpoints PDF : `/api/{role}/.../[id]/pdf` (voir le détail dans le code).

### Pré-remplissage des chantiers

Pour les rapports CDT et DT qui couvrent plusieurs chantiers, deux routes helper alimentent le formulaire :
- `/api/cdt/available-sites` → chantiers actifs du portefeuille du CDT, avec effectif moyen et incidents HSE des 7 derniers jours pré-calculés ;
- `/api/dt/portfolio-sites` → tous les chantiers du tenant (et filiales) avec marge, avancement physique/financier, NC ouvertes, suggestions d'incidents HSE des 30 derniers jours.

Dans l'éditeur DT, un bouton **« ⟲ Recalculer agrégats »** recalcule automatiquement les KPI portefeuille à partir des snapshots de chantiers saisis.

### Auto-calcul TF1/TG (QHSE)

Le rapport QHSE inclut un bouton **« ⟲ Recalcul TF1/TG »** qui calcule :
- `TF1 = (LTI × 1 000 000) / heures travaillées` (taux de fréquence)
- `TG = (jours perdus × 1 000) / heures travaillées` (taux de gravité)

Le responsable peut ensuite ajuster manuellement si nécessaire.

### Badges dynamiques de la sidebar

L'entrée de chaque page validateur affiche un compteur badge des rapports en attente, alimenté en temps réel (refresh 60 s) par `/api/reports/sidebar-badges`. Exemples :
- DTrav : « Validations N1 [3] » et « Rapports CDT à valider [1] »
- DG : « Rapports DT à valider [1] », « Rapports DTrav à valider [1] », « Rapports QHSE à valider [1] »
- Auteurs : badge rouge alert si un de leurs rapports a été refusé et attend correction.

### Données de démonstration

Trois scripts seeds idempotents alimentent la base avec des données réalistes :
1. `node scripts/seed-progress-reports.mjs` — 3 rapports CC (Janvier validé, Février soumis, Mars brouillon) + 2 historiques (Nov/Déc 2025) pour Jean-Marie BIWOLE sur CHT-2026-031.
2. `node scripts/seed-cdt-weekly-report.mjs` + `seed-dt-monthly-report.mjs` + `seed-dtrav-monthly-report.mjs` + `seed-qhse-monthly-report.mjs` — 1 rapport courant `SUBMITTED` pour chaque module sur Avril 2026.
3. `node scripts/seed-historical-reports.mjs` — 3 mois historiques `VALIDATED` (Janvier, Février, Mars 2026) pour DT/DTrav/QHSE et 3 semaines historiques pour CDT.

Au total après seeds : ~17 rapports répartis entre les 5 modules, couvrant tous les statuts (DRAFT/SUBMITTED/VALIDATED) et permettant de tester le pipeline complet.

