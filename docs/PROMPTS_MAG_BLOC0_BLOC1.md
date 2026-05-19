# MAGASINIER · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Magasinier de chantier (Lucas TIENTCHEU · Magasin Pont Mfoundi)

**Spécificités :**
- **Mobile-first absolu** (zones de stockage sous-sol / containers sans réseau)
- **PWA offline** réutilisant l'infrastructure du Chef de Chantier
- **Valorisation PMP** (Prix Moyen Pondéré) conforme SYSCOHADA
- **Traçabilité complète** entrées/sorties/inventaires
- **RBAC** via `User.assignedSiteIds[]` (Lucas voit uniquement Magasin Pont Mfoundi)

---

## ⚠️ PROTOCOLE RESPONSIVE + PWA

**Réutilisation infrastructure CC** : le Service Worker, IndexedDB, Background Sync et
hook useOfflineSync ont déjà été développés pour le Chef de Chantier (Bloc 0 CC).
On les étend avec de nouveaux stores et routes.

Tap targets stricts comme CC : 48px boutons, 48px sidebar, 68px items cliquables,
48px inputs + 16px font (anti-zoom iOS), 56px CTAs sticky.

```bash
pnpm exec tsx scripts/audit-responsive.ts /mag/<route>
pnpm exec tsx scripts/audit-tap-targets.ts /mag/<route> --min=48
pnpm exec tsx scripts/audit-pwa.ts /mag/<route>
```

Format commit : "✅ Audit : 7/7 responsive + 48px tap + PWA offline OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE MAGASINIER + EXTENSION PWA

