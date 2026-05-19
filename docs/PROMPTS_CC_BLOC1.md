# CC · BLOC 1 — Espace Chef Chantier (6 fonctions)

**6 fonctions à enchaîner**, toutes en mode **offline-first** : chaque action utilisateur
fonctionne sans réseau, le service worker met en queue les requêtes POST/PATCH dans
IndexedDB, et synchronise automatiquement quand la connexion revient.

⚠️ Responsive + tap targets 48px + PWA vérifiés par scripts à chaque commit.

---

## 🟪 PROMPT 1.1 — Tableau de bord chantier

```
Fonction 1.1 : tableau de bord ultra-simplifié du chef de chantier.

PROTOTYPE HTML
==============
L'écran screen-cc-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau sticky violet avec chantier + badge statut sync (composant SyncStatusBadge du Bloc 0)
- Salutation "Bonjour Jean" + date + météo locale
- CTA principal ambré gradient "⏰ Pointage matinal à faire · 74 ouvriers prévus"
  avec gros bouton blanc 52px "Démarrer pointage →"
- KPIs jour simplifiés (production hier validée, présents hier, livraisons aujourd'hui,
  phase en cours)
- 4 cards d'actions rapides (Production, Réceptionner, Déclarer incident, Photo terrain)
  en grille auto-fit min 160px avec icônes colorisées 44px et tap targets 64px
- Tâches programmées aujourd'hui avec barre colorée et statut (en cours / démarre 9h /
  urgent zone Z3 réserve BCT)

PRISMA
======
Réutilise Site, SiteDailyReport (créé côté DTrav fn 1.2), SiteTask (côté DTrav fn 1.4).
Aucun nouveau model nécessaire.

API
===
- GET /api/cc/site (chantier assigné au Chef Chantier)
- GET /api/cc/dashboard
  Renvoie {
    site: { id, name, code },
    yesterdayProduction, yesterdayAttendance,
    todayDeliveries, currentPhase,
    pendingAttendance: { needed: boolean, plannedHeadcount: number },
    todayTasks: [...],
    weatherToday
  }

OFFLINE
========
- GET dashboard mis en cache (stratégie NetworkFirst, fallback cache)
- Les KPIs affichent le dernier état connu si offline
- Le CTA pointage reste actif même offline (la saisie sera mise en queue)

COMPOSANTS src/components/cc/dashboard/
========================================
- SyncStatusBadge.tsx (réutilise du Bloc 0)
- GreetingHeader.tsx (Bonjour Jean + date + météo)
- AttendanceCallToAction.tsx ⚠️ CRITIQUE — Le gros CTA ambré
- CcKpiRow.tsx (4 KPIs simplifiés)
- QuickActionsGrid.tsx (4 cards d'actions tactiles)
- TodayTasksList.tsx

⚠️ RESPONSIVE MOBILE-FIRST ABSOLU
==================================
- Tous les boutons 48px minimum
- CTA pointage : bouton blanc 52px sur fond gradient ambré (très visible à 7h du
  matin sous le soleil)
- Quick actions : grille auto-fit min 160px → 2 col → 1 col selon écran
- Items tâches : 64px minimum tactiles

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc
  pnpm exec tsx scripts/audit-tap-targets.ts /cc --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc

LIVRABLES
=========
- Code complet conforme au prototype
- Test offline : couper le réseau, recharger /cc → dashboard s'affiche depuis le cache,
  badge passe en rouge "Mode hors-ligne"
- Test : tap "Démarrer pointage" → ouvre /cc/pointage
- Test RBAC : Jean tente d'accéder à /cc/sites/voirie-bonaberi → 403
- Audit responsive 7/7 OK + tap targets 48px OK
- Commit "feat(cc): tableau de bord chantier + sync status — fn 1.1
   ✅ Audit : 7/7 responsive + 48px tap + PWA offline OK"
```

---

## 🟪 PROMPT 1.2 — Pointage équipes

