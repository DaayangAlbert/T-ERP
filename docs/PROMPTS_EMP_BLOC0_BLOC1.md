# EMPLOYÉ · OUVRIER · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Employé / Ouvrier (François NDONGO · Chef d'équipe coffrage
Pont Mfoundi · 14 ouvriers sous sa responsabilité)

**Volume :** 418 ouvriers + ~22 employés bureau = **440 utilisateurs sur 487**
(soit 90% de la base BatimCAM).

**Position hiérarchique :** rapporte au Chef de Chantier (Jean KAMGA pour
François) ou directement à un manager bureau. Profil le **plus restrictif**
de T-ERP : ne voit que ses propres données.

**Architecture RBAC** : `role: EMPLOYEE` + `assignedSiteIds: [chantier_principal]`
**Pour les employés bureau** : `assignedSiteIds: []` (siège uniquement)

**Mobile-first absolu** (smartphone Android principalement) avec **PWA installable**.
Tap targets 48px stricts. Notifications **WhatsApp first** pour les ouvriers.
Multilingue FR/EN (régions anglophones SW/NW Cameroun).

---

## ⚠️ PROTOCOLE RESPONSIVE + PWA

Tap targets stricts identiques au CC/MAG/CDT (48px boutons, 68px items cliquables,
48px inputs + 16px font anti-zoom iOS, 56px CTAs sticky, 44px avatars).

```bash
pnpm exec tsx scripts/audit-responsive.ts /emp/<route>
pnpm exec tsx scripts/audit-tap-targets.ts /emp/<route> --min=48
pnpm exec tsx scripts/audit-pwa.ts /emp
```

Format commit : "✅ Audit : 7/7 responsive + 48px tap + PWA OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE EMPLOYÉ

