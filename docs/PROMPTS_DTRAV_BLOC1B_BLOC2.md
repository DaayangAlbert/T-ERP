# DTRAV · BLOC 1 PARTIE B (fonctions 1.5 à 1.7) + BLOC 2 (modules transverses)

**3 fonctions Espace DTrav + 3 modules transverses = 6 prompts**

⚠️ Responsive mobile-first vérifié par scripts Playwright à chaque commit.

---

## 🟪 PROMPT 1.5 — Suivi marché et avenants

```
Fonction 1.5 : suivi financier du marché et gestion des avenants.

PROTOTYPE HTML
==============
L'écran screen-dtrav-marche existe. Reproduire avec :
- Bandeau marché (initial 280M, +18,4M signé, +45,8M en cours, projeté 344,2M)
- KPIs (5 situations émises, 186M encaissé 85%, retenue garantie 10,9M, 0 pénalité)
- Onglets : Situations / Avenants / Retenues & garanties / Échéancier MOA
- Tableau 6 situations de S1 à S6 (5 émises, 1 à émettre)
- Avenants : 1 signé +18,4M VRD trottoirs, 1 en cours +45,8M aléas géotechniques

CONTEXTE MÉTIER
================
Le DTrav suit le marché côté production (qu'a-t-on facturé, qu'a-t-on encaissé,
quelles retenues, quelles pénalités potentielles).
Il INITIE les demandes d'avenants (qui passent ensuite par DT N2 → DG N3).
Les situations sont préparées par le comptable chantier, validées par le DTrav,
puis émises au MOA.

PRISMA
======
   model SiteContract {
     id              String   @id @default(cuid())
     siteId          String   @unique
     initialAmount   BigInt
     signedAmendments BigInt @default(0)
     pendingAmendments BigInt @default(0)
     totalProjected  BigInt   // calculé
     contractStartDate DateTime
     contractEndDate DateTime
     warrantyPeriodMonths Int @default(12)
     warrantyRetentionRate Float @default(5.0) // %
     penaltyRatePerDay Float @default(0)
     moaName         String
     moaContactEmail String?
   }

   model ContractAmendment {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     reference   String   // "AVE-001"
     amount      BigInt
     extraDays   Int      @default(0)
     reason      String   @db.Text
     justification String  @db.Text
     status      AmendmentStatus
     initiatedBy String   // DTrav
     dtValidatedAt DateTime?
     dgValidatedAt DateTime?
     moaSignedAt DateTime?
     attachments String[]
     createdAt   DateTime @default(now())
   }
   enum AmendmentStatus { DRAFT N2_PENDING N3_PENDING MOA_PENDING SIGNED REJECTED }

   model SitePenalty {
     id          String   @id @default(cuid())
     siteId      String
     amount      BigInt
     reason      String
     notifiedAt  DateTime
     contestedAt DateTime?
     status      PenaltyStatus
   }
   enum PenaltyStatus { NOTIFIED CONTESTED ACCEPTED WAIVED PAID }

API
===
- GET /api/dtrav/sites/:siteId/contract
- GET /api/dtrav/sites/:siteId/billings (situations de travaux, réutilise
  ProgressBilling côté Comptable)
- GET /api/dtrav/sites/:siteId/amendments
- POST /api/dtrav/sites/:siteId/amendments (création par DTrav, statut DRAFT)
- POST /api/dtrav/amendments/:id/submit (passage en N2_PENDING vers DT)
- GET /api/dtrav/sites/:siteId/warranties (retenues de garantie en cours)
- GET /api/dtrav/sites/:siteId/penalties

COMPOSANTS src/components/dtrav/marche/
=========================================
- ContractBanner.tsx (4 indicateurs marché)
- ContractKpis.tsx
- ContractTabs.tsx (4 onglets)
- BillingsTable.tsx ⚠️ RESPONSIVE
- AmendmentsList.tsx (cards avec barres colorées selon statut)
- AmendmentFormModal.tsx (wizard création avenant : motif, montant, délai, pièces)
- WarrantiesTable.tsx
- PenaltiesList.tsx

⚠️ RESPONSIVE
==============
- Bandeau marché : 4 col → 2x2 → 1 col
- Tableau situations : cards par situation sur mobile avec encaissé/échéance bien
  visible
- Avenants : cards déjà responsive par design (border-left coloré)
- Wizard avenant : stepper horizontal desktop → vertical mobile (3 étapes : motif
  + justif → montant + délai → pièces jointes)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/marche
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/marche

LIVRABLES
=========
- Code complet
- Test : Paul crée nouvelle demande avenant 12M FCFA "Modification descente d'eau
  pile 3" → statut DRAFT → submit → passe en N2_PENDING DT → notif Daniel ESSOMBA
- Test : Paul consulte situation S5 (en attente encaissement) avec détail métré
- Audit responsive + tap targets OK
- Commit "feat(dtrav): suivi marché + avenants + situations + retenues — fn 1.5"
```