```
Fonction 1.2 : pointage matinal et soir des ouvriers (FONCTION CRITIQUE OFFLINE).

PROTOTYPE HTML
==============
L'écran screen-cc-pointage existe. Reproduire avec :
- Bandeau sticky avec badge "Synchro queue : 0" (ou N si éléments en attente)
- Récap haut : Effectif 74 / Présents 42 / Absents 3 / À pointer 29 + barre 57%
- Filtres équipes en chips scrollables horizontalement (Toutes 74, Coffrage 14, etc.)
- Liste ouvriers par équipe avec :
  * Avatar 44px coloré : vert ✓ si présent, blanc vide si non pointé, rouge ✗ si absent
  * Nom + matricule + métier + téléphone
  * Boutons "Présent" (vert 40px) / "Absent" (gris 40px) si non pointé
  * Heure de pointage affichée si présent
  * Motif d'absence si absent (cert. méd., congés, autre)
- Bouton sticky bottom "Valider le pointage matinal (42/74)" en 56px

WORKFLOW CRITIQUE (À 7H DU MATIN, ZONE SANS 4G PARFOIS)
========================================================
1. Jean ouvre /cc/pointage à 7h sur son téléphone
2. Si offline : l'app charge la liste des 74 ouvriers depuis IndexedDB cache (préchargé
   la veille au soir lors du dernier sync)
3. Jean tape "Présent" sur chaque ouvrier qui arrive → écriture immédiate dans
   IndexedDB queue + UI optimiste (avatar passe au vert)
4. À 7h45, Jean tape "Valider le pointage matinal" → marque la session comme finalisée
   dans IndexedDB
5. Quand la 4G revient (par ex. à 9h quand il monte sur le tablier) → service worker
   synchronise automatiquement la queue vers le serveur
6. Badge "Synchro queue : 0" affiché, notification toast "✓ Pointage synchronisé"

PRISMA
======
   model Attendance {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     userId      String   // ouvrier
     date        DateTime @db.Date
     session     AttendanceSession  // MORNING ou EVENING
     status      AttendanceStatus
     checkedInAt DateTime?
     reason      String?  // si ABSENT
     recordedBy  String   // chef de chantier
     recordedAt  DateTime @default(now())
     syncedFromOffline Boolean @default(false)
     clientUuid  String?  // pour dédoublonner les saisies offline
     @@unique([siteId, userId, date, session])
   }
   enum AttendanceSession { MORNING EVENING }
   enum AttendanceStatus { PRESENT ABSENT JUSTIFIED_ABSENT LATE LEFT_EARLY }

   model AttendanceSessionCompletion {
     id          String   @id @default(cuid())
     siteId      String
     date        DateTime @db.Date
     session     AttendanceSession
     completedBy String
     completedAt DateTime
     presentCount Int
     absentCount Int
     totalCount  Int
   }

API
===
- GET /api/cc/attendance/workforce (liste des ouvriers à pointer, équipes incluses)
  → Mise en cache IndexedDB workforce-cache
- POST /api/cc/attendance (création d'un pointage individuel)
  → BackgroundSync : queue offline si pas de réseau
- POST /api/cc/attendance/complete-session (validation finale matinal/soir)
  → BackgroundSync
- GET /api/cc/attendance/today?session= (état du pointage du jour)

OFFLINE — DÉTAILS TECHNIQUES
=============================
useAttendanceOffline.ts hook :
- Charge workforce depuis cache IndexedDB en priorité, puis API en arrière-plan
- Sauvegarde chaque "Présent"/"Absent" dans attendance-queue IndexedDB
- Affiche immédiatement le changement UI (optimistic update)
- Le service worker envoie la queue automatiquement quand online
- Si conflit (par ex. ouvrier déjà pointé par DTrav depuis un autre device),
  garde la version serveur et notifie l'utilisateur

COMPOSANTS src/components/cc/pointage/
========================================
- AttendanceSummary.tsx (Effectif/Présents/Absents/À pointer + progress)
- TeamsChipFilter.tsx (chips scrollables horizontalement)
- TeamSection.tsx (en-tête équipe avec chef + compteur)
- WorkerRow.tsx ⚠️ CRITIQUE — composant ouvrier avec actions tactiles
- AttendanceFinalizeButton.tsx (sticky bottom 56px)
- AttendanceConflictModal.tsx (si conflit lors de la sync)

⚠️ RESPONSIVE
==============
- Avatars 44px obligatoires
- Boutons Présent/Absent : 40px hauteur minimum, suffisamment de gap entre eux pour
  éviter le tap erroné
- Items ouvriers : 68px hauteur minimum (norme accessibilité tactile)
- Filtres équipes : scroll horizontal avec scroll-snap pour bon UX mobile
- Bouton sticky bottom : 56px avec ombre haute (visible démarcation du contenu)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc/pointage
  pnpm exec tsx scripts/audit-tap-targets.ts /cc/pointage --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc/pointage

TESTS CRITIQUES
================
1. Test online : Jean pointe 5 ouvriers présents → POST API immédiat → confirmation
2. Test offline : couper réseau, pointer 10 ouvriers → queue IndexedDB grossit →
   badge passe à "📴 Mode hors-ligne · 10 en attente"
3. Test sync : rebrancher → service worker envoie automatiquement les 10 entrées →
   badge revient à "● En ligne" + toast "✓ 10 pointages synchronisés"
4. Test conflit : 2 chefs sur le même chantier (rare mais possible) pointent le même
   ouvrier → résolution par "dernière modification gagne" + notification

LIVRABLES
=========
- Code complet avec offline-first fonctionnel
- 4 tests critiques validés
- Audit responsive + tap targets + PWA OK
- Commit "feat(cc): pointage offline-first + sync auto — fn 1.2
   ✅ Audit : 7/7 responsive + 48px tap + PWA offline OK"
```