```
Phase de développement du profil Employé / Ouvrier (François NDONGO et autres).

CONTEXTE
========
- Le prototype HTML contient 5 écrans Espace EMP :
  screen-emp-dashboard, screen-emp-paie, screen-emp-conges,
  screen-emp-pointage, screen-emp-profil
- Tous ont les attributs data-rh-screen + data-emp-screen
- 440 utilisateurs concernés sur 487 BatimCAM (90%)
- 2 personnages : François NDONGO (ouvrier chef d'équipe), Pauline NTSAMA
  (employée bureau assistante DG)
- Profil le plus restrictif : ne voit QUE ses propres données

CONVENTIONS
============
- Écrans prototype : id="screen-emp-<fonction>"
- Pages Next.js : src/app/(app)/emp/<fonction>/page.tsx
- Composants : src/components/emp/<NomFonction>.tsx
- API routes : src/app/api/emp/<fonction>/route.ts
- Hooks : src/hooks/useEmp<Fonction>.ts

SPÉCIFICITÉS DU PROFIL
=======================

**Volume utilisateur** :
- ~22 employés bureau (assistantes, comptables junior, etc.)
- ~418 ouvriers terrain (coffreurs, ferrailleurs, maçons, journaliers)

**Différence Employé bureau vs Ouvrier (canal d'accès)** :
| Aspect | Bureau (Pauline) | Ouvrier (François) |
|--------|------------------|---------------------|
| Accès principal | PC navigateur | Smartphone PWA |
| Notifications | Email + Push | **WhatsApp Business** |
| Pointage | Auto badge bureau | Pointé par Chef Chantier |
| Bulletin paie | PDF téléchargement | PDF mobile + WhatsApp |
| Connexion | LDAP éventuel | Mot de passe + matricule |

**Permissions très restrictives** :
- ✅ Lecture : SES propres bulletins, congés, pointages, contrat, formations
- ✅ Création : demande congés, signalement désaccord pointage
- ❌ Lecture : autres utilisateurs (sauf équipe pour chef d'équipe), comptes,
  finances, paie autres
- ❌ Modification : informations personnelles directement (passe par RH workflow)

**Pour les chefs d'équipe (sous-rôle "TEAM_LEADER")** :
- ✅ Lecture : son équipe (présences, ancienneté) en mode consultation
- ❌ Modification : ne fait pas le pointage (c'est le CC qui pointe)

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role {
     ...
     EMPLOYEE
   }

2. Étendre User avec champs personnels et flags :
   model User {
     ...
     // Identité ouvrier/employé
     matricule         String?  @unique  // "BTC-2018-0142"
     dateOfBirth       DateTime?
     cniNumber         String?
     phoneMobile       String?
     personalEmail     String?
     address           String?
     familyStatus      String?  // "Marié · 3 enfants"
     emergencyContactName  String?
     emergencyContactPhone String?
     // Pro
     cnpsNumber        String?  // CNPS-218-2018-0142
     niu               String?  // F218014203187
     bankName          String?  // Afriland First Bank
     bankAgency        String?
     rib               String?
     hireDate          DateTime?
     contractType      String?  // "CDI", "CDD", "Journalier"
     professionalCategory String? // "Catégorie 8 · échelon 3"
     position          String?  // "Chef d'équipe coffrage"
     teamLeader        Boolean  @default(false)
     // Préférences
     preferredLanguage String   @default("fr-CM")  // ou "en-CM"
     notificationChannel String @default("WHATSAPP")  // ou "EMAIL", "PUSH"
   }

3. Créer le layout dédié src/app/(app)/emp/layout.tsx :
   - Vérifie Role.EMPLOYEE
   - Charge l'EmployeeContext (mon profil, mon chantier si applicable)
   - Détecte si user mobile (User-Agent) → PWA installable
   - Wrap children dans <div data-emp-screen data-rh-screen className="rh-page">

4. Étendre Prisma — 4 nouveaux/étendus models employé :

   // PaySlip (étendre l'existant si déjà créé pour RH)
   model PaySlip {
     id              String   @id @default(cuid())
     tenantId        String
     userId          String
     user            User     @relation(fields: [userId], references: [id])
     period          String   // "2026-04"
     periodStart     DateTime
     periodEnd       DateTime
     // Composantes brut
     baseSalary      BigInt
     overtimeAmount  BigInt   @default(0)
     overtimeHours   Float    @default(0)
     seniorityBonus  BigInt   @default(0)
     transportAllowance BigInt @default(0)
     otherBonuses    Json?
     grossTotal      BigInt
     // Cotisations
     cnpsAmount      BigInt
     irppAmount      BigInt
     otherDeductions BigInt   @default(0)
     totalDeductions BigInt
     // Net
     netToPay        BigInt
     // Paiement
     paymentMethod   PaymentMethod
     paymentBankAccount String?
     paymentDate     DateTime?
     paymentStatus   PaymentStatus
     paymentReference String?  // BS-2026-04-NDF
     // Métadonnées
     pdfUrl          String?
     workedDays      Int
     reportedHours   Float
     overtimeHours125 Float   @default(0)
     overtimeHours150 Float   @default(0)
     overtimeHours200 Float   @default(0)
     createdAt       DateTime @default(now())
     @@unique([userId, period])
   }
   enum PaymentMethod { BANK_TRANSFER MOBILE_MONEY CASH }
   enum PaymentStatus { DRAFT VALIDATED PAID FAILED }

   // LeaveBalance (soldes congés)
   model LeaveBalance {
     id              String   @id @default(cuid())
     userId          String   @unique
     user            User     @relation(fields: [userId], references: [id])
     year            Int      // 2026
     paidLeaveAcquired Float  @default(30)  // congés payés acquis
     paidLeaveUsed   Float    @default(0)
     paidLeaveRemaining Float @default(30)
     compensatoryDays Float   @default(0)   // récupération heures sup
     sickDaysUsed    Float    @default(0)
     unpaidLeaveUsed Float    @default(0)
     updatedAt       DateTime @updatedAt
     @@unique([userId, year])
   }

   // LeaveRequest (étendre si déjà existant côté RH)
   model LeaveRequest {
     id              String   @id @default(cuid())
     userId          String
     user            User     @relation(fields: [userId], references: [id])
     type            LeaveType
     startDate       DateTime
     endDate         DateTime
     days            Float
     reason          String?
     justificationDoc String? // certificat médical, etc.
     status          LeaveStatus
     submittedAt     DateTime @default(now())
     validatedBy     String?  // Manager ou CC
     validatedAt     DateTime?
     rejectionReason String?
   }
   enum LeaveType { PAID_LEAVE SICK_LEAVE COMPENSATORY UNPAID FAMILY_EVENT MATERNITY PATERNITY OTHER }
   enum LeaveStatus { PENDING APPROVED REJECTED CANCELLED }

   // TimeReport (vue détaillée du pointage employé)
   model TimeReport {
     id              String   @id @default(cuid())
     userId          String
     user            User     @relation(fields: [userId], references: [id])
     date            DateTime @db.Date
     siteId          String?
     site            Site?    @relation(fields: [siteId], references: [id])
     arrivalTime     DateTime?
     departureTime   DateTime?
     breakMinutes    Int      @default(60)
     totalHours      Float
     standardHours   Float
     overtimeHours   Float    @default(0)
     overtimeType    String?  // "evening_125", "night_150", "sunday_200"
     status          TimeStatus
     pointedBy       String   // userId du CC ou auto badge
     contestedAt     DateTime?
     contestReason   String?
     resolvedAt      DateTime?
     resolvedBy      String?
     @@unique([userId, date])
   }
   enum TimeStatus { PRESENT ABSENT_JUSTIFIED ABSENT_UNJUSTIFIED HOLIDAY LEAVE SICK }

PWA INSTALLABLE
================
- Manifest avec icônes T-ERP violet
- Service Worker simple (pas Background Sync car pas de saisie offline majeure)
- Cache offline : derniers bulletins + soldes congés + profil
- Notifications push web pour bulletins disponibles
- WhatsApp Business pour notifications principales ouvriers

NOTIFICATIONS WHATSAPP (ouvriers)
==================================
Templates approuvés à utiliser :
1. NEW_PAYSLIP_AVAILABLE : "Bonjour {nom}, votre bulletin {mois} {année}
   de {montant} FCFA est disponible. Lien : {url}"
2. LEAVE_REQUEST_APPROVED : "Bonjour {nom}, votre demande de congé du
   {date_debut} au {date_fin} a été validée par {validator}."
3. LEAVE_REQUEST_REJECTED : avec raison
4. PAYMENT_RECEIVED : "Votre salaire de {montant} FCFA a été viré sur
   Afriland le {date}. Réf : {ref}"
5. CERTIFICATE_EXPIRY : alerte certificat sécurité expire dans 30j
6. CONTRACT_ANNIVERSARY : pour 1 an, 5 ans, 10 ans...
7. SITE_CHANGE : "Vous êtes affecté(e) au chantier {nom_chantier} à partir
   du {date}"

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 4 nouveaux/étendus models employé
- User étendu avec 18 nouveaux champs (identité, pro, préférences)
- Layout EMP protégé par rôle EMPLOYEE
- PWA installable (manifest + service worker simple)
- Templates WhatsApp Business approuvés (7 templates)
- Seed : François NDONGO francois@batimcam.cm / Demo2026! avec PaySlip avril,
  LeaveBalance 18j restants, TimeReport semaine 19
- Seed : Pauline NTSAMA pauline@batimcam.cm / Demo2026! (employée bureau)
- Seed : 30 autres ouvriers réalistes avec données cohérentes
- Test : François se connecte mobile → dashboard mobile-first
- Test RBAC : François tente d'accéder paie de Marcel → 403
- Test RBAC : François tente /rh/payroll → 403
- Test WhatsApp : nouveau bulletin disponible → notification WhatsApp envoyée
- Test PWA : installation depuis Chrome mobile → icône écran d'accueil
- Audit responsive 7/7 OK + tap targets 48px + PWA OK
- Commit "chore(emp): bootstrap employé + 4 models + PWA + WhatsApp 7 templates"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 5 fonctions Espace Employé

### PROMPT 1.1 — Tableau de bord personnel

```
Fonction 1.1 : tableau de bord personnel ouvrier/employé.