---

## 🟪 PROMPT 1.6 — Approvisionnements chantier

```
Fonction 1.6 : gestion des bons de commande chantier et livraisons.

PROTOTYPE HTML
==============
L'écran screen-dtrav-appros existe. Reproduire avec :
- KPIs (14 BC actifs cumul 38M, 5 livraisons J+7, 3 ruptures imminentes, stock 12,4M)
- Card alerte rouge "3 ruptures imminentes" avec 3 articles + boutons "Commander urgent"
- Tableau 5 BC en cours avec fournisseur, quantité, montant, livraison, état
- Liste "Livraisons attendues cette semaine" avec date visuelle + bouton Réceptionner

CONTEXTE MÉTIER
================
Le DTrav suit les approvisionnements de SES chantiers :
- Anticipe les ruptures (alerte automatique si stock < besoin semaine)
- Valide les BC chantier < 5M FCFA (au-delà → escalade DAF N2)
- Réceptionne les livraisons (ou délègue au magasinier chantier)
- Suit l'engagement budgétaire fournisseurs

Note : le magasinier chantier (Lucas TIENTCHEU) gère le stock physique. Le DTrav
a la vue globale et valide les commandes.

PRISMA
======
   model PurchaseOrder { // déjà créé côté Logistique/DAF, étendre
     ...
     siteId      String?  // CRITIQUE pour filtrage RBAC
     site        Site?    @relation(fields: [siteId], references: [id])
     initiatedBy String   // DTrav ou Magasinier
     dtravValidatedAt DateTime?
     dtravValidatedBy String?
   }

   model SiteStockAlert {
     id          String   @id @default(cuid())
     siteId      String
     articleId   String
     article     Article  @relation(fields: [articleId], references: [id])
     currentStock Float
     weeklyNeed  Float
     daysOfCover Float    // calculé
     severity    AlertSeverity
     suggestedSupplierId String?
     resolved    Boolean  @default(false)
     createdAt   DateTime @default(now())
   }

   model Delivery {
     id              String   @id @default(cuid())
     siteId          String
     poId            String
     po              PurchaseOrder @relation(fields: [poId], references: [id])
     supplierId      String
     scheduledAt     DateTime
     receivedAt      DateTime?
     receivedById    String?
     status          DeliveryStatus
     deliveryNoteRef String?
     items           Json     // [{ articleId, expectedQty, receivedQty, gap }]
   }
   enum DeliveryStatus { CONFIRMED IN_TRANSIT PARTIALLY_RECEIVED RECEIVED RETURNED }

API
===
- GET /api/dtrav/sites/:siteId/purchase-orders
- POST /api/dtrav/sites/:siteId/purchase-orders (BC chantier < 5M, validation auto)
- POST /api/dtrav/purchase-orders/:id/validate (validation DTrav N1)
- GET /api/dtrav/sites/:siteId/stock-alerts (ruptures imminentes)
- POST /api/dtrav/sites/:siteId/stock-alerts/:id/order-now (commande express)
- GET /api/dtrav/sites/:siteId/deliveries/upcoming
- POST /api/dtrav/deliveries/:id/receive (réception avec scan BL)

COMPOSANTS src/components/dtrav/appros/
=========================================
- ApprosKpis.tsx
- StockAlertsCard.tsx (alerte rouge avec articles + boutons commander)
- PurchaseOrdersTable.tsx ⚠️ RESPONSIVE
- UpcomingDeliveriesList.tsx (avec puces date + bouton réceptionner)
- NewPoModal.tsx (formulaire création BC chantier)
- ReceiveDeliveryModal.tsx (scan BL + validation quantités)

⚠️ RESPONSIVE
==============
- Card alerte ruptures : 3 articles en grille auto-fit min 220px → 1 col mobile
- Tableau BC : cards par BC sur mobile avec date livraison en proéminent
- Liste livraisons : déjà optimisée mobile (puces date à gauche, infos centre,
  bouton à droite)

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/appros
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/appros

LIVRABLES
=========
- Code complet
- Test : alerte rupture ciment HPC → Paul clique "Commander urgent" → BC BICAM
  320 sacs créé → validation auto (< 5M) → push fournisseur par email
- Test : Paul réceptionne livraison BL-2026-0451 → quantités scannées → écart
  détecté (-2 sacs) → BC mis à jour, notif comptable
- Audit responsive + tap targets OK
- Commit "feat(dtrav): approvisionnements + alertes ruptures + livraisons — fn 1.6"
```