---

## 🟪 PROMPT 1.3 — Production journalière

```
Fonction 1.3 : saisie de la production réalisée du jour.

PROTOTYPE HTML
==============
L'écran screen-cc-production existe. Reproduire avec :
- Cards par tâche programmée du jour (3 tâches dans la démo) :
  * Tâche saisie : barre violette + status "✓ Saisi" + input qty rempli + valeur calculée
  * Tâche à saisir : bordure dashed ambrée + status "À saisir" + input vide
- Inputs grands tactiles (48px hauteur, font 16px anti-zoom iOS)
- Calcul auto de la valeur (quantité × prix unitaire BPU)
- Bouton "+ Ajouter une tâche réalisée" (carte dashed)
- Section "Consommations matières du jour" avec liste articles + qty
- Bouton sticky bottom "Soumettre rapport à P. ETOUNDI" en 56px

WORKFLOW
=========
1. Au cours de la journée, Jean tape sur les tâches programmées et saisit les
   quantités réalisées (par équipe)
2. Le système calcule automatiquement la valeur (qty × prix BPU)
3. Jean ajoute les consommations matières (38 sacs ciment, 820 kg acier, 78 L gasoil)
4. À 18h, Jean tape "Soumettre rapport" → le rapport passe en statut SUBMITTED
   → notification automatique à Paul ETOUNDI (DTrav) qui validera ensuite
5. Si offline pendant la saisie : tout reste en local, soumission en queue

PRISMA
======
Réutilise SiteDailyReport (créé côté DTrav fn 1.2). Ajouter :
   model SiteTaskRealization {
     id          String   @id @default(cuid())
     dailyReportId String
     dailyReport SiteDailyReport @relation(fields: [dailyReportId], references: [id])
     taskId      String?  // référence à SiteTask si tâche programmée
     designation String   // libellé même si tâche libre
     quantity    Float
     unit        String
     unitPrice   BigInt   // depuis BPU du marché
     totalValue  BigInt   // calculé
     teamId      String?
     team        SiteTeam? @relation(fields: [teamId], references: [id])
     clientUuid  String?  // pour offline sync
   }

   model SiteMaterialConsumption {
     id          String   @id @default(cuid())
     dailyReportId String
     dailyReport SiteDailyReport @relation(fields: [dailyReportId], references: [id])
     articleId   String
     article     Article  @relation(fields: [articleId], references: [id])
     quantity    Float
     unit        String
     source      String?  // "magasin chantier", "livraison directe", etc.
   }

API
===
- GET /api/cc/production/today (récupère ou crée le rapport du jour)
- POST /api/cc/production/realizations (ajout tâche réalisée) → BackgroundSync
- PATCH /api/cc/production/realizations/:id (modif quantité) → BackgroundSync
- POST /api/cc/production/consumptions (ajout conso matière) → BackgroundSync
- POST /api/cc/production/submit (soumettre rapport à DTrav) → BackgroundSync

OFFLINE
========
- Le rapport du jour est créé localement dans IndexedDB au premier accès
- Toutes les modifications (tâches, consos, photos) sont mises en queue
- La soumission finale est mise en queue avec priorité HAUTE
- Quand sync : création/mise à jour du SiteDailyReport sur le serveur en transaction

COMPOSANTS src/components/cc/production/
==========================================
- DailyReportHeader.tsx (titre + total cumulé en mono violet)
- TaskRealizationCard.tsx ⚠️ CRITIQUE — input qté tactile 48px
- AddTaskButton.tsx (card dashed pleine largeur)
- MaterialConsumptionsList.tsx
- AddConsumptionButton.tsx
- SubmitReportButton.tsx (sticky bottom 56px)

⚠️ RESPONSIVE
==============
- Inputs numériques 48px + font 16px (anti-zoom iOS)
- Cards tâches : padding 16px, structure verticale claire
- Calcul valeur affiché en violet primary, prominent (16px bold mono)
- Bouton soumettre : sticky bottom plein largeur

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc/production
  pnpm exec tsx scripts/audit-tap-targets.ts /cc/production --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc/production

LIVRABLES
=========
- Code complet
- Test : Jean saisit 12.4 m² coffrage → valeur 680 000 FCFA calculée auto
- Test offline : saisir 3 tâches offline → soumettre → tout en queue → reconnexion →
  sync auto → rapport apparaît chez Paul ETOUNDI
- Audit responsive + tap targets + PWA OK
- Commit "feat(cc): production journalière + soumission offline — fn 1.3"
```