PROTOTYPE HTML
==============
L'écran screen-emp-dashboard existe. Reproduire en React.

ÉLÉMENTS CLÉS
=============
- Bandeau sticky gradient violet "👋 François · Chef d'équipe coffrage" +
  chip "🏗 Pont Mfoundi"
- Salutation "Bonjour François · Vendredi 9 mai 2026 · 07:14 · ☀ 26° ·
  jour 18 de la semaine de paie"
- **CTA principal violet** "💰 Nouveau bulletin de paie disponible · Avril
  2026 · net 142 480 FCFA · viré sur Afriland le 02/05" avec bouton 52px
  "Voir →"
- KPIs (Salaire net avril 142,5 K, Congés restants 18 j vert, Heures sup
  avril 22 h, Ancienneté 8 ans)
- 4 actions rapides (Télécharger bulletin, Demander congé, Mes heures du mois,
  Mes documents)
- Section "Mon chantier · Pont Mfoundi" : card avec icône, libellé, dates,
  progress 62% violet, infos DTrav/CC/équipe
- Section "Mon équipe coffrage (14 ouvriers · 13 présents)" : liste 4 lignes
  avec présences (Joseph présent 06:48, Marcel présent 07:02, Pierre absent
  RDV CNPS, +11 autres) - cette section visible uniquement pour les chefs
  d'équipe (teamLeader=true)

API
===
- GET /api/emp/dashboard
  → mes infos (salaire dernier, congés solde, heures sup mois, ancienneté)
  → mon chantier (si assigné)
  → mon équipe (si teamLeader)
- GET /api/emp/payslips/latest (dernière fiche dispo)
- GET /api/emp/notifications

COMPOSANTS src/components/emp/dashboard/
==========================================
- EmpHeaderBanner.tsx (gradient violet + nom + position + chantier)
- EmpGreeting.tsx
- LatestPayslipCallToAction.tsx (CTA violet gradient)
- EmpKpiRow.tsx (4 KPIs personnels)
- QuickActionsGrid.tsx (4 cards tactiles)
- MyConstructionSiteCard.tsx (info chantier + DTrav + CC)
- MyTeamList.tsx (visible seulement si teamLeader=true)