```
Phase de développement du profil Magasinier (Lucas TIENTCHEU).

CONTEXTE
========
- Le profil Chef de Chantier est déjà développé avec PWA offline complète
- L'infrastructure (Service Worker Workbox, IndexedDB, Background Sync, useOfflineSync)
  existe et est opérationnelle
- Le prototype HTML contient 6 écrans Espace MAG :
  screen-mag-dashboard, screen-mag-entrees, screen-mag-sorties,
  screen-mag-catalogue, screen-mag-inventaires, screen-mag-mouvements
- Tous ont les attributs data-rh-screen + data-mag-screen qui activent les règles
  CSS mobile-first absolu identiques au CC
- Lucas TIENTCHEU est assigné à 1 chantier : Pont Mfoundi
- Il rapporte hiérarchiquement à Jean KAMGA (CC) et opérationnellement au DTrav
- Il gère 238 articles en catalogue, 12,4 M FCFA de stock

CONVENTIONS
============
- Écrans prototype : id="screen-mag-<fonction>"
- Pages Next.js : src/app/(app)/mag/<fonction>/page.tsx
- Composants : src/components/mag/<NomFonction>.tsx
- API routes : src/app/api/mag/<fonction>/route.ts
- Hooks : src/hooks/useMag<Fonction>.ts
- Toutes les pages MAG ont les attributs data-rh-screen ET data-mag-screen

EXTENSION DE L'ARCHITECTURE PWA
================================

1. NOUVEAUX STORES INDEXEDDB
   Étendre src/lib/offline/db.ts avec :
   - stock-in-queue : entrées de stock en attente
   - stock-out-queue : sorties de stock en attente
   - inventory-queue : inventaires en cours et finalisations
   - articles-cache : catalogue articles avec stocks courants
   - stock-history-cache : derniers 30 jours de mouvements

2. NOUVELLES ROUTES BACKGROUND SYNC
   Étendre public/sw.js :
   - POST /api/mag/stock-movements/in
   - POST /api/mag/stock-movements/out
   - POST /api/mag/inventories/:id/lines
   - POST /api/mag/inventories/:id/complete

3. EXTENDED useOfflineSync
   Adapter le hook pour gérer les compteurs combinés CC + MAG si un utilisateur
   a les deux rôles (rare mais possible pour démo).

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     WAREHOUSE_KEEPER  // Magasinier
   }

2. Créer le layout dédié src/app/(app)/mag/layout.tsx :
   - Vérifie Role.WAREHOUSE_KEEPER (sinon redirect /dashboard)
   - Vérifie que assignedSiteIds n'est pas vide
   - Charge le contexte WarehouseContext (1 magasin = 1 chantier)
   - Enregistre le Service Worker au mount
   - Wrap children dans <div data-mag-screen data-rh-screen className="rh-page">

3. Étendre le model Prisma :

   model Warehouse {
     id          String   @id @default(cuid())
     tenantId    String
     siteId      String   @unique  // 1 magasin = 1 chantier
     site        Site     @relation(fields: [siteId], references: [id])
     code        String
     name        String
     keeperId    String?  // référence au magasinier User
     keeper      User?    @relation(fields: [keeperId], references: [id])
     stocks      WarehouseStock[]
     movements   StockMovement[]
     inventories Inventory[]
   }

   model Article {
     id            String   @id @default(cuid())
     tenantId      String
     code          String   // "CIM-001", "ACI-012"
     name          String
     category      ArticleCategory
     unit          String   // "sac", "kg", "m³", "L"
     conversionUnit String? // pour stockage logique (kg de ciment alors qu'on stocke en sac)
     defaultSupplierId String?
     active        Boolean  @default(true)
     @@unique([tenantId, code])
   }
   enum ArticleCategory { CEMENT_CONCRETE STEEL_REBAR AGGREGATES FORMWORK FUEL CONSUMABLES TOOLS PPE OTHER }

   model WarehouseStock {
     id            String   @id @default(cuid())
     warehouseId   String
     warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
     articleId     String
     article       Article  @relation(fields: [articleId], references: [id])
     quantity      Float
     pmpUnitPrice  BigInt   // Prix Moyen Pondéré actuel
     totalValue    BigInt   // calculé = quantity × pmpUnitPrice
     minThreshold  Float?   // seuil d'alerte rupture
     lastInAt      DateTime?
     lastOutAt     DateTime?
     updatedAt     DateTime @updatedAt
     @@unique([warehouseId, articleId])
   }

   model StockMovement {
     id            String   @id @default(cuid())
     warehouseId   String
     warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
     articleId     String
     article       Article  @relation(fields: [articleId], references: [id])
     direction     MovementDirection  // IN / OUT / ADJUSTMENT
     quantity      Float
     unitPrice     BigInt   // prix d'achat pour IN, PMP pour OUT
     totalValue    BigInt   // calculé
     reference     String   // BS-2026-0142, BL-2026-0451, INV-...
     reason        MovementReason
     supplierId    String?  // pour IN
     deliveryId    String?  // lien Delivery si IN
     destinationTeamId String?  // équipe demandeuse pour OUT
     destinationUserId String?  // chef d'équipe signataire pour OUT
     signaturePhoto String?  // photo du bon papier signé
     blPhoto       String?   // photo BL pour IN
     notes         String?
     recordedBy    String   // magasinier
     occurredAt    DateTime
     createdAt     DateTime @default(now())
     syncedFromOffline Boolean @default(false)
     clientUuid    String?  // pour offline dedup
   }
   enum MovementDirection { IN OUT ADJUSTMENT_PLUS ADJUSTMENT_MINUS }
   enum MovementReason {
     PURCHASE_DELIVERY    // entrée livraison BC
     RETURN               // retour fournisseur ou retour chantier
     CONSUMPTION_TEAM     // sortie équipe ouvrière
     CONSUMPTION_ENGINE   // sortie carburant engins
     INVENTORY_ADJUSTMENT // régularisation après inventaire
     DAMAGE_LOSS          // casse / perte
     TRANSFER_OUT         // transfert vers autre magasin
     TRANSFER_IN          // transfert depuis autre magasin
   }

   model Inventory {
     id          String   @id @default(cuid())
     warehouseId String
     warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
     type        InventoryType
     scope       String   // "all", "category:CEMENT_CONCRETE", "article:CIM-001"
     plannedDate DateTime
     startedAt   DateTime?
     completedAt DateTime?
     completedBy String?
     lines       InventoryLine[]
     totalGapValue BigInt @default(0)
     status      InventoryStatus
     createdAt   DateTime @default(now())
   }
   enum InventoryType { MONTHLY ROLLING_WEEKLY ROLLING_BIWEEKLY ROLLING_MONTHLY ANNUAL ADHOC }
   enum InventoryStatus { PLANNED IN_PROGRESS PENDING_VALIDATION COMPLETED CANCELLED }

   model InventoryLine {
     id            String   @id @default(cuid())
     inventoryId   String
     inventory     Inventory @relation(fields: [inventoryId], references: [id])
     articleId     String
     article       Article  @relation(fields: [articleId], references: [id])
     theoreticalQty Float
     countedQty    Float
     gap           Float    // calculé
     gapValue      BigInt   // calculé
     justification String?
     countedAt     DateTime?
     countedBy     String?
   }

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec les 5 nouveaux models (Warehouse, Article,
  WarehouseStock, StockMovement, Inventory + InventoryLine)
- Layout MAG protégé par rôle WAREHOUSE_KEEPER
- WarehouseContext (un seul magasin = un seul chantier)
- IndexedDB étendu avec 5 nouveaux stores
- Service Worker étendu avec Background Sync sur 4 nouvelles routes
- Seed : 238 articles SYSCOHADA + 1 magasin Pont Mfoundi + Lucas TIENTCHEU comme keeper
- Test : connexion Lucas → voit son magasin Pont Mfoundi, 238 articles, 12,4 M valorisés
- Test offline : couper réseau, consulter catalogue → s'affiche depuis cache
- Audit responsive 7/7 OK + tap targets 48px OK + PWA OK
- Commit "chore(mag): bootstrap magasinier + PWA stores stocks/mouvements/inventaires"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 6 fonctions Espace Magasinier

### PROMPT 1.1 — Tableau de bord magasin

```
Fonction 1.1 : tableau de bord magasinier mobile-first.