---

## 🟪 PROMPT 1.4 — Réceptions livraisons

```
Fonction 1.4 : réception des livraisons fournisseurs avec scan BL.

PROTOTYPE HTML
==============
L'écran screen-cc-livraisons existe. Reproduire avec :
- 3 livraisons attendues aujourd'hui avec :
  * Card BICAM ciment (proche, 10h) : border-left orange + countdown "Dans 2h 46"
  * Card Total Cameroun gasoil (11h) : border-left violet
  * Card STRABAG coffrage (déjà reçu) : background vert + icône ✓ + "Reçu il y a 32 min"
- Chaque livraison : badge date 60×60 + infos + countdown
- 2 boutons par livraison : "📷 Scanner BL" (violet primary) + "Saisir manuel" (défaut)
  en 48px chacun, flex 50/50
- Section "Livraisons récentes" avec historique 2 lignes

WORKFLOW SCAN BL
=================
1. Le camion BICAM arrive à 10h avec 320 sacs de ciment + BL papier
2. Jean ouvre /cc/livraisons sur son téléphone, tape "📷 Scanner BL" sur la livraison
   BICAM
3. La caméra arrière s'ouvre, Jean photographie le BL
4. OCR (côté serveur ou Tesseract.js côté client) extrait :
   - Numéro BL (ex: BL-2026-0451)
   - Date
   - Articles + quantités
5. Comparaison automatique avec le BC d'origine :
   - Si conforme → réception 1-clic
   - Si écart → affiche les écarts (qty manquante/excédentaire) avec input pour saisir
     les quantités réelles
6. Photo du BL stockée dans /api/cc/deliveries/:id/bl-photo
7. Validation finale → mise à jour stock chantier + notification Magasinier

PRISMA
======
Réutilise Delivery (créé côté DTrav fn 1.6). Ajouter :
   model DeliveryReceipt {
     id              String   @id @default(cuid())
     deliveryId      String   @unique
     delivery        Delivery @relation(fields: [deliveryId], references: [id])
     receivedAt      DateTime
     receivedBy      String   // chef de chantier
     blPhotoUrl      String?
     blNumber        String?
     items           Json     // [{ articleId, expectedQty, receivedQty, gap, accepted }]
     overallStatus   ReceiptStatus
     notes           String?
     signature       String?  // base64 signature électronique
   }
   enum ReceiptStatus { CONFORM PARTIAL_REJECTION FULL_REJECTION DAMAGED }

API
===
- GET /api/cc/deliveries/today (livraisons du jour)
- POST /api/cc/deliveries/:id/receive (réception manuelle ou après scan)
  → BackgroundSync
- POST /api/cc/deliveries/:id/bl-photo (upload photo BL)
  → Si offline : compressée + queue
- POST /api/cc/deliveries/:id/ocr-extract (OCR backend du BL)
- GET /api/cc/deliveries/recent (historique 7 jours)

OFFLINE
========
- Les livraisons du jour sont préchargées au démarrage de l'app
- La réception (validation quantités) fonctionne offline avec mise en queue
- Les photos de BL sont compressées (max 1280×960, qualité 0.7) puis mises en queue
- L'OCR n'est pas disponible offline → bascule en saisie manuelle obligatoire

COMPOSANTS src/components/cc/livraisons/
==========================================
- DeliveryHeader.tsx (titre + résumé)
- DeliveryCard.tsx ⚠️ CRITIQUE — affichage countdown + état
- BlScanModal.tsx (caméra + capture + OCR)
- ManualReceiptModal.tsx (saisie manuelle quantités)
- DeliveryItemRow.tsx (article + qté attendue/reçue + écart visuel)
- RecentDeliveriesList.tsx

⚠️ RESPONSIVE
==============
- Cards livraisons : padding 16px, structure flexible flex-wrap
- Boutons Scanner / Saisir : 48px hauteur, flex 1 chacun
- Modale scan : plein écran mobile avec viewport caméra max
- Modale saisie : plein écran mobile avec inputs 48px et clavier numérique
  inputMode="decimal"

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc/livraisons
  pnpm exec tsx scripts/audit-tap-targets.ts /cc/livraisons --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc/livraisons

LIVRABLES
=========
- Code complet
- Test : Jean scanne BL BICAM → OCR détecte "BL-2026-0451" + 320 sacs → conforme →
  réception 1-clic → notification Magasinier + comptable
- Test écart : BL annonce 320 sacs mais réception 318 (2 sacs cassés au transport) →
  Jean saisit 318 + notes "2 sacs endommagés, refusés" → écart enregistré
- Test offline : réceptionner livraison offline → queue → sync auto à la reconnexion
- Audit responsive + tap targets + PWA OK
- Commit "feat(cc): réception livraisons + scan BL + OCR — fn 1.4"
```