⚠️ RESPONSIVE
==============
- Tous boutons 48px minimum
- KPIs 4 col → 2x2 → 1 col
- Actions rapides grille auto-fit minmax(160px,1fr)
- Items équipe 68px hauteur

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /emp
  pnpm exec tsx scripts/audit-tap-targets.ts /emp --min=48

LIVRABLES
=========
- Code complet
- Test : François se connecte sur mobile → dashboard avec CTA paie + son équipe
- Test : Pauline (employée bureau, pas chef équipe) → dashboard sans section équipe
- Test PWA : ajout à l'écran d'accueil iOS/Android
- Audit responsive + tap targets + PWA OK
- Commit "feat(emp): tableau de bord personnel + équipe si chef — fn 1.1"
```

---

### PROMPT 1.2 — Mes bulletins de paie

```
Fonction 1.2 : historique et téléchargement des bulletins.

PROTOTYPE HTML
==============
L'écran screen-emp-paie existe. Reproduire avec :
- Header "Historique de mes bulletins · 2026 · 4 bulletins disponibles · cumul
  net 528 480 FCFA"
- Section "⭐ Dernier bulletin · avril 2026" : card avec border-left violet,
  fond gradient, statut "Payé" vert
- **Détails 3 chiffres** dans cards : Salaire brut 218 400 FCFA, Cotisations
  -58 920 FCFA (CNPS + IRPP), **Net à payer 142 480 FCFA** sur card gradient
  violet
- Section "Composantes brut" dans card blanche avec lignes (Base 160h 170 000,
  Heures sup 22h × 125% 29 400, Prime ancienneté 8 ans 12 000, Indemnité
  transport 7 000, **Total brut 218 400**)
- **2 boutons d'action** 48px (📥 Télécharger PDF, 💬 Partager WhatsApp)
- Section "Historique 2026" : 4 lignes (Avril 142 480, Mars 130 200, Février
  128 400, Janvier 127 400) avec icône mois en cercle violet
- Section "Justificatifs CNPS" : 2 lignes (Attestation 2025 complet, Cumul 2024)

WORKFLOW MÉTIER
================

**Cycle d'un bulletin** :
1. RH (Sandrine) calcule la paie en fin de mois (utilise heures de TimeReport)
2. PaySlip généré en DRAFT
3. Validation par DAF (Marie) → status VALIDATED
4. Virement bancaire effectué → status PAID + paymentDate + paymentReference
5. Notification WhatsApp envoyée à François avec lien sécurisé vers PDF
6. François consulte son bulletin sur mobile

**Calcul des composantes (réglementaire Cameroun)** :
- Salaire base : 170 000 FCFA × jours travaillés / 22
- Heures sup 125% (soir 18h-22h) : taux horaire × 1,25
- Heures sup 150% (nuit 22h-6h) : taux horaire × 1,50
- Heures sup 200% (dimanche/férié) : taux horaire × 2,00
- Prime ancienneté : 1 500 FCFA × année (max 25 ans)
- Indemnité transport : forfait 7 000 FCFA si > 5 km du chantier
- CNPS salarié : 4,2% du brut plafonné 750 000 FCFA
- IRPP : barème progressif Cameroun

**Partage WhatsApp** :
- Bouton génère un lien temporaire signé (24h)
- Format message : "Mon bulletin de paie {mois} - {montant} FCFA - {lien}"
- François peut le forwarder à sa femme Esther par exemple

API
===
- GET /api/emp/payslips (liste de MES bulletins uniquement)
- GET /api/emp/payslips/:id (détail si owner)
- GET /api/emp/payslips/:id/pdf (génère PDF à la volée si pas en cache)
- POST /api/emp/payslips/:id/share-whatsapp (génère lien signé 24h + envoi)
- GET /api/emp/cnps/attestation?year= (attestation cumul CNPS)

COMPOSANTS src/components/emp/paie/
=====================================
- PayslipsHeader.tsx
- LatestPayslipCard.tsx ⚠️ CRITIQUE — card focus dernier bulletin
- GrossComponentsBreakdown.tsx (4 lignes + total)
- PayslipActionsRow.tsx (PDF + WhatsApp)
- PayslipsHistoryList.tsx (4 lignes mensuelles)
- CnpsAttestationsList.tsx
- WhatsAppShareModal.tsx (avec preview du lien)

⚠️ RESPONSIVE
==============
- Card dernier bulletin : structure verticale mobile, chiffres empilés
- Boutons actions : flex 1 chacun 48px mobile
- Items historique : 68px avec icône mois 44×44

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /emp/paie
  pnpm exec tsx scripts/audit-tap-targets.ts /emp/paie --min=48