---

## 🟪 PROMPT 1.7 — Documents chantier

```
Fonction 1.7 : GED filtrée par chantier avec capture photo terrain.

PROTOTYPE HTML
==============
L'écran screen-dtrav-documents existe. Reproduire avec :
- 6 cards catégories (Plans, Photos, PV réception, Rapports HSE, Courriers MOA, Marché)
- Barre de recherche
- Liste 5 documents récents avec icône type (PDF/JPG/DWG/XLS) colorisée

CONTEXTE MÉTIER
================
La GED chantier est filtrée : le DTrav voit uniquement les documents de SES chantiers.
Il peut :
- Consulter tous types de documents (plans, photos, PV, rapports HSE, courriers MOA,
  contrat et avenants)
- Capturer des photos terrain et les uploader directement depuis son téléphone
- Partager un document avec une partie prenante (MOA, BCT, sous-traitant)
- Rechercher dans le contenu (full-text si OCR activé)

PRISMA
======
   model SiteDocument {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     category    DocumentCategory
     title       String
     description String?
     fileUrl     String
     fileName    String
     fileSize    Int
     mimeType    String
     thumbnailUrl String?
     uploadedBy  String
     uploadedAt  DateTime @default(now())
     tags        String[] @default([])
     metadata    Json?    // EXIF pour photos, version pour plans, etc.
     ocrContent  String?  @db.Text  // contenu extrait pour recherche
   }
   enum DocumentCategory { EXECUTION_PLANS FIELD_PHOTOS RECEPTION_PV HSE_REPORTS MOA_CORRESPONDENCE CONTRACT_AMENDMENTS STUDIES_REPORTS QUALITY_CONTROL OTHER }

API
===
- GET /api/dtrav/sites/:siteId/documents?category=&search=&page=
- POST /api/dtrav/sites/:siteId/documents (upload classique)
- POST /api/dtrav/sites/:siteId/documents/photo (upload photo direct mobile,
  compression auto, EXIF, géolocalisation)
- GET /api/dtrav/documents/:id
- DELETE /api/dtrav/documents/:id (audit log)
- POST /api/dtrav/documents/:id/share (génère lien temporaire signé)

COMPOSANTS src/components/dtrav/documents/
============================================
- DocumentCategoriesGrid.tsx (6 cards cliquables)
- DocumentSearchBar.tsx (full-text)
- RecentDocumentsList.tsx (icônes type colorisées)
- DocumentViewer.tsx (lightbox photos, viewer PDF)
- PhotoCaptureButton.tsx ⚠️ CRITIQUE MOBILE
- DocumentShareModal.tsx (lien temporaire avec expiration)

⚠️ FONCTIONNALITÉ MOBILE CRITIQUE — PHOTO CAPTURE
===================================================
Le bouton "📷 Photo terrain" (présent dans le header de tous les écrans DTrav)
doit ouvrir directement la caméra du téléphone :
   <input type="file" accept="image/*" capture="environment" />

Flow utilisateur :
1. Tap "📷 Photo terrain"
2. Caméra arrière s'ouvre
3. Capture
4. Compression auto (réduction à 1920×1080 max, qualité 0.8) côté client
5. Upload en POST /api/dtrav/sites/:siteId/documents/photo avec :
   - chantier actif (du ChantierContext)
   - géolocalisation (si autorisée)
   - timestamp
   - métadonnées EXIF
6. Toast de confirmation + miniature dans la liste

⚠️ RESPONSIVE
==============
- Catégories : grille auto-fit min 200px → 2 cols → 1 col
- Recherche : input min-height 40px
- Documents récents : items min-height 56px (cf. règles DTrav)
- Viewer mobile : plein écran avec pinch-to-zoom

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /dtrav/documents
  pnpm exec tsx scripts/audit-tap-targets.ts /dtrav/documents

LIVRABLES
=========
- Code complet avec capture photo native mobile
- Test : Paul capture photo depuis son iPhone → upload réussit → photo apparaît
  dans "Photos terrain" Pont Mfoundi avec géolocalisation
- Test : recherche "BCT" → trouve le rapport visite BCT du 09/05
- Test : Paul partage rapport BCT avec MOA Comm. Yaoundé I → lien temporaire 48h
- Audit responsive + tap targets OK
- Commit "feat(dtrav): documents chantier + GED + capture photo native — fn 1.7"
```