PROTOTYPE HTML
==============
L'écran screen-mag-dashboard existe. Reproduire en React.

ÉLÉMENTS
=========
- Bandeau sticky violet avec magasin + badge sync status
- Salutation "Bonjour Lucas · Vendredi 9 mai 2026 · 07:48 · 12,4 M FCFA en stock"
- KPIs : Valeur stock 12,4M, Mouvements jour 14 (5 in + 9 out), Ruptures imminentes
  3 en rouge, Inventaire tournant Ciment en orange dû lundi
- CTA violet "📦 3 livraisons à réceptionner · BICAM 10h · Total 11h · ALUCAM 12h"
  avec bouton blanc 52px "Réceptionner →"
- Actions rapides 4 cards (Nouvelle entrée vert ⬆, Nouvelle sortie rouge ⬇,
  Inventaire tournant violet 📋, Signaler rupture orange ⚠)
- Section "Articles en rupture imminente" : 3 cards avec fond rouge clair, icône
  encadrée + nom + stock actuel + jours de couverture
- Activité du jour : 4 mouvements récents avec icônes ⬆ vert / ⬇ rouge et valeurs

API
===
- GET /api/mag/warehouse (mon magasin)
- GET /api/mag/dashboard
  → cache NetworkFirst pour offline-first
  → renvoie KPIs, ruptures, mouvements jour, livraisons attendues

COMPOSANTS src/components/mag/dashboard/
==========================================
- MagSyncStatusBadge.tsx (réutilise SyncStatusBadge du CC)
- MagGreeting.tsx (salutation + résumé valorisation)
- MagKpiRow.tsx (4 KPIs)
- DeliveriesCallToAction.tsx (CTA violet gradient)
- QuickActionsGrid.tsx (4 cards tactiles)
- StockRupturesList.tsx (articles critiques)
- TodayMovementsTimeline.tsx (4 derniers mouvements)

⚠️ RESPONSIVE
==============
- Tous les boutons 48px minimum
- Items articles en rupture : 68px hauteur (norme tactile)
- KPIs : 4 col → 2x2 → 1 col

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag
  pnpm exec tsx scripts/audit-tap-targets.ts /mag --min=48
  pnpm exec tsx scripts/audit-pwa.ts /mag

LIVRABLES
=========
- Code complet conforme au prototype
- Test offline : dashboard s'affiche depuis cache, badge "📴 Mode hors-ligne"
- Audit 7/7 responsive + 48px tap + PWA OK
- Commit "feat(mag): tableau de bord magasin — fn 1.1"
```

---

### PROMPT 1.2 — Entrées de stock

```
Fonction 1.2 : réception des livraisons fournisseurs (entrées de stock).