LIVRABLES
=========
- Code complet avec génération PDF React-PDF reproduisant le bulletin ENSAH
  pixel-perfect (codes A001-A072 SYSCOHADA)
- Test : François télécharge PDF avril → s'ouvre dans visionneuse
- Test : François partage WhatsApp → message envoyé avec lien signé 24h
- Test RBAC : François tente d'accéder PaySlip de Marcel → 403
- Test : génération attestation CNPS 2025 complet
- Audit responsive + tap targets OK
- Commit "feat(emp): bulletins de paie + PDF + WhatsApp + CNPS — fn 1.2"
```

---

### PROMPT 1.3 — Mes congés

```
Fonction 1.3 : gestion des demandes de congés et soldes.

PROTOTYPE HTML
==============
L'écran screen-emp-conges existe. Reproduire avec :
- Header "Mes congés 2026 · Acquis 30 j · pris 12 j · restants 18 j"
- KPIs (Congés payés 18 j vert, Récupérations 3 j, Pris cette année 12 j,
  Maladie 2 j)
- **CTA gradient violet 56px sticky** "➕ Demander un congé"
- Section "⏳ Demande en cours" : card border-left ambré, statut En attente,
  dates lundi 26/05 au vendredi 30/05, "demandé il y a 3 jours · validation
  Jean KAMGA · délai max 5 j ouvrés", bouton "Annuler la demande"
- Section "Historique de mes congés" : 4 lignes (Tabaski 17-18/06 validé,
  Pâques 31/03-04/04 pris, Maladie 12-13/02 certificat fourni, Fête travail
  01/05 férié) avec statuts colorés
- Section "Mon équipe absente cette semaine" : 1 ligne Pierre ELOUNDOU RDV CNPS

WORKFLOW MÉTIER
================

**Cycle d'une demande** :
1. François tape "Demander un congé" → wizard 3 étapes :
   - **Étape 1 · Type** : Congés payés / Récupération / Maladie / Événement
     familial / Sans solde
   - **Étape 2 · Dates** : Du... au... (calcul automatique du nombre de jours
     ouvrés excluant dimanches et fériés camerounais : 1 mai, 20 mai fête de
     l'unité, Tabaski selon calendrier lunaire, etc.)
   - **Étape 3 · Justificatif** : Optionnel sauf maladie (certificat obligatoire)
2. Demande créée en status PENDING
3. **Notification au validateur** :
   - Pour ouvriers : Chef de Chantier (Jean KAMGA via WhatsApp)
   - Pour employés bureau : Manager direct
4. Validateur a 5 jours ouvrés pour répondre (sinon escalade RH)
5. APPROVED : LeaveBalance débitée, calendrier équipe mis à jour, notification
   WhatsApp à François
6. REJECTED : avec raison obligatoire, possibilité de re-soumettre

**Soldes** :
- 30 jours/an de congés payés (réglementaire Cameroun, +1 jour ouvrable par
  période de 5 ans à partir de la 5e année)
- Récupération heures sup : 1h sup = 1h récup (en plus de la majoration)
- Maladie : jusqu'à 6 mois avec certificat (couverture CNPS)
- Sans solde : possible avec accord RH

**Calendrier équipe** :
- François voit ses 14 ouvriers et leurs absences
- Pour éviter trop d'absences simultanées (max 20% de l'équipe)
- Notifications croisées : si Joseph demande congé et que François a déjà
  approuvé Marcel pour les mêmes dates, alerte conflit planning

API
===
- GET /api/emp/leaves/balance?year=2026
- GET /api/emp/leaves/my-requests (mes demandes)
- POST /api/emp/leaves/requests (création demande)
- POST /api/emp/leaves/requests/:id/cancel
- POST /api/emp/leaves/requests/:id/justification (upload doc)
- GET /api/emp/leaves/team-calendar (mon équipe si teamLeader)
- GET /api/emp/leaves/holidays-cameroon?year=2026 (jours fériés CM)

COMPOSANTS src/components/emp/conges/
=======================================
- LeavesBalanceKpis.tsx (4 KPIs soldes)
- RequestLeaveButton.tsx (CTA sticky 56px)
- NewLeaveRequestWizard.tsx (3 étapes)
  - Step1TypeSelection.tsx
  - Step2DatesPicker.tsx (avec fériés CM)
  - Step3JustificationUpload.tsx
- PendingLeaveRequestCard.tsx (avec bouton annuler)
- LeaveHistoryList.tsx (avec statuts colorés)
- TeamAbsenceList.tsx (si teamLeader)