---

## 🟪 PROMPT 1.5 — Incidents et HSE

```
Fonction 1.5 : déclaration d'incidents et accès consignes HSE.

PROTOTYPE HTML
==============
L'écran screen-cc-hse existe. Reproduire avec :
- CTA rouge proéminent "Incident en cours ?" avec gros bouton blanc 52px
  "🚨 Déclarer un incident"
- Bandeau vert sécurité "🟢 142 jours sans accident grave · TF1 chantier 6,2"
- KPIs HSE (incidents YTD, causeries, EPI à vérifier, visite BCT)
- Card causerie sécurité du jour (thème S19 : travail en hauteur) avec bouton
  "Marquer comme effectuée (12 présents)"
- Liste incidents récents avec icône + couleur selon gravité

WORKFLOW DÉCLARATION URGENCE
=============================
1. Pierre ABEGA se coupe la main au ferraillage à 10h32
2. Jean ouvre /cc/hse, tape "🚨 Déclarer un incident"
3. Formulaire ultra-rapide en 4 étapes :
   Étape 1 : Type (boutons gros 80px : Presqu'accident / Accident léger / Accident
              grave / Incident matériel / Incident environnement)
   Étape 2 : Victime (autocomplete depuis liste des 74 ouvriers) + sélection partie
              du corps touchée (schéma anatomique tactile)
   Étape 3 : Description (textarea simple) + photo obligatoire (caméra arrière)
              + géolocalisation auto
   Étape 4 : Actions immédiates (boutons multi-select : Soins infirmerie / Evac CHU
              / Arrêt zone / Continuation possible / Autres)
4. Soumission → incident envoyé EN PRIORITÉ (queue avec priority=HIGH)
5. Notification push immédiate à : Paul ETOUNDI (DTrav), Daniel ESSOMBA (DT),
   Albert DAAYANG (DG si accident grave)
6. Si offline : queue mais notification toast immédiate "Incident enregistré
   localement, sera transmis dès reconnexion"

PRISMA
======
HseIncident existe (créé côté DT fn 1.8). Ajouter sur le model :
   model HseIncident {
     ...
     declaredByFieldUserId String?  // chef de chantier qui a déclaré
     declaredViaApp Boolean @default(true)
     bodyPartAffected String?  // tête, main droite, jambe gauche, etc.
     geoLocation Json?  // { lat, lng, accuracy }
     immediateActions String[]  // tableau des actions immédiates cochées
     photoUrls   String[]
     clientUuid  String?  // pour offline sync
   }

   model HseSafetyTalk {
     id          String   @id @default(cuid())
     siteId      String
     weekIso     String   // "2026-W19"
     theme       String
     description String   @db.Text
     completedAt DateTime?
     completedBy String?
     attendeesCount Int?
     attendeesIds String[]
   }

API
===
- GET /api/cc/hse/dashboard (KPIs + bandeau sécurité)
- POST /api/cc/hse/incidents (déclaration) → BackgroundSync PRIORITY=HIGH
- GET /api/cc/hse/incidents/recent
- GET /api/cc/hse/safety-talks/current-week (causerie du jour)
- POST /api/cc/hse/safety-talks/:id/complete (marquer effectuée)
- GET /api/cc/hse/safety-rules (consignes accessibles offline)

OFFLINE
========
- Les consignes HSE et la causerie de la semaine sont préchargées et stockées
  dans IndexedDB (consultation toujours possible offline)
- La déclaration d'incident en queue avec priority=HIGH (envoyée en premier
  quand la sync démarre)
- Photo d'incident compressée + stockée dans photo-queue

COMPOSANTS src/components/cc/hse/
====================================
- HseEmergencyCta.tsx (CTA rouge en haut)
- SafetyRecordBanner.tsx (142 jours sans accident en vert)
- HseKpiRow.tsx
- TodaySafetyTalkCard.tsx (causerie + bouton effectuée)
- IncidentReportWizard.tsx ⚠️ CRITIQUE — 4 étapes mobile-first
- BodyPartSelector.tsx (schéma anatomique tactile)
- ImmediateActionsChecklist.tsx (multi-select boutons 56px)
- RecentIncidentsList.tsx

⚠️ RESPONSIVE
==============
- Wizard 4 étapes : stepper vertical mobile, horizontal desktop
- Boutons type d'incident : 80px hauteur (urgence, doivent être ultra-visibles)
- Schéma anatomique : SVG interactif scalable, zones tactiles 44px minimum
- Photo : capture="environment" sur input file
- Géolocalisation : auto au premier tap, optionnelle (Permission API)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc/hse
  pnpm exec tsx scripts/audit-tap-targets.ts /cc/hse --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc/hse

LIVRABLES
=========
- Code complet
- Test : Jean déclare "Accident léger main droite P. ABEGA" → wizard 4 étapes en
  < 90 secondes → incident remonte chez DTrav + DT immédiatement
- Test offline : déclarer incident offline → notif toast → queue priority=HIGH →
  reconnexion → envoi en premier
- Test consignes : Jean consulte les consignes "Travail en hauteur" offline → OK
- Audit responsive + tap targets + PWA OK
- Commit "feat(cc): incidents HSE + consignes + déclaration urgence — fn 1.5"
```