---

## ✅ FIN BLOC 1 — Espace DTrav (7 fonctions)

---

# BLOC 2 — Modules transverses (3 fonctions)

## 🟪 PROMPT 2.1 — Mes validations (vue DTrav)

```
Module : Mes validations · vue DTrav.

CONTEXTE
========
Le DTrav valide en N1 plusieurs types :
- Rapports journaliers du chef de chantier (déjà fait fn 1.2)
- BC chantier < 5M FCFA (déjà fait fn 1.6)
- Notes de frais des cadres chantier
- Demandes de congés des employés chantier (validation chef d'équipe + DTrav avant RH)

PROTOTYPE HTML — ENRICHISSEMENT screen-validations
===================================================
Pour Role.DIRECTOR_OF_WORKS, ajouter :

1. Bandeau : "Validations DTrav · 4 en attente · 2 chantiers (Pont Mfoundi + AEP Mbalmayo)"

2. Onglets DTrav :
   - Mes validations N1 (existant)
   - Tout le circuit chantier (transverse, filtré sur SES chantiers)
   - Mes délégations (si Paul part en congés)

3. Filtres par chantier (Tous / Pont Mfoundi / AEP Mbalmayo)

API
===
- GET /api/dtrav/validations/pending (filtré par assignedSiteIds)
- POST /api/dtrav/validations/:id/approve
- POST /api/dtrav/validations/:id/reject
- GET /api/dtrav/validations/circuit (filtré chantiers)
- GET /api/dtrav/validations/delegations
- POST /api/dtrav/validations/delegations (typiquement à Samuel MBARGA conducteur travaux)

COMPOSANTS src/components/dtrav/validations/
==============================================
- DtravValidationsBanner.tsx
- DtravValidationsTable.tsx ⚠️ RESPONSIVE
- DtravChantierFilter.tsx (chips Tous/Pont/AEP)
- DtravDelegationsManager.tsx

⚠️ RESPONSIVE
==============
- Tableau → cards mobile avec workflow vertical (cf. autres profils)
- Chips filtre : scroll horizontal mobile
- Modale validation : plein écran mobile

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /validations

LIVRABLES
=========
- Prototype enrichi (sections DTrav conditionnelles + filtrage RBAC)
- Code complet
- Test : Paul valide rapport journalier Pont Mfoundi → bascule vers AEP via le
  switcher → voit uniquement les validations AEP
- Test : Paul délègue à Samuel pour 5 jours → Samuel reçoit notif + accès temporaire
- Audit responsive 7/7 OK
- Commit "feat(dtrav): validations N1 + circuit + délégations — fn 2.1"
```

---

## 🟪 PROMPT 2.2 — Reporting MOA