PROTOTYPE HTML
==============
L'écran screen-mag-entrees existe. Reproduire avec :
- 3 cards livraisons attendues (BICAM 10h, Total 11h, ALUCAM 12h) avec badge
  date 60×60 + 2 boutons "📷 Scanner BL" et "Saisir manuel" 48px
- Bouton dashed "+ Entrée hors livraison planifiée (régularisation, retour)"
- Section "Entrées récentes" : 3 cards avec icône statut (✓ vert conforme,
  ⚠ ambré écart), détails BL, valeur en vert

WORKFLOW MÉTIER
================
1. La livraison arrive au magasin (camion BICAM 320 sacs ciment)
2. Lucas tape "📷 Scanner BL" → caméra arrière s'ouvre
3. Photo du BL papier + OCR (Tesseract.js client ou /api/ocr backend)
4. Pré-remplissage automatique : numéro BL, articles, quantités
5. Comparaison avec BC d'origine + écarts détectés
6. Lucas confirme ou ajuste les quantités réelles + photo du tas livré si écart
7. Calcul automatique du nouveau PMP :
   PMP_nouveau = (Stock_ancien × PMP_ancien + Quantité_in × PrixAchat_BC) /
                 (Stock_ancien + Quantité_in)
8. Création StockMovement (direction=IN) + mise à jour WarehouseStock
9. Notification Comptable Chantier (Jacques MBARGA) pour comptabilisation facture
10. Si offline : queue + sync auto

API
===
- GET /api/mag/deliveries/today (livraisons attendues du jour)
- POST /api/mag/stock-movements/in → BackgroundSync
- POST /api/mag/stock-movements/in/with-bl-photo (avec OCR)
- POST /api/mag/stock-movements/in/manual (saisie manuelle)
- GET /api/mag/stock-movements/recent?direction=IN

COMPOSANTS src/components/mag/entrees/
========================================
- ExpectedDeliveriesList.tsx (3 cards à venir)
- DeliveryReceiveModal.tsx (scan BL ou saisie manuelle)
- ManualEntryWizard.tsx (étapes : article → quantité → fournisseur → prix → confirmer)
- RecentEntriesList.tsx
- BlOcrScanner.tsx (Tesseract.js + caméra)

⚠️ RESPONSIVE
==============
- Cards livraisons : structure verticale mobile
- Boutons d'action 48px flex 50/50
- Modale scan plein écran avec viewport caméra

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag/entrees
  pnpm exec tsx scripts/audit-tap-targets.ts /mag/entrees --min=48

LIVRABLES
=========
- Code complet avec calcul PMP fonctionnel
- Test : entrée 320 sacs à 12 000 FCFA/sac → stock passe de 12 à 332 sacs,
  PMP recalculé
- Test offline : entrée offline → queue → sync auto reconnexion → notif comptable
- Audit responsive + tap targets + PWA OK
- Commit "feat(mag): entrées de stock + scan BL + calcul PMP — fn 1.2"
```

---

### PROMPT 1.3 — Sorties de stock

```
Fonction 1.3 : bons de sortie matières vers équipes ouvrières.

PROTOTYPE HTML
==============
L'écran screen-mag-sorties existe. Reproduire avec :
- Bouton CTA principal violet gradient 56px "+ Nouveau bon de sortie"
- Section "⏳ 5 demandes en attente de validation" : cards par équipe avec
  avatar chef + libellé + quantités + temps écoulé + bouton "Valider" 48px
- Section "Bons de sortie validés (9)" : historique avec référence BS,
  équipe, signataire, valeur négative en rouge

WORKFLOW MÉTIER
================
Deux cheminements :

A) DEMANDE VENANT DU CHEF D'ÉQUIPE (workflow normal) :
1. F. NDONGO (chef coffrage) tape sur son téléphone "Demander matières"
2. Sélectionne : 42 sacs ciment HPC + 6 m³ sable
3. La demande arrive sur le tableau Lucas → notification push
4. Lucas vérifie la disponibilité physique → tap "Valider"
5. F. NDONGO reçoit notif → vient au magasin chercher les matières
6. Lucas pointe les quantités physiquement remises (peut différer de la demande
   en cas de rupture partielle)