⚠️ RESPONSIVE
==============
- KPIs : 4 col → 2x2 → 1 col
- CTA sticky bottom mobile, intégré mobile-first
- Wizard 3 étapes : stepper vertical mobile
- DatePicker : composant mobile-friendly

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /emp/conges
  pnpm exec tsx scripts/audit-tap-targets.ts /emp/conges --min=48

LIVRABLES
=========
- Code complet
- Test : François demande 5 jours du 26/05 au 30/05 → notification WhatsApp
  Jean KAMGA → Jean valide → notification WhatsApp François
- Test : François tente demande > solde restant (20 jours) → erreur "Solde
  insuffisant : 18 j disponibles"
- Test : maladie sans certificat → blocage "Certificat médical obligatoire"
- Test calendrier fériés : 20/05 (Fête Unité) automatiquement décompté
- Audit responsive + tap targets OK
- Commit "feat(emp): demandes congés + soldes + workflow WhatsApp — fn 1.3"
```

---

### PROMPT 1.4 — Mon pointage et mes heures

```
Fonction 1.4 : visualisation du pointage personnel et signalement désaccord.

PROTOTYPE HTML
==============
L'écran screen-emp-pointage existe. Reproduire avec :
- Header "Mon temps de travail · Mai 2026 (jour 9 / 31) · pointé par
  Jean KAMGA · synchronisé à 06:48"
- **Card "Aujourd'hui"** : border-left vert, fond gradient vert clair, "⏰
  Pointé présent à 06:48", chip "En poste", grille 2 col (Arrivée 06:48,
  Pause prévue 12:00 · 1h)
- KPIs mai (Heures travaillées 48 h, Heures sup 4 h vert, Retards 0, Absences 0 j)
- Section "Cette semaine (semaine 19)" : 5 lignes (Lundi 06:52-17:28 9,6h
  +1h sup, Mardi 06:45-16:30 8,75h standard, Mercredi 06:48-18:12 10,4h +2h
  sup, Jeudi 06:50-17:32 9,7h +1h sup, **Vendredi en cours** sur fond violet)
- Section "⚠ Vous constatez un désaccord ?" : card fond ambré avec texte
  explicatif et bouton 48px "📝 Signaler un désaccord"

WORKFLOW MÉTIER
================

**Le pointage est fait par le Chef de Chantier (Jean KAMGA)** :
- Pour les ouvriers, l'employé NE POINTE PAS lui-même
- Jean KAMGA pointe les présences à 7h chaque matin (fonction CC déjà
  développée)
- Le départ est pointé en fin de poste
- Les heures sup sont validées au moment de leur exécution par Jean

**François consulte ses pointages** :
- Il voit ses heures jour par jour
- Total semaine + total mois
- Décomposition heures normales / heures sup avec type (125%/150%/200%)
- Synchronisation toutes les heures avec les TimeReport de Jean

**Signalement désaccord** :
1. François consulte mardi 6 mai et constate "départ 16:30" alors qu'il
   pense être parti à 17h30
2. Il tape "Signaler un désaccord" → formulaire avec :
   - Date concernée
   - Type (arrivée incorrecte / départ incorrect / heures sup non comptées /
     absence injustifiée erronée)
   - Heure réelle selon lui
   - Justification (témoignage collègue, sortie magasin documentée, etc.)
3. Notification à Jean KAMGA (WhatsApp)
4. Jean revoit son pointage, peut corriger ou maintenir
5. Si maintenu et François pas d'accord, escalade DTrav (Paul ETOUNDI)
6. Délai de signalement : 48h après pointage, sinon clôturé

**Pour les employés bureau (badge auto)** :
- L'employé pointe son entrée/sortie via badge à l'accueil bureau
- Synchronisation auto avec TimeReport
- Pas de pointage manuel CC

API
===
- GET /api/emp/timereport/current-month
- GET /api/emp/timereport/week?weekNumber=
- GET /api/emp/timereport/today (statut en temps réel)
- POST /api/emp/timereport/:id/contest (signaler désaccord)
- GET /api/emp/timereport/disputes/my-active

COMPOSANTS src/components/emp/pointage/
=========================================
- TimeReportHeader.tsx
- TodayStatusCard.tsx ⚠️ CRITIQUE — card aujourd'hui temps réel
- TimeKpisRow.tsx (4 KPIs mois)
- WeekDetailList.tsx (5 jours avec icônes L/M/M/J/V)
- ContestDisputeButton.tsx (CTA ambré)
- ContestDisputeForm.tsx (formulaire signalement)
- DisputeResolutionView.tsx (suivi de mes contestations)

⚠️ RESPONSIVE
==============
- Card Aujourd'hui : 2 col Arrivée/Pause → 1 col empilé mobile
- KPIs 4 col → 2x2 → 1 col
- Liste semaine : items 68px avec icône jour 44×44
- Formulaire contestation : champs verticaux mobile

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /emp/pointage
  pnpm exec tsx scripts/audit-tap-targets.ts /emp/pointage --min=48