```
Module : Reporting MOA · vue DTrav.

CONTEXTE
========
Le DTrav doit rendre des comptes à ses MOA (maîtres d'ouvrage) :
- Reporting hebdomadaire (chaque vendredi soir) : avancement + photos + écarts
- Reporting mensuel d'avancement (avec la situation de travaux émise)
- Compte-rendu de réunions de chantier
- Rapport d'incident HSE si applicable
- Notes de service MOA (information formelle)

PROTOTYPE HTML — ENRICHISSEMENT screen-reports
================================================
Pour Role.DIRECTOR_OF_WORKS, ajouter section "Reporting MOA" :

Templates de rapport par chantier :
1. Reporting hebdomadaire chantier (vendredi 18h auto-généré)
2. Compte-rendu mensuel d'avancement
3. Compte-rendu réunion de chantier
4. Rapport d'incident HSE
5. Note de service MOA

Pour chaque chantier de Paul (Pont Mfoundi + AEP Mbalmayo), section dédiée :
- Derniers rapports envoyés
- Prochain rapport à envoyer (échéance)
- Historique des accusés de réception MOA

PRISMA
======
   model MoaReport {
     id          String   @id @default(cuid())
     siteId      String
     site        Site     @relation(fields: [siteId], references: [id])
     reportType  MoaReportType
     period      String?  // "2026-W19", "2026-05"
     content     Json     // structure rapport (sections)
     pdfUrl      String?
     sentTo      String[] // emails MOA
     sentAt      DateTime?
     acknowledgedAt DateTime?
     authorId    String
     createdAt   DateTime @default(now())
   }
   enum MoaReportType { WEEKLY_PROGRESS MONTHLY_PROGRESS SITE_MEETING_MINUTES HSE_INCIDENT MOA_NOTICE OTHER }

API
===
- GET /api/dtrav/moa-reports/templates
- GET /api/dtrav/sites/:siteId/moa-reports
- POST /api/dtrav/sites/:siteId/moa-reports/generate?type=
  (génère PDF pré-rempli avec données réelles : avancement, présence, production,
  photos de la semaine, écarts)
- POST /api/dtrav/moa-reports/:id/send (envoi email aux MOA)

COMPOSANTS src/components/dtrav/reports/
==========================================
- DtravReportTemplateCard.tsx
- DtravReportEditor.tsx (édition WYSIWYG sections)
- DtravReportPdfGenerator.tsx (template React-PDF)
- MoaContactsList.tsx (destinataires)

⚠️ RESPONSIVE
==============
- Cards templates en grille auto-fit 3 col → 2 col → 1 col
- Éditeur WYSIWYG : sidebar outils → bottom toolbar mobile

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /rapports

LIVRABLES
=========
- Prototype enrichi avec section Reporting MOA DTrav
- Code complet
- Test : Paul génère reporting hebdo S19 Pont Mfoundi vendredi 18h → PDF pré-rempli
  avec avancement, 12 photos, 1 écart planning → envoi auto à MOA Comm. Yaoundé I
- Test : Paul rédige CR réunion chantier → diffusion à MOA + DT + interne
- Audit responsive 7/7 OK
- Commit "feat(dtrav): reporting MOA + templates + génération PDF — fn 2.2"
```

---

## 🟪 PROMPT 2.3 — Mon espace DTrav (profil + paie + messagerie)