7. Photo du bon papier signé par F. NDONGO (capture caméra arrière)
8. Calcul valeur = quantités × PMP article
9. Création StockMovement (direction=OUT, reason=CONSUMPTION_TEAM)
10. Stock mis à jour, équipe créditée

B) SORTIE INITIÉE PAR LUCAS (sortie directe) :
1. Lucas tape "+ Nouveau bon de sortie"
2. Wizard : équipe demandeuse → articles → quantités → signataire → photo bon
3. Idem points 8-10 ci-dessus

API
===
- GET /api/mag/stock-out/pending-requests (demandes équipes en attente)
- POST /api/mag/stock-out/:id/validate → BackgroundSync
- POST /api/mag/stock-out/new (sortie directe Lucas) → BackgroundSync
- POST /api/mag/stock-out/:id/signature-photo (upload photo bon)
- GET /api/mag/stock-movements/recent?direction=OUT

COMPOSANTS src/components/mag/sorties/
========================================
- PendingRequestsList.tsx (5 demandes en orange clair)
- ValidatePendingRequestModal.tsx (ajustement quantités + photo signature)
- NewOutgoingWizard.tsx (4 étapes : équipe → articles → quantités → photo)
- ValidatedOutgoingList.tsx (historique BS)
- SignaturePhotoCapture.tsx (caméra arrière + compression)

⚠️ RESPONSIVE
==============
- Cards demandes : padding 16px, avatar 44px, bouton Valider 48px à droite
- Wizard 4 étapes plein écran mobile avec stepper vertical
- Photo signature : capture="environment", compression 1280×960

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag/sorties
  pnpm exec tsx scripts/audit-tap-targets.ts /mag/sorties --min=48

LIVRABLES
=========
- Code complet
- Test workflow A : F. NDONGO demande → Lucas valide → photo bon → stock OK
- Test workflow B : Lucas sortie directe gasoil engins 78 L → OK
- Test offline : sortie offline → queue → sync auto
- Audit responsive + tap targets + PWA OK
- Commit "feat(mag): sorties + bons signés + photo — fn 1.3"
```

---

### PROMPT 1.4 — Catalogue articles

```
Fonction 1.4 : référentiel des 238 articles avec stocks courants.

PROTOTYPE HTML
==============
L'écran screen-mag-catalogue existe. Reproduire avec :
- Header "238 articles en catalogue · 12,4 M FCFA valorisés au PMP"
- Recherche full-text 48px font 16px
- Chips de filtre par catégorie scrollables (Tous, Ciment/béton 24, Acier 32,
  Granulats 12, Coffrage 18, Rupture 3)
- Liste articles : chaque ligne 80px avec icône catégorie 48px, code + nom +
  PMP + fournisseur, stock courant en grand (rouge si rupture, vert sinon)

API
===
- GET /api/mag/articles?search=&category=&onlyRuptures=
  → cache IndexedDB articles-cache
- GET /api/mag/articles/:id (détail avec historique mouvements)
- PATCH /api/mag/articles/:id/min-threshold (modifier seuil rupture)

COMPOSANTS src/components/mag/catalogue/
==========================================
- CatalogueHeader.tsx
- CatalogueSearch.tsx (full-text avec debounce)
- CategoryFilterChips.tsx (scrollable horizontal)
- ArticleRow.tsx (icône + infos + stock visuel)
- ArticleDetailDrawer.tsx (détail + historique mouvements)

⚠️ RESPONSIVE
==============
- Lignes articles 80px hauteur (espace pour icône 48px + 2 lignes texte + stock)
- Recherche : input 48px + font 16px
- Chips : scroll horizontal scroll-snap

OFFLINE
========
- Catalogue intégralement préchargé dans IndexedDB (238 articles ~50 Ko)
- Consultation hors-ligne complète
- Recherche full-text sur le cache si offline

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag/catalogue
  pnpm exec tsx scripts/audit-tap-targets.ts /mag/catalogue --min=48