LIVRABLES
=========
- Code complet
- Test : François consulte sa semaine → 5 jours pointés par Jean affichés
- Test : François signale désaccord mardi départ → notification Jean →
  Jean corrige → François notifié
- Test : signalement après 48h → blocage "Délai dépassé"
- Audit responsive + tap targets OK
- Commit "feat(emp): pointage personnel + contestation — fn 1.4"
```

---

### PROMPT 1.5 — Mon profil et mes documents

```
Fonction 1.5 : fiche personnelle + documents + politiques RH.

PROTOTYPE HTML
==============
L'écran screen-emp-profil existe. Reproduire avec :
- **Carte profil** : avatar 72×72 + nom + matricule + position + ancienneté
  + bouton "Demander modification" (workflow RH)
- Section "Mes informations personnelles" : 7 lignes (Date naissance 14 mars
  1984, CNI CM-AB-12042156, Téléphone +237 6 78 42 18 56, Email pro, Adresse
  Mendong Yaoundé VI, Situation Marié 3 enfants, Contact urgence Esther
  NDONGO + tel)
- Section "Mes informations professionnelles" : 6 lignes (CNPS, NIU DGI,
  Banque Afriland Bastos, RIB, Catégorie 8 échelon 3 grille BTP, Type
  contrat CDI 15/03/2018)
- Section "Mes documents" : 4 documents (Contrat de travail CDI signé 15/03/2018,
  Attestation travail 22/02/2026 valide 3 mois, Certificat sécurité chantier
  expire 12/01/2027, Formation conduite engins 2022)
- Section "Politiques RH BatimCAM" : 3 documents (Règlement intérieur 2026,
  Politique heures supplémentaires, Convention collective BTP Cameroun 2024)

WORKFLOW MÉTIER
================

**Modification d'informations** :
- L'employé NE peut PAS modifier directement ses informations critiques
  (RIB, CNPS, état civil, etc.) car ça impacte la paie
- Il peut **demander une modification** via formulaire
- La demande va à la RH (Sandrine ONANA)
- RH vérifie justificatif (nouveau RIB → attestation bancaire, nouvel adresse
  → quittance, changement état civil → acte mariage, etc.)
- Si validé par RH, mise à jour des données + AuditLog

**Téléchargement de documents** :
- Contrat de travail : PDF signé scanné + signature électronique
- Attestation de travail : générée à la demande, valide 3 mois, mention "Pour
  faire valoir ce que de droit"
- Certificats : formations sécurité, conduite engins, secourisme
- Tous les documents sont dans la GED avec rétention DUA

**Politiques RH** :
- Documents publics consultables par tous les employés
- Versions actuelles seulement (historique géré par GED)
- Notification quand une politique est mise à jour
- Accusé de lecture optionnel pour politiques critiques (sécurité, anti-corruption)

**Alertes proactives** :
- Certificat sécurité expire dans 30j → notification WhatsApp + email
- Renouvellement CNI dans 6 mois → rappel
- Anniversaire d'embauche 1, 5, 10, 15, 20 ans → notification + carte virtuelle

API
===
- GET /api/emp/profile (mes données complètes)
- POST /api/emp/profile/modification-request (demande modif)
- POST /api/emp/profile/photo-update (avatar)
- GET /api/emp/documents (mes documents personnels)
- GET /api/emp/documents/:id/download (lien signé 1h)
- POST /api/emp/documents/work-certificate (génère attestation à la demande)
- GET /api/emp/policies (politiques RH publiques)
- GET /api/emp/policies/:id (lecture + traçage)
- POST /api/emp/policies/:id/acknowledge (accusé de lecture)

COMPOSANTS src/components/emp/profil/
=======================================
- ProfileHeaderCard.tsx (avatar grand + identité + ancienneté)
- ProfilePersonalInfoCard.tsx (7 champs)
- ProfileProfessionalInfoCard.tsx (6 champs)
- ProfileModificationRequestModal.tsx (workflow RH)
- MyDocumentsList.tsx (4 documents personnels)
- RhPoliciesList.tsx (3 politiques + lecture)
- WorkCertificateRequestButton.tsx (génération à la demande)

⚠️ RESPONSIVE
==============
- Carte profil : avatar 72×72 + texte → empilé vertical mobile
- Champs info : structure verticale par défaut
- Documents : items 68px avec icône 44×44 + bouton 📥 32×32 mais cliquable
  zone élargie 48px

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /emp/profil
  pnpm exec tsx scripts/audit-tap-targets.ts /emp/profil --min=48