```
Module : Mon profil + Ma paie + Messagerie · vue DTrav.

PROTOTYPE HTML — ENRICHISSEMENTS
=================================

screen-profile (Mon profil) — pour le DTrav ajouter :

1. Section "Mes chantiers assignés" (lecture seule, contact DT pour modifier) :
   - Liste : Pont Mfoundi · 78 % avancement · livraison J+52
   - AEP Mbalmayo · 55 % avancement · livraison 30/08/26

2. Section "Préférences alertes chantier" :
   - Alerte rupture stock J-3 (activé par défaut)
   - Alerte écart production > 10% (activé)
   - Alerte retard jalon MOA J-7 (activé)
   - Alerte incident HSE (toujours actif)
   - Canal préféré : push SMS prioritaire (terrain)

3. Section "Mes habilitations" :
   - Validation BC chantier < 5 M FCFA
   - Validation rapports journaliers
   - Initiation avenants (transmission DT N2)
   - Demande renforts équipe (transmission DT)

4. Section "Mon agenda chantier" :
   - Réunions MOA programmées (Pont Mfoundi 12/05 à 14h)
   - Jalons à atteindre (J3 Pont J+12)
   - Visites BCT prévues
   - Réunions techniques internes (lundis 14h)

screen-pay (Ma paie) — profil cadre 11 :
- Section "Bonus performance chantier" :
  · Bonus marge chantier annuelle (formule liée aux marges réalisées)
  · Bonus délais MOA (prime si tous jalons atteints à temps)
  · Bonus zéro accident grave chantier (prime annuelle)
- Avantages cadre 11 (véhicule de chantier 4x4, téléphone, indemnités déplacement)

screen-msg (Messagerie) — pour le DTrav ajouter :
- Section "Groupes chantier" épinglés (un par chantier) :
  · Équipe Pont Mfoundi (DTrav + Conducteur + Chef chantier + Magasinier)
  · Équipe AEP Mbalmayo (DTrav + Chef chantier)
  · MOA Pont Mfoundi (DTrav + DG + MOA Comm. Yaoundé I)
  · MOA AEP Mbalmayo
- Contacts externes DTrav par chantier :
  · BCT référent Pont Mfoundi (M. KENGNE)
  · LABOGENIE référent
  · MOA contacts directs

PRISMA
======
Réutilise UserPreferences et Conversation.
   model UserPreferences {
     ...
     dtravAlerts Json?  // { stockRupture, productionGap, milestoneApproach, ... }
   }

API
===
- GET/PATCH /api/users/me/preferences
- GET /api/dtrav/profile/assigned-sites
- GET /api/dtrav/profile/agenda (réunions + jalons + visites)
- POST /api/conversations (créer groupe chantier)

⚠️ RESPONSIVE
==============
Sections en cards verticales sur mobile.
Agenda : vue liste mobile, calendrier mensuel desktop.

VALIDATION OBLIGATOIRE
=======================
  pnpm exec tsx scripts/audit-responsive.ts /profil
  pnpm exec tsx scripts/audit-responsive.ts /paie
  pnpm exec tsx scripts/audit-responsive.ts /messagerie

LIVRABLES
=========
- Prototype enrichi (sections DTrav conditionnelles)
- Code complet
- Test : Paul voit ses 2 chantiers assignés avec avancement temps réel
- Test : créer groupe "MOA Pont Mfoundi" avec Albert DAAYANG + contact MOA → OK
- Audit responsive 7/7 OK sur les 3 routes
- Commit "feat(dtrav): mon espace personnel + agenda + groupes chantier — fn 2.3"
```

---

## ✅ PROFIL DTRAV TERMINÉ

Tu viens de couvrir l'**ensemble du profil Directeur de Travaux** mobile-first :
- Bloc 0 : Préambule + ChantierContext + SiteSwitcher + script audit-tap-targets
- Bloc 1 partie A : 4 fonctions (Tableau de bord, Production, Équipe, Planning)
- Bloc 1 partie B : 3 fonctions (Marché, Approvisionnements, Documents avec capture photo)
- Bloc 2 : 3 modules transverses (Validations, Reporting MOA, Mon espace)

**Total profil DTrav : 10 fonctions livrées + sélecteur multi-chantier + capture photo native**

POINTS FORTS DE CE PROFIL
==========================
- Mobile-first vraiment poussé (tap targets 40/44/56px, sticky elements, bottom CTAs)
- Sélecteur de chantier 1-tap pour basculer entre Pont Mfoundi et AEP Mbalmayo
- Capture photo native du téléphone (champ file capture="environment")
- RBAC strict via assignedSiteIds (impossible d'accéder hors chantiers assignés)
- Workflow auto-géré : DTrav initie → DT N2 → DG N3 (avenants, BC > 5M, renforts)

PROCHAINE ÉTAPE
================
Profils restants après DTrav :
- Conducteur de Travaux (Samuel MBARGA) — bras droit terrain
- Chef de Chantier (Jean KAMGA) — PWA mobile hors-ligne, le profil le plus mobile
- Magasinier (Lucas TIENTCHEU) — mouvements stocks, inventaires
- Logisticien — flotte, achats, fournisseurs
- GED — gestion documentaire (référent global)
- Informaticien d'entreprise
- Employé bureau · Ouvrier — comptes basiques

Mon ordre recommandé : Chef Chantier (PWA hors-ligne = effet wow démo) →
Magasinier (cycle stocks complet) → Conducteur Travaux → autres.