LIVRABLES
=========
- Code complet avec 238 articles seedés
- Test : rechercher "HPC" → trouve "Ciment HPC 42,5 R"
- Test : filtre "Rupture" → affiche les 3 articles critiques
- Test offline : recherche fonctionne sur le cache
- Audit responsive + tap targets + PWA OK
- Commit "feat(mag): catalogue articles + recherche + filtres — fn 1.4"
```

---

### PROMPT 1.5 — Inventaires

```
Fonction 1.5 : inventaires mensuels + tournants par catégorie.

PROTOTYPE HTML
==============
L'écran screen-mag-inventaires existe. Reproduire avec :
- CTA ambré "📋 Inventaire tournant ciment dû lundi · 24 articles" + bouton blanc
  52px "Démarrer →"
- Section "Inventaire mensuel mai 2026" : card avec icône, libellé "238 articles
  à inventorier", chip "Dans 19 jours", progress 0%
- Section "Inventaires tournants par catégorie" : 4 lignes
  * Ciment / béton 24 articles · dû lundi (à faire orange)
  * Acier 32 articles · dernier 03/05 · 0 écart (à jour vert)
  * Granulats 12 articles · dernier 28/04 (à jour vert)
  * Carburants 4 articles · écart -12 L détecté hier (écart rouge)
- Section "Historique inventaires" : 2 dernières opérations clôturées

WORKFLOW MÉTIER
================
1. Lucas tape "Démarrer →" sur l'inventaire tournant ciment
2. Création d'un Inventory (status=IN_PROGRESS) + 24 InventoryLine pré-remplies
   avec theoreticalQty depuis WarehouseStock
3. Lucas parcourt physiquement le magasin, saisit countedQty pour chaque article
4. L'app calcule en temps réel le gap (countedQty - theoreticalQty)
5. Si écart > seuil tolérance (5%), Lucas saisit une justification obligatoire
   (vol, casse, erreur saisie antérieure, etc.)
6. À la fin, Lucas tape "Clôturer inventaire"
7. Status passe à PENDING_VALIDATION → notification au Comptable Chantier
8. Comptable valide → status=COMPLETED + création StockMovement ADJUSTMENT
   automatique pour régulariser le stock

API
===
- GET /api/mag/inventories (liste plannifiés + en cours + historique)
- POST /api/mag/inventories/start?type=&scope= → BackgroundSync
- GET /api/mag/inventories/:id/lines
- PATCH /api/mag/inventories/lines/:id (saisie countedQty + justif) → BackgroundSync
- POST /api/mag/inventories/:id/complete → BackgroundSync HIGH PRIORITY
- GET /api/mag/inventories/history

COMPOSANTS src/components/mag/inventaires/
============================================
- PendingInventoryCallToAction.tsx (CTA ambré gradient)
- MonthlyInventoryCard.tsx
- RollingInventoriesList.tsx (4 catégories avec statuts)
- InventoryHistoryList.tsx
- InventorySessionPage.tsx ⚠️ CRITIQUE — saisie ligne par ligne avec gap visuel
- GapJustificationModal.tsx (si écart > seuil)

⚠️ RESPONSIVE
==============
- Session inventaire : interface 1 article à la fois sur mobile (swipe ou boutons
  préc/suiv en bas), liste complète sur desktop
- Input countedQty : 48px + font 16px + clavier numérique inputMode="decimal"
- Indicateur visuel du gap (vert si conforme, ambré si <5%, rouge si >5%)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag/inventaires
  pnpm exec tsx scripts/audit-tap-targets.ts /mag/inventaires --min=48

LIVRABLES
=========
- Code complet
- Test : démarrer inventaire ciment → 24 lignes pré-remplies → saisir
  countedQty pour CIM-001 = 10 (vs 12 théorique) → gap -2 → justif "2 sacs cassés"
- Test clôture : Lucas clôture → comptable reçoit notif → valide → ajustement
  stock automatique
- Test offline : session inventaire offline → toutes les lignes saisies en queue
  → sync auto
- Audit responsive + tap targets + PWA OK
- Commit "feat(mag): inventaires + tournants + justification écarts — fn 1.5"
```

---

### PROMPT 1.6 — Historique mouvements

```
Fonction 1.6 : consultation historique complet entrées/sorties.