LIVRABLES
=========
- Code complet
- Test : François tape "Demander modification" → wizard avec choix champ +
  justificatif → notification Sandrine RH
- Test : Sandrine valide modification → données mises à jour + AuditLog +
  notification WhatsApp François
- Test : génération attestation travail à la demande → PDF avec signature
  électronique DG
- Test : lecture politique "Politique heures supplémentaires" → accusé de
  lecture enregistré
- Audit responsive + tap targets OK
- Commit "feat(emp): profil personnel + documents + politiques RH — fn 1.5"
```

---

## ✅ FIN BLOC 1 — Profil Employé/Ouvrier complet

Tu viens de couvrir l'**ensemble du profil Employé/Ouvrier** :
- Bloc 0 : 4 nouveaux/étendus models + 18 nouveaux champs User + PWA + WhatsApp
- Bloc 1 : 5 fonctions (Dashboard, Paie, Congés, Pointage, Profil)

**Total profil Employé : 5 fonctions livrées**

POINTS FORTS DE CE PROFIL
==========================
- **Mobile-first absolu** avec PWA installable
- **WhatsApp Business** 7 templates approuvés (le canal préféré au Cameroun)
- **Multilingue** FR/EN (régions anglophones SW/NW)
- Permissions très restrictives (chaque employé voit UNIQUEMENT ses données)
- Pour les **chefs d'équipe** (teamLeader=true) : consultation équipe en plus
- Calcul de paie SYSCOHADA avec heures sup 125%/150%/200%
- Calendrier fériés Cameroun (20 mai Fête Unité, Tabaski lunaire, etc.)
- Workflow contestation pointage avec délai 48h
- Modification informations critiques via workflow RH

ESTIMATION EFFORT
==================
- Bloc 0 (4 models Prisma + 18 champs User + PWA + 7 templates WhatsApp) : 3-4 jours
- Bloc 1 (5 fonctions simples) : 6-8 jours
- TOTAL : 9-12 jours

INTERACTIONS AVEC AUTRES PROFILS
=================================
- **CC (Jean KAMGA)** : pointe les présences de François (fn 1.4 EMP)
- **RH (Sandrine ONANA)** : valide modifications d'infos personnelles
- **DAF (Marie NGONO)** : valide paie en N2
- **Comptable Chantier (Jacques MBARGA)** : traite virement bancaire
- **GED (Christelle EYENGA)** : archive bulletins selon DUA 5 ans
- **IT (Étienne ONANA)** : crée le compte EMPLOYEE lors de l'embauche

🎉 PROFILS T-ERP COMPLETS · 13 PROFILS LIVRÉS
==============================================

Avec ce dernier profil, **l'ÉCOSYSTÈME T-ERP EST COMPLET** :

```
DIRECTION (8 profils)
├── DG (Albert DAAYANG)
├── DAF (Marie NGONO)
├── DT (Daniel ESSOMBA)
├── RH (Sandrine ONANA)
├── Comptable (3 niveaux : Direction / Chantier / Chantier)
├── Logisticien (Robert ETONDÉ)
├── GED (Christelle EYENGA)
└── IT (Étienne ONANA)

TERRAIN (4 profils + 1 transverse)
├── DTrav (Paul ETOUNDI)
├── CondTrav (Samuel MBARGA)
├── CC PWA (Jean KAMGA)
├── Magasinier PWA (Lucas TIENTCHEU)
└── Employé/Ouvrier PWA (François NDONGO et 440 autres)
```

**Couverture fonctionnelle T-ERP** :
- 106 écrans HTML dans le prototype
- ~75 fonctions développées (5-7 par profil)
- ~80 models Prisma cumulés
- 100% des règles métier BTP Cameroun + SYSCOHADA
- Mobile-first pour 5 profils terrain (CC, MAG, CDT, EMP, partiellement Logisticien)
- PWA offline pour CC + MAG + CDT
- Multi-tenant SaaS avec isolation stricte
- Conformité fiscale Cameroun (NIU, CNPS, DGI e-Tax, SYSCOHADA Révisé 2018)
- Intégrations natives (Afriland, SGBC, BICEC, CNPS, DGI, WhatsApp Business)

🚀 PROCHAINES ÉTAPES POSSIBLES
===============================
Phase 3 : finalisation et préparation au déploiement réel
1. J7 : déploiement Railway/Neon production (déjà en attente du suivi J0-J6)
2. Tests E2E Playwright sur les 75 fonctions
3. Audit sécurité (pénétration, RBAC, OWASP)
4. Documentation utilisateur (vidéos + manuels par profil)
5. Formation des utilisateurs BatimCAM (3 jours par catégorie)
6. Marketing et site terp.cm pour acquisition clients
7. Démo client public (Razel-Bec, Carrière Mfou)
```