---

## 🟪 PROMPT 1.6 — Mes équipes

```
Fonction 1.6 : annuaire de l'équipe chantier avec contacts rapides.

PROTOTYPE HTML
==============
L'écran screen-cc-equipes existe. Reproduire avec :
- Titre "74 personnes sous ma responsabilité"
- Barre de recherche 44px (nom, équipe, matricule)
- Cards par équipe :
  * En-tête violet clair avec avatar chef + nom équipe + nombre ouvriers + bouton
    vert 44px "📞 Appeler" (call direct au chef)
  * Liste ouvriers avec : avatar 40px (statut présent/absent), nom + métier +
    téléphone, 2 mini-boutons 40×40 "📞" (call) et "💬" (WhatsApp vert #25D366)

WORKFLOW CONTACT RAPIDE
========================
Jean est sur le chantier et a besoin de joindre rapidement un ouvrier ou un chef :
- Tap sur bouton "📞" → ouvre l'app Téléphone du téléphone avec le numéro pré-rempli
  (lien tel:+237689012345)
- Tap sur bouton "💬" → ouvre WhatsApp avec le chat de la personne (lien
  https://wa.me/237689012345)
- Pas de système interne de messagerie complexe pour le CC (il a déjà WhatsApp)

PRISMA
======
Réutilise User + SiteWorkforceMember + SiteTeam (créés côté DTrav fn 1.3).
Aucun nouveau model nécessaire.

API
===
- GET /api/cc/workforce (toute l'équipe par équipes, présence du jour incluse)
  → Mise en cache IndexedDB workforce-cache
- GET /api/cc/workforce/search?q= (recherche full-text nom/matricule)

OFFLINE
========
- L'équipe est préchargée dès le bootstrap (74 personnes avec photos miniatures,
  téléphones, métiers)
- Consultation toujours possible offline (lecture pure)
- Les boutons tel: et wa.me: fonctionnent même offline (intégration OS)

COMPOSANTS src/components/cc/equipes/
========================================
- WorkforceHeader.tsx (titre + recherche)
- TeamCard.tsx ⚠️ CRITIQUE — affichage équipe avec chef + bouton call
- WorkerRow.tsx (avatar statut + infos + boutons tel/whatsapp)
- WorkforceSearch.tsx (recherche full-text)
- ContactActions.tsx (tel: et wa.me: avec icônes)

⚠️ RESPONSIVE
==============
- Recherche : input 44px + font 16px (anti-zoom iOS)
- Avatars 44px (chef) et 40px (ouvriers)
- Boutons d'action 40×40 minimum
- Boutons WhatsApp vert #25D366 (couleur officielle Meta)
- Items ouvriers 60px hauteur (norme tactile)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /cc/equipes
  pnpm exec tsx scripts/audit-tap-targets.ts /cc/equipes --min=48
  pnpm exec tsx scripts/audit-pwa.ts /cc/equipes

LIVRABLES
=========
- Code complet
- Test : Jean recherche "ABEGA" → trouve Pierre + Patrick → tap "📞" → ouvre
  app Téléphone iOS/Android avec le bon numéro
- Test : tap "💬" sur Pierre → ouvre WhatsApp avec le chat Pierre
- Test offline : ouvre /cc/equipes offline → liste s'affiche depuis cache
- Audit responsive + tap targets + PWA OK
- Commit "feat(cc): mes équipes + contacts rapides tel/whatsapp — fn 1.6"
```

