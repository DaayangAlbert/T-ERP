# CHEF CHANTIER · DÉVELOPPEMENT — Bloc 0 (Préambule + PWA offline-first)

**Profil cible :** Chef de Chantier (Jean KAMGA · Pont Mfoundi · BatimCAM SA)

**Spécificité majeure :** profil **mobile-first absolu** + **PWA avec mode hors-ligne**
(Option B : consultation + saisie offline avec sync auto au retour réseau).

Jean KAMGA est sur le chantier 100% du temps, gère 74 personnes, fait le pointage
matinal à 7h dans une zone parfois sans 4G. T-ERP doit fonctionner même hors-ligne.

**Architecture RBAC** : utilise `User.assignedSiteIds[]`. Pour Jean KAMGA :
`assignedSiteIds = ["pont-mfoundi-id"]`. Il ne voit que SON chantier.

---

## ⚠️ PROTOCOLE RESPONSIVE + PWA OBLIGATOIRE

Standard responsive (7 tailles) + **règles spécifiques CC plus strictes que DTrav** :

1. **Tap targets ≥ 48px** sur tous les boutons mobile (norme accessibilité)
2. **Sidebar items ≥ 48px**
3. **Items cliquables (ouvriers, livraisons, incidents) ≥ 68px**
4. **Inputs : 48px minimum + font-size 16px** (évite zoom auto iOS au focus)
5. **CTAs sticky bottom : 56px** (validation pointage, soumission rapport)
6. **Avatars dans listes : 44px minimum**

Avant chaque commit :
```bash
pnpm exec tsx scripts/audit-responsive.ts /cc/<route>
pnpm exec tsx scripts/audit-tap-targets.ts /cc/<route> --min=48
pnpm exec tsx scripts/audit-pwa.ts /cc/<route>  # nouveau, vérif service worker
```

Format commit obligatoire : "✅ Audit : 7/7 responsive + 48px tap + PWA offline OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE CC + PWA OFFLINE-FIRST