PROTOTYPE HTML
==============
L'écran screen-mag-mouvements existe. Reproduire avec :
- Header "Historique des mouvements · Traçabilité complète" + bouton "📥 Export Excel"
- Chips de filtre scrollables (Tous 142, Entrées 38, Sorties 104, Ce mois,
  7 derniers j)
- Liste chronologique : chaque mouvement 68px avec icône ⬆ vert / ⬇ rouge / ⚠ ambré
  pour ajustements, référence (BS/BL/INV-), description, date+heure+signataire,
  valeur signée en rouge ou vert

CONTEXTE MÉTIER
================
Cette vue est la **mémoire complète du magasin**. Elle sert pour :
- Contestation comptable (où sont passés mes 12 L de gasoil ?)
- Audit interne (suivre une référence de A à Z)
- Préparation inventaire mensuel (vérifier les mouvements depuis le dernier)
- Justification au DTrav / DG en cas d'enquête

API
===
- GET /api/mag/stock-movements?direction=&from=&to=&articleId=&search=&page=
- GET /api/mag/stock-movements/:id (détail avec photos BL et signature)
- GET /api/mag/stock-movements/export?format=xlsx&from=&to=

COMPOSANTS src/components/mag/mouvements/
===========================================
- MovementsHeader.tsx (titre + bouton export)
- MovementsFilterChips.tsx (5 chips)
- MovementsList.tsx (infinite scroll)
- MovementRow.tsx (68px hauteur, icône statut)
- MovementDetailDrawer.tsx (détail + photos BL + photos signature)
- ExportXlsxButton.tsx

⚠️ RESPONSIVE
==============
- Items 68px hauteur
- Bouton Export Excel 48px
- Détail mouvement : drawer 480px desktop, plein écran mobile
- Photos BL / signature affichées en grand avec pinch-to-zoom

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /mag/mouvements
  pnpm exec tsx scripts/audit-tap-targets.ts /mag/mouvements --min=48

LIVRABLES
=========
- Code complet
- Seed : 142 mouvements démo cohérents avec le dashboard
- Test : filtrer "Entrées" → 38 lignes vertes uniquement
- Test : tap sur BS-2026-0142 → drawer détail avec photo bon signé
- Test export : générer Excel mai 2026 → ~140 lignes + sheet récap
- Audit responsive + tap targets + PWA OK
- Commit "feat(mag): historique mouvements + filtres + export Excel — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil Magasinier complet

Tu viens de couvrir l'**ensemble du profil Magasinier** :
- Bloc 0 : Extension PWA (5 nouveaux stores IndexedDB + 4 routes Background Sync)
- Bloc 1 : 6 fonctions (Tableau de bord, Entrées, Sorties, Catalogue, Inventaires,
  Mouvements)

**Total profil Magasinier : 6 fonctions livrées + PMP SYSCOHADA + offline-first**

POINTS FORTS DE CE PROFIL
==========================
- Mobile-first absolu (48px tap, 16px font anti-zoom iOS, items 68px)
- PWA offline réutilisant l'infrastructure du Chef Chantier (gain temps dev)
- Calcul PMP conforme SYSCOHADA à chaque entrée
- Traçabilité complète avec photos (BL fournisseur + bons signés équipes)
- Scan BL avec OCR (Tesseract.js client ou backend)
- Inventaires tournants automatisés avec justification des écarts
- RBAC strict : Lucas ne voit que son magasin Pont Mfoundi

ESTIMATION EFFORT
==================
- Bloc 0 (extension PWA + Prisma 5 models + bootstrap) : 2-3 jours
- Bloc 1 (6 fonctions) : 6-7 jours
- TOTAL : 8-10 jours (court car réutilisation PWA infrastructure CC)

PROCHAINE ÉTAPE
================
Profils restants :
- Conducteur de Travaux (Samuel MBARGA) - bras droit DTrav
- Logisticien - flotte, achats, fournisseurs
- GED - référent documentaire
- Informaticien d'entreprise
- Employé bureau · Ouvrier

Mon ordre recommandé : Conducteur Travaux (complète l'écosystème terrain Pont Mfoundi)
puis Logisticien (vue siège complémentaire au Magasinier chantier).
