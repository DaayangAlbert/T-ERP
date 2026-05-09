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
4. À la fin : `pnpm dev` doit afficher la page d'accueil sur localhost:3000

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

Puis accéder via `http://batimcam.terp.local:3000` au lieu de localhost.

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