```
Phase de développement du profil Chef de Chantier (Jean KAMGA).

CONTEXTE
========
- Le RBAC double rôle est déjà en place via User.assignedSiteIds[]
- Le prototype HTML contient 6 écrans Espace CC :
  screen-cc-dashboard, screen-cc-pointage, screen-cc-production,
  screen-cc-livraisons, screen-cc-hse, screen-cc-equipes
- Tous ont les attributs data-rh-screen + data-cc-screen qui activent les règles
  CSS mobile-first absolu (tap targets 48px, inputs 48px font 16px, items 68px)
- Jean KAMGA est assigné à 1 chantier : Pont Mfoundi
- Il rapporte à Paul ETOUNDI (DTrav)
- Il supervise 74 personnes (68 ouvriers BatimCAM + 6 sous-traitants STI Étanchéité)

CONVENTIONS
============
- Écrans prototype : id="screen-cc-<fonction>"
- Pages Next.js : src/app/(app)/cc/<fonction>/page.tsx
- Composants : src/components/cc/<NomFonction>.tsx
- API routes : src/app/api/cc/<fonction>/route.ts
- Hooks : src/hooks/useCc<Fonction>.ts
- Toutes les pages CC ont les attributs data-rh-screen ET data-cc-screen

ARCHITECTURE PWA OFFLINE-FIRST (CRITIQUE)
==========================================

1. SERVICE WORKER
   Créer public/sw.js avec stratégies différenciées :
   - Cache-first pour les assets statiques (CSS, JS, images, fonts)
   - Network-first pour les API GET (avec fallback cache si offline)
   - Background Sync pour les API POST/PATCH (queue locale + retry)

   Utiliser Workbox 7 pour simplifier :
     pnpm add -D workbox-webpack-plugin

   Stratégies à implémenter :
   - workbox.precaching pour shell de l'app
   - workbox.routing.registerRoute avec NetworkFirst pour /api/cc/sites
   - workbox.backgroundSync pour POST /api/cc/attendance,
     /api/cc/production-entries, /api/cc/deliveries/receive,
     /api/cc/incidents

2. MANIFEST.JSON
   Créer public/manifest.json :
   {
     "name": "T-ERP Chef Chantier",
     "short_name": "T-ERP CC",
     "start_url": "/cc",
     "display": "standalone",
     "background_color": "#2A1B3D",
     "theme_color": "#A855F7",
     "orientation": "portrait",
     "icons": [
       { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }

3. INDEXEDDB POUR LE STOCKAGE OFFLINE
   Utiliser idb (wrapper léger) :
     pnpm add idb

   Créer src/lib/offline/db.ts avec stores :
   - attendance-queue : pointages en attente de sync
   - production-queue : entrées production en attente
   - delivery-queue : réceptions livraisons en attente
   - incident-queue : déclarations incidents en attente
   - photo-queue : photos compressées en attente d'upload
   - sites-cache : copie des chantiers du jour
   - workforce-cache : copie de l'équipe du jour (74 personnes)

4. HOOK useOfflineSync
   Créer src/hooks/useOfflineSync.ts :
   - Détecte le statut online/offline (navigator.onLine + events)
   - Compte les éléments dans la queue
   - Déclenche la sync automatique au retour réseau
   - Expose : { isOnline, queueSize, isSyncing, lastSyncAt, forceSyncNow }

5. INDICATEUR VISUEL DE STATUT
   Le bandeau sticky violet en haut de chaque écran affiche un badge dynamique :
   - "● En ligne" (vert) si online et queue vide
   - "⏳ Synchro queue : N" (orange) si online et sync en cours
   - "📴 Mode hors-ligne · N en attente" (rouge) si offline avec queue non vide
   - "📴 Mode hors-ligne" (rouge) si offline sans queue

   Composant src/components/cc/SyncStatusBadge.tsx

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     FOREMAN  // Chef de Chantier
   }

2. Créer le layout dédié src/app/(app)/cc/layout.tsx :
   - Vérifie Role.FOREMAN (sinon redirect /dashboard)
   - Vérifie que l'utilisateur a 1 chantier assigné minimum
   - Charge le contexte SiteContext (un seul chantier pour CC, pas de switcher)
   - Enregistre le service worker au mount
   - Wrap children dans <div data-cc-screen data-rh-screen className="rh-page">

3. Créer la page d'installation PWA src/app/(app)/cc/install/page.tsx :
   - Affichage uniquement si standalone === false
   - Instructions visuelles "Ajouter à l'écran d'accueil" (iOS / Android)
   - Bouton "Installer maintenant" avec beforeinstallprompt event

4. Adapter le script audit-tap-targets.ts pour le profil CC :
   - Paramètre --min=48 (vs 40 pour DTrav)
   - Vérification spécifique : inputs ≥ 48px ET font-size ≥ 16px (anti-zoom iOS)

5. Créer scripts/audit-pwa.ts :
   - Vérifie que /sw.js est servi correctement
   - Vérifie que manifest.json est valide
   - Vérifie que les routes API critiques sont enregistrées en BackgroundSync
   - Vérifie que les icônes existent

LIVRABLES BLOC 0
=================
- Service Worker fonctionnel avec Workbox
- Manifest.json + icônes 192/512
- IndexedDB initialisé avec les 7 stores
- Hook useOfflineSync opérationnel
- Badge sync status affiché sur tous les écrans CC
- Layout CC protégé par rôle FOREMAN
- Page d'installation PWA
- Test critique : couper le réseau dans DevTools → recharger /cc → l'app
  fonctionne et affiche "📴 Mode hors-ligne"
- Test : pointer 5 ouvriers offline → queue grossit → rebrancher → sync auto
- Audit responsive 7/7 OK + tap targets 48px+ OK + PWA OK
- Commit "chore(cc): bootstrap PWA offline-first + service worker + IndexedDB"

Une fois validé, attends le prompt 1.1.
```

---

## ✅ FIN BLOC 0

Bloc suivant : **Bloc 1 — Espace Chef Chantier (6 fonctions)**

Quand le bloc 0 est validé, demande :
"Bloc 0 CC terminé. Tu peux me livrer le Bloc 1."