---

## ✅ FIN BLOC 1 — Profil Chef Chantier complet

Tu viens de couvrir l'**ensemble du profil Chef Chantier** mobile-first absolu avec PWA :
- Bloc 0 : PWA + Service Worker + IndexedDB + Background Sync + Manifest
- Bloc 1 : 6 fonctions Espace CC (Tableau de bord, Pointage offline, Production,
  Livraisons avec scan BL, HSE avec déclaration urgence, Mes équipes)

**Total profil Chef Chantier : 6 fonctions livrées + PWA offline-first complet**

POINTS FORTS DE CE PROFIL
==========================
- Mobile-first absolu : 48px tap targets, 16px font anti-zoom iOS, items 68px
- PWA installable sur écran d'accueil (iOS + Android)
- Offline-first : pointage, production, livraisons, incidents fonctionnent sans réseau
- Background Sync API : sync auto au retour réseau
- Photos compressées côté client avant upload (1280×960 max)
- Intégration native OS : tel: pour appels, wa.me: pour WhatsApp
- Tous les écrans testés mobile 375px sans débordement

PROCHAINE ÉTAPE
================
Profils restants après CC :
- Magasinier (Lucas TIENTCHEU) — mouvements stocks, inventaires
- Conducteur de Travaux (Samuel MBARGA) — pilotage quotidien chantier
- Logisticien — flotte, achats, fournisseurs
- GED — gestion documentaire
- Informaticien d'entreprise
- Employé bureau · Ouvrier — comptes basiques

Mon ordre recommandé : Magasinier (cycle stocks complet, complémentaire au CC) →
Conducteur Travaux (bras droit DTrav) → autres.
