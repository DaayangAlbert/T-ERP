# SECRÉTAIRE GÉNÉRAL · DÉVELOPPEMENT — Bloc 0 + Bloc 1

**Profil cible :** Secrétaire Général (Élisabeth NDONGMO · juriste de formation ·
48 ans · 8 ans BatimCAM · Master Droit Affaires Université Yaoundé II)

**Position hiérarchique :** rapporte directement au DG (Albert DAAYANG). Bras
droit administratif et juridique de la Direction. Pas d'autorité hiérarchique
formelle sur d'autres profils, mais autorité fonctionnelle sur les sujets
corporate (gouvernance, juridique, conformité, courriers officiels).

**Position dans l'organigramme** : niveau cadre dirigeant. Accès Confidentiel-
Direction. Reconnue dans les milieux institutionnels camerounais (réseau MINTP,
ordre des avocats, chambre de commerce Yaoundé, GICAM).

**Architecture RBAC** : `role: SECRETARY_GENERAL` + `assignedSiteIds: []`
(siège uniquement) + 5 flags spéciaux SG :
- `canManageCorporateGovernance: true` (CA, AG, registres)
- `canManageMarketContracts: true` (marchés clients, avenants, garanties)
- `canManageLegalCases: true` (contentieux, dossiers avocats)
- `canManageOfficialCorrespondence: true` (courriers signés DG)
- `canReadAllDashboards: true` (lecture seule autres directions)

**Pas de PWA** : profil bureau au siège uniquement. Responsive standard
desktop (40-44px tap targets), tableaux denses acceptés.

---

## ⚠️ POSITIONNEMENT DISTINCT DES AUTRES PROFILS

Le SG occupe un **espace bien spécifique** centré sur la gouvernance, le juridique,
le corporate et l'institutionnel. À ne pas confondre avec :

| Domaine | Profil responsable | Périmètre du SG |
|---------|-------------------|------------------|
| Contrats fournisseurs / sous-traitants | DAF + Logisticien | SG gère contrats **clients** (marchés MOA) |
| Recrutement / RH opérationnel | RH (Sandrine ONANA) | SG gère **gouvernance** (CA, AG, statuts) |
| Documents techniques chantier | GED (Christelle EYENGA) | SG gère documents **corporate** (statuts, PV, RC) |
| Comptabilité fiscale | Comptable | SG suit obligations **non-fiscales** (RC, agréments) |
| IT / sécurité données | Informaticien (Étienne) | SG gère **confidentialité juridique** (NDA, accords) |
| Validations N2 / signatures | DG (Albert) | SG **prépare** dossiers et **conserve** originaux |

---

## ⚠️ SPÉCIFICITÉS RÉGLEMENTAIRES (BatimCAM SA OHADA)

Le SG gère les obligations spécifiques aux Sociétés Anonymes camerounaises
sous Acte Uniforme OHADA :

- **CA d'au moins 3 administrateurs** (BatimCAM en a 9)
- **Commissaire aux comptes obligatoire** (Cabinet KPMG Cameroun mandat 2024-2029)
- **AG annuelle dans les 6 mois après clôture** (BatimCAM clôture 31/12 → AG avant 30/06)
- **Publication au journal d'annonces légales** pour modifications statutaires
- **Capital social libéré 100 %** (BatimCAM 500 M FCFA · 50 000 actions × 10 000)
- **Registres légaux** : AG, CA, actionnaires, personnel, HSE, conventions
  réglementées, cautions, marchés publics

---

## ⚠️ PROTOCOLE RESPONSIVE

Profil bureau au siège. Tap targets standards 40-44px. Tableaux denses acceptés.

```bash
pnpm exec tsx scripts/audit-responsive.ts /sg/<route>
```

Format commit : "✅ Audit : 7/7 responsive OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE SECRÉTAIRE GÉNÉRAL

```
Phase de développement du profil Secrétaire Général (Élisabeth NDONGMO).

CONTEXTE
========
- Le prototype HTML contient 7 écrans Espace SG :
  screen-sg-dashboard, screen-sg-marches, screen-sg-ca-ag,
  screen-sg-contentieux, screen-sg-conformite, screen-sg-institutionnel,
  screen-sg-courriers
- Tous ont les attributs data-rh-screen + data-sg-screen
- Élisabeth NDONGMO : role=SECRETARY_GENERAL · juriste · 8 ans BatimCAM
- assignedSiteIds=[] (pas de chantier · siège uniquement)
- Elle rapporte au DG (Albert DAAYANG)
- Profil CADRE DIRIGEANT côté client : confidentialité direction

CONVENTIONS
============
- Écrans prototype : id="screen-sg-<fonction>"
- Pages Next.js : src/app/(app)/sg/<fonction>/page.tsx
- Composants : src/components/sg/<NomFonction>.tsx
- API routes : src/app/api/sg/<fonction>/route.ts
- Hooks : src/hooks/useSg<Fonction>.ts

TÂCHES PRÉPARATOIRES
====================

1. Étendre l'enum Role :
   enum Role { ... SECRETARY_GENERAL }

2. Étendre le User model avec pouvoirs spéciaux SG :
   model User {
     ...
     canManageCorporateGovernance    Boolean @default(false)
     canManageMarketContracts        Boolean @default(false)
     canManageLegalCases             Boolean @default(false)
     canManageOfficialCorrespondence Boolean @default(false)
     canReadAllDashboards            Boolean @default(false)
   }

3. Créer le layout dédié src/app/(app)/sg/layout.tsx :
   - Vérifie Role.SECRETARY_GENERAL (sinon redirect /dashboard)
   - Charge le SgContext avec compteurs (marchés, CA, contentieux, courriers)
   - Vérifie MFA actif (sinon redirect /mfa/setup) — obligatoire pour SG
   - Wrap children dans <div data-sg-screen data-rh-screen className="rh-page">

4. Étendre Prisma — 11 nouveaux models corporate :

   model ClientContract {
     id              String   @id @default(cuid())
     tenantId        String
     reference       String   @unique  // "M-2026-001"
     title           String
     contractingAuthority String  // "Commune Yaoundé I"
     authorityType   ContractingAuthorityType
     amountHT        BigInt
     currency        String   @default("XAF")
     vatRate         Float    @default(19.25)
     phase           ContractPhase
     callForTendersOpenDate DateTime?
     callForTendersCloseDate DateTime?
     submissionDate  DateTime?
     notificationDate DateTime?
     signatureDate   DateTime?
     orderServiceDate DateTime?
     executionStartDate DateTime?
     receptionPV     DateTime?
     gpaEndDate      DateTime?
     siteId          String?
     site            Site?    @relation(fields: [siteId], references: [id])
     amendments      ContractAmendment[]
     bankGuarantees  BankGuarantee[]
     legalCases      LegalCase[]
     callForTendersDocUrl String?
     submissionDocUrl String?
     signedContractDocUrl String?
     receptionPvDocUrl String?
     submissionGuaranteeAmount BigInt?
     performanceGuaranteeAmount BigInt?
     retentionGuaranteeAmount BigInt?
     legalStatus     LegalContractStatus
     status          ContractStatus
     createdBy       String
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   enum ContractingAuthorityType {
     PUBLIC_MINISTRY PUBLIC_MUNICIPALITY PUBLIC_INSTITUTION
     PRIVATE_COMPANY PRIVATE_INDIVIDUAL
   }
   enum ContractPhase {
     CALL_FOR_TENDERS_WATCH STUDY_AND_SUBMISSION AWAITING_ATTRIBUTION
     CONTRACT_SIGNATURE ORDER_SERVICE EXECUTION RECEPTION
     GUARANTEE_PERIOD CLOSED
   }
   enum LegalContractStatus { OK LITIGATION AMENDMENT_PENDING EXPIRED_GUARANTEE }
   enum ContractStatus { DRAFT PUBLISHED ACTIVE PAUSED CLOSED CANCELLED }

   model ContractAmendment {
     id              String   @id @default(cuid())
     contractId      String
     contract        ClientContract @relation(fields: [contractId], references: [id])
     amendmentNumber Int
     reason          String   @db.Text
     additionalAmount BigInt
     additionalDelayDays Int?
     submittedAt     DateTime?
     approvedAt      DateTime?
     signedAt        DateTime?
     status          AmendmentStatus
     documentUrl     String?
   }
   enum AmendmentStatus { DRAFT SUBMITTED APPROVED SIGNED REJECTED }

   model BankGuarantee {
     id              String   @id @default(cuid())
     contractId      String
     contract        ClientContract @relation(fields: [contractId], references: [id])
     type            GuaranteeType
     amount          BigInt
     issuingBank     String
     issuedAt        DateTime
     expiryDate      DateTime
     releaseDate     DateTime?
     status          GuaranteeStatus
     documentUrl     String?
   }
   enum GuaranteeType { SUBMISSION PERFORMANCE RETENTION ADVANCE_PAYMENT }
   enum GuaranteeStatus { ACTIVE EXPIRED RELEASED REVOKED }

   model GovernanceMeeting {
     id              String   @id @default(cuid())
     tenantId        String
     type            MeetingType
     scheduledAt     DateTime
     location        String
     convocationsSentAt DateTime?
     convocationsRecipients Json
     agenda          Json
     agendaApprovedBy String?
     agendaApprovedAt DateTime?
     status          MeetingStatus
     attendees       Json?
     quorum          Float?
     pvDocumentUrl   String?
     pvSignedAt      DateTime?
     pvSignedBy      String?
     decisions       MeetingDecision[]
   }
   enum MeetingType { BOARD_MEETING ORDINARY_AG EXTRAORDINARY_AG }
   enum MeetingStatus { SCHEDULED IN_PROGRESS COMPLETED CANCELLED POSTPONED }

   model MeetingDecision {
     id              String   @id @default(cuid())
     meetingId       String
     meeting         GovernanceMeeting @relation(fields: [meetingId], references: [id])
     decisionNumber  Int
     title           String
     description     String   @db.Text
     decisionType    DecisionType
     votingResult    Json?
     followUpUserId  String?
     followUpStatus  String?
     decidedAt       DateTime
   }
   enum DecisionType { APPROVAL RATIFICATION AUTHORIZATION NOMINATION REVOCATION OTHER }

   model BoardMember {
     id              String   @id @default(cuid())
     tenantId        String
     userId          String?
     user            User?    @relation(fields: [userId], references: [id])
     fullName        String
     function        BoardMemberFunction
     representingEntity String?
     isIndependent   Boolean  @default(false)
     mandateStartDate DateTime
     mandateEndDate  DateTime
     mandateRenewable Boolean @default(true)
     biography       String?  @db.Text
     status          BoardMemberStatus
   }
   enum BoardMemberFunction {
     PRESIDENT_CEO PRESIDENT_BOARD DIRECTOR_GENERAL
     ADMINISTRATOR INDEPENDENT_DIRECTOR BOARD_SECRETARY
   }
   enum BoardMemberStatus { ACTIVE EXPIRED RESIGNED REVOKED DECEASED }

   model Shareholder {
     id              String   @id @default(cuid())
     tenantId        String
     fullName        String
     entityType      ShareholderEntityType
     numberOfShares  Int
     totalShares     Int
     percentage      Float
     nationality     String?
     idNumber        String?
     address         String?
     phoneEmail      String?
     acquisitionDate DateTime
     acquisitionPrice BigInt?
     status          ShareholderStatus
     isVoting        Boolean  @default(true)
   }
   enum ShareholderEntityType { INDIVIDUAL CORPORATION INVESTMENT_FUND EMPLOYEE_PLAN }
   enum ShareholderStatus { ACTIVE TRANSFERRED INHERITED DECEASED }

   model LegalCase {
     id              String   @id @default(cuid())
     tenantId        String
     reference       String   @unique
     title           String
     description     String   @db.Text
     ourPosition     LegalPosition
     jurisdiction    String
     caseNumber      String?
     opposingParty   String
     opposingPartyType ContractingAuthorityType?
     amountAtStake   BigInt
     provisionAmount BigInt
     lawyerName      String
     lawFirm         String
     lawyerContactInfo Json?
     status          LegalCaseStatus
     nextHearingDate DateTime?
     strategy        String?  @db.Text
     relatedContractId String?
     relatedContract   ClientContract? @relation(fields: [relatedContractId], references: [id])
     events          LegalCaseEvent[]
     openedAt        DateTime @default(now())
     closedAt        DateTime?
     resolution      String?
   }
   enum LegalPosition { DEMANDEUR DEFENDEUR MEDIATION ARBITRATION }
   enum LegalCaseStatus {
     OPEN MEDIATION COURT_PENDING APPEAL SUPREME_COURT
     SETTLED WON LOST ABANDONED
   }

   model LegalCaseEvent {
     id              String   @id @default(cuid())
     caseId          String
     case            LegalCase @relation(fields: [caseId], references: [id])
     eventType       String
     eventDate       DateTime
     description     String   @db.Text
     documentUrl     String?
   }

   model RegulatoryRegister {
     id              String   @id @default(cuid())
     tenantId        String
     registerType    RegisterType
     name            String
     description     String?
     legalBasis      String
     responsibleUserId String
     responsibleUser User     @relation(fields: [responsibleUserId], references: [id])
     entriesCount    Int      @default(0)
     lastEntryDate   DateTime?
     status          RegisterStatus
     nextReviewDate  DateTime
   }
   enum RegisterType {
     AG_DECISIONS SHAREHOLDERS BOARD_DECISIONS PERSONNEL
     HSE_SITES REGULATED_AGREEMENTS BANK_GUARANTEES PUBLIC_MARKETS
   }
   enum RegisterStatus { UP_TO_DATE TO_UPDATE OVERDUE }

   model OfficialCorrespondence {
     id              String   @id @default(cuid())
     tenantId        String
     reference       String   @unique
     direction       CorrespondenceDirection
     date            DateTime
     correspondentName String
     correspondentEntity String?
     subject         String
     summary         String?  @db.Text
     confidentiality CorrespondenceConfidentiality
     assignedToUserId String?
     assignedTo       User?    @relation(fields: [assignedToUserId], references: [id])
     status          CorrespondenceStatus
     dueDate         DateTime?
     handledAt       DateTime?
     requiresDgSignature Boolean @default(false)
     submittedToDgAt DateTime?
     signedByDgAt    DateTime?
     dgSignatureRef  String?
     documentUrl     String?
     archivedInGedAt DateTime?
   }
   enum CorrespondenceDirection { INCOMING OUTGOING }
   enum CorrespondenceConfidentiality { PUBLIC STANDARD SENSITIVE CONFIDENTIAL }
   enum CorrespondenceStatus {
     RECEIVED IN_PROGRESS AWAITING_DG_SIGNATURE
     SIGNED SENT ARCHIVED
   }

   model Institution {
     id              String   @id @default(cuid())
     tenantId        String
     name            String
     type            InstitutionType
     category        InstitutionCategory
     primaryContactName String?
     primaryContactRole String?
     primaryContactPhone String?
     primaryContactEmail String?
     address         String?
     website         String?
     relationshipStatus RelationshipStatus
     relationshipNotes String? @db.Text
   }
   enum InstitutionType {
     MINISTRY MUNICIPALITY PUBLIC_INSTITUTION PROFESSIONAL_ASSOCIATION
     LAW_FIRM AUDIT_FIRM BANK OTHER
   }
   enum InstitutionCategory { CLIENT REGULATORY ASSOCIATION SUPPLIER PARTNER }
   enum RelationshipStatus { ACTIVE WATCH SENSITIVE INACTIVE }

   model ProfessionalApproval {
     id              String   @id @default(cuid())
     tenantId        String
     approvalName    String
     deliveringAuthority String
     approvalNumber  String
     issuedAt        DateTime
     expiresAt       DateTime
     renewable       Boolean  @default(true)
     status          ApprovalStatus
     documentUrl     String?
     renewalReminderSent Boolean @default(false)
   }
   enum ApprovalStatus { VALID EXPIRING_SOON EXPIRED RENEWED }

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec 11 nouveaux models corporate
- User étendu avec 5 nouveaux flags SG
- Layout SG protégé par rôle SECRETARY_GENERAL + MFA obligatoire
- Logique RBAC : Élisabeth a accès lecture aux dashboards DAF/DT/RH mais
  pas en écriture
- Seed : ClientContract pour les 23 marchés BatimCAM + 8 AO en cours
- Seed : 9 BoardMember (Albert PCA-DG + 8 administrateurs)
- Seed : 8 Shareholder (capital social 500 M FCFA)
- Seed : 4 LegalCase actifs (provisions 42 M FCFA)
- Seed : 8 RegulatoryRegister (tous à jour sauf conventions réglementées)
- Seed : 142 Institution (8 ministères, 4 communes, 6 associations,
  3 cabinets avocats, 5 banques)
- Seed : 3 ProfessionalApproval (Agrément BTP cat. 4, AEP, ouvrages d'art)
- Seed : 684 OfficialCorrespondence YTD
- Seed : Élisabeth NDONGMO elisabeth@batimcam.cm / Demo2026! avec MFA actif
- Test : Élisabeth se connecte (avec OTP) → dashboard SG
- Test RBAC : Élisabeth tente d'accéder à /rh/payroll → 403
- Test RBAC : Élisabeth tente de modifier une écriture comptable → 403
- Test RBAC : Élisabeth peut lire le dashboard DAF en mode lecture
- Audit responsive 7/7 OK
- Commit "chore(sg): bootstrap secrétaire général + 11 models corporate + RBAC"

Une fois validé, attends le prompt 1.1.
```

---

## 🟪 BLOC 1 — 7 fonctions Espace Secrétaire Général

### PROMPT 1.1 — Tableau de bord SG

```
Fonction 1.1 : tableau de bord gouvernance et juridique.

PROTOTYPE HTML
==============
screen-sg-dashboard. Reproduire avec :
- Bandeau gradient violet "Gouvernance · Juridique · Affaires institutionnelles"
  + badge vert "Tous registres à jour"
- Salutation "Bonjour Élisabeth · 14 marchés en cours · 5 contentieux actifs ·
  prochain CA dans 23 jours · 3 alertes conformité"
- KPIs (Marchés en cours 14 + 4,2 Md, Prochain CA 23j ambré, Contentieux 5 rouge
  + provisions 82 M, Conformité 3 avec triangle)
- **Alertes prioritaires** : 5 alertes hiérarchisées avec border-left coloré
  (Renouvellement Agrément BTP, Contentieux Yaoundé III, CA semestriel OdJ,
  AG ordinaire exercice 2025, Garantie SGBC à anticiper)
- **Section "Vie sociale BatimCAM SA"** : 3 cards
  · Capital social 500 M FCFA · 50 000 actions × 10 000 · libéré 100 %
  · Actionnariat : Albert 42 %, Famille 28 %, SOFICAM SA 18 %, Cadres 12 %
  · Conseil d'Administration : 9 administrateurs · mandats 3 ans · CAC KPMG

API
===
- GET /api/sg/dashboard
  → KPIs (contracts, governance, legal cases, compliance)
  → alertes prioritaires
  → structure capital + actionnariat + CA composition
- GET /api/sg/dashboard/capital-structure
- GET /api/sg/dashboard/official-calendar

COMPOSANTS src/components/sg/dashboard/
=========================================
- SgHeaderBanner.tsx (gradient + badge global compliance)
- SgGreeting.tsx
- SgKpiRow.tsx (4 KPIs gouvernance)
- PriorityAlertsList.tsx (5 alertes hiérarchisées avec actions)
- CapitalStructureCard.tsx (capital + actionnaires + CA)
- OfficialCalendarCard.tsx (5 échéances proches)

⚠️ RESPONSIVE
==============
- KPIs : 4 col → 2x2 → 1 col
- 3 cards Vie sociale : 3 col → 1 col empilé < 1024px
- Alertes : structure responsive avec icônes proportionnelles

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg

LIVRABLES
=========
- Code complet
- Test : Élisabeth se connecte → dashboard avec 5 alertes + capital + CA
- Test : tap "Traiter" sur Agrément BTP → drawer wizard renouvellement
- Test : tap actionnaire → drawer fiche actionnaire détaillée
- Audit responsive 7/7 OK
- Commit "feat(sg): tableau de bord gouvernance — fn 1.1"
```

### PROMPT 1.2 — Marchés et contrats clients

```
Fonction 1.2 : cycle commercial complet depuis AO jusqu'à GPA.

PROTOTYPE HTML
==============
screen-sg-marches. Reproduire avec :
- Header "14 marchés en cours · 4,2 Md FCFA HT portefeuille · 8 AO en cours ·
  23 archives"
- KPIs (Marchés en cours 14, AO ouverts 8 ambré, Taux réussite YTD 42% vert,
  Garanties bancaires 240 M)
- Onglets phases (Marchés actifs 14, Appels d'offres 8, En soumission 3,
  Archives 23)
- Filtres (Recherche, Type MOA, Phase, Montant HT)
- Tableau marchés avec colonnes : Référence, Intitulé, MOA, Montant HT, Phase
  chip, Garanties (banque), Statut
- **Section "Appels d'offres en cours de réponse"** : 3 cards d'AO en cours
  (MINTP Route Bafoussam-Bamenda, Commune Douala 5, MINEDUB 6 écoles primaires)

WORKFLOW MÉTIER (cycle 8 phases)
=================================

**Phase 1 · Veille AO** :
- Élisabeth surveille les portails publics (PRC, COLEAD, journaux officiels)
- Détection automatique des AO via mots-clés configurés
- Création ClientContract en status DRAFT + phase CALL_FOR_TENDERS_WATCH

**Phase 2 · Étude et soumission** :
- Élisabeth informe le DT (Daniel ESSOMBA) qui pilote l'étude technique
- DAF (Marie NGONO) calcule la rentabilité prévisionnelle
- Élisabeth prépare le dossier administratif (caution soumission 1-2 %,
  agréments, pièces obligatoires)
- Approbation DG avant dépôt
- ClientContract passe en phase STUDY_AND_SUBMISSION

**Phase 3 · Attribution** :
- Si attribution → notification MOA → ClientContract passe en CONTRACT_SIGNATURE
- Si rejet → analyse retours pour amélioration future
- Si annulation AO → archive avec motif

**Phase 4 · Signature contrat** :
- Élisabeth prépare l'exemplaire contractuel
- Émission caution bonne exécution 5-10 % (BankGuarantee créée)
- Signature DG + cachet
- Notification au DT pour préparation chantier

**Phase 5 · Ordre de service (OS)** :
- Reçu de la MOA · démarrage officiel des travaux
- DT informe DTrav + CondTrav pour mise en chantier
- Création/liaison du Site dans T-ERP

**Phase 6 · Exécution** :
- Suivi quotidien par DT et CondTrav
- Élisabeth gère les avenants (ContractAmendment) si nécessaires
- Décompte mensuel/trimestriel coordonné avec DAF

**Phase 7 · Réception** :
- PV de réception provisoire (puis définitive 11 mois après)
- Levée caution bonne exécution
- Constitution retenue de garantie 10 % (BankGuarantee)

**Phase 8 · Garantie Parfait Achèvement (1 an)** :
- Suivi des éventuelles malfaçons signalées par MOA
- À la fin de la GPA, levée retenue de garantie

**Gestion avenants** :
- Avenant 1, 2, 3... avec ContractAmendment
- Justification écrite obligatoire
- Approbation MOA obligatoire pour marchés publics
- Impact sur Site (budget révisé) et DAF (encaissements)

API
===
- GET /api/sg/contracts?phase=&moaType=&minAmount=&year=
- GET /api/sg/contracts/:id (détail complet avec avenants + garanties)
- POST /api/sg/contracts (nouveau contrat)
- PATCH /api/sg/contracts/:id (modification)
- POST /api/sg/contracts/:id/transition-phase
- POST /api/sg/contracts/:id/amendments (créer avenant)
- POST /api/sg/contracts/:id/guarantees (créer garantie bancaire)
- POST /api/sg/contracts/:id/guarantees/:gId/release (lever garantie)
- GET /api/sg/contracts/export?format=xlsx

COMPOSANTS src/components/sg/marches/
=======================================
- ContractsHeader.tsx
- ContractsKpis.tsx
- ContractsPhaseTabs.tsx
- ContractsFiltersCard.tsx
- ContractsTable.tsx
- CallForTendersGrid.tsx (cards AO en cours)
- ContractDetailDrawer.tsx (onglets : Identité, Phases, Avenants, Garanties, Doc)
- NewContractWizard.tsx (4 étapes)
- ContractPhaseTransitionModal.tsx
- AmendmentForm.tsx
- BankGuaranteeForm.tsx
- ContractsLifecycleVisual.tsx ⚠️ pipeline 8 étapes réutilisable

⚠️ RESPONSIVE
==============
- Tableau marchés : ::before content labels mobile
- Pipeline 8 étapes : flex-wrap mobile (4×2 au lieu de 8×1)
- Cards AO : 3 col → 1 col

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/marches

LIVRABLES
=========
- Code complet
- Test : Élisabeth crée marché "École Mfoundi MINEDUB" → wizard 4 étapes
- Test : transition phase "Soumission" → "Notification attendue" avec validation
- Test : création avenant +82 M FCFA sur AEP Mbalmayo → workflow approbation
- Test : levée caution SGBC après réception PV → status RELEASED
- Audit responsive 7/7 OK
- Commit "feat(sg): cycle commercial complet 8 phases — fn 1.2"
```

### PROMPT 1.3 — Conseil d'Administration et Gouvernance

```
Fonction 1.3 : gestion CA, AG, registres légaux (volet SA OHADA).

PROTOTYPE HTML
==============
screen-sg-ca-ag. Reproduire avec :
- Header "SA OHADA Acte Uniforme · 9 administrateurs · prochain CA 01/06/2026 ·
  AG annuelle 30/06/2026"
- **Composition du Conseil d'Administration** : tableau des 9 admins avec
  Nom, Fonction (PCA-DG, Administrateurs, Indépendants, Secrétaire CA),
  Représentation (Lui-même, Famille, SOFICAM SA, Personnalité qualifiée),
  Début mandat, Échéance
- **Card focus "Prochain Conseil d'Administration"** : DANS 23 JOURS · 1er juin
  2026 · 14h00 · CA Semestriel · Salle Bastos siège · status "À préparer"
- Section "Ordre du jour proposé" : 6 points numérotés (Approbation PV, Comptes
  semestriels, Avenants marchés, Contentieux, AG annuelle, Questions diverses)

WORKFLOW MÉTIER
================

**Calendrier annuel CA** :
- CA mensuel obligatoire (BatimCAM en a fait le choix · loi OHADA exige
  minimum trimestriel)
- AG ordinaire dans les 6 mois après clôture (BatimCAM : avant 30/06)
- AG extraordinaire si modifications statutaires ou décisions majeures

**Convocation CA** :
- Délai minimum 15 jours pour CA ordinaire
- Délai minimum 30 jours pour AG (annuelle ou extraordinaire)
- Convocation par lettre recommandée + email + WhatsApp
- Ordre du jour obligatoire annexé à la convocation

**Quorum** :
- CA : moitié des administrateurs présents
- AG ordinaire : 1/4 du capital sur 1ère convocation, pas de quorum sur 2e
- AG extraordinaire : 1/2 du capital sur 1ère, 1/4 sur 2e

**Préparation dossier CA** :
- Élisabeth coordonne avec DG (validation ordre du jour), DAF (états financiers),
  DT (situation chantiers), CAC pour les sujets comptables
- Documents distribués 7 jours avant la séance
- Salle préparée, café/eau, présence visioconférence si admin absent

**Pendant le CA** :
- Élisabeth = Secrétaire du CA (présente sans voix délibérative)
- Note les votes, oppositions, abstentions
- Rédige le PV séance tenante (ou dans les 48 h max)

**Après le CA** :
- PV finalisé sous 7 jours
- Soumis à signature du PCA (Albert) sous 14 jours
- Inscription au Registre des décisions du CA
- Diffusion aux administrateurs

**AG annuelle** :
- Ordre du jour standard : approbation comptes, affectation résultat, quitus
  administrateurs, renouvellement CAC si fin de mandat
- Présentation par DAF et CAC
- Vote par show of hands ou bulletin selon enjeu
- PV signé par le Président + 1 administrateur + Secrétaire

API
===
- GET /api/sg/governance/meetings (CA + AG)
- GET /api/sg/governance/meetings/:id (détail + agenda + décisions)
- POST /api/sg/governance/meetings (créer nouvelle réunion)
- PATCH /api/sg/governance/meetings/:id/agenda (modifier ordre du jour)
- POST /api/sg/governance/meetings/:id/convocations (envoyer convocations)
- POST /api/sg/governance/meetings/:id/pv (téléverser PV signé)
- POST /api/sg/governance/meetings/:id/decisions (ajouter décision)
- GET /api/sg/governance/board-members
- GET /api/sg/governance/decisions-register
- POST /api/sg/governance/decisions-register/export (PDF officiel)

COMPOSANTS src/components/sg/gouvernance/
==========================================
- GovernanceHeader.tsx
- GovernanceKpis.tsx
- BoardCompositionTable.tsx
- NextMeetingFocusCard.tsx ⚠️ CRITIQUE — ordre du jour interactif
- AgendaItemEditor.tsx (drag-and-drop reordering)
- ConvocationWizard.tsx (envoi email + WhatsApp + courrier)
- PvUploadCard.tsx
- MeetingHistoryTable.tsx
- DecisionsRegisterExport.tsx (PDF officiel signé)

⚠️ RESPONSIVE
==============
- Tableau administrateurs : ::before content labels mobile
- Card ordre du jour : items empilés mobile
- Historique PV : scroll horizontal acceptable

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/ca-ag

LIVRABLES
=========
- Code complet
- Test : Élisabeth finalise ordre du jour CA 27 mai → soumission DG → approbation
- Test : envoi convocations 9 administrateurs → email + WhatsApp + recommandé
- Test : téléversement PV CA 25 avril → AuditLog + indexation Registre
- Test : export Registre décisions PDF officiel signé (avec cachet électronique)
- Audit responsive 7/7 OK
- Commit "feat(sg): gouvernance CA AG + registre décisions — fn 1.3"
```

### PROMPT 1.4 — Contentieux juridique

```
Fonction 1.4 : suivi des affaires juridiques en cours.

PROTOTYPE HTML
==============
screen-sg-contentieux. Reproduire avec :
- Header "4 contentieux actifs · 42 M provisions · 3 cabinets avocats partenaires"
- KPIs (Dossiers actifs 4 rouge, Provisions 42 M, Audiences 30 j 2 ambré,
  Honoraires YTD 14,2 M)
- **4 dossiers détaillés** en cards avec border-left coloré :
  * MOA Pont Mfoundi pénalités retard (rouge audience 22/05, défendeur, 28 M,
    provision 18 M, Me FOTSO)
  * Ferraillage Plus impayés (ambré audience 04/06, défendeur, 18 M, Me NDIBA)
  * Bonabéri Habitat recouvrement DAP (bleu médiation, demandeur, 42 M,
    85 % succès)
  * Contestation cotisations CNPS 2024 (gris mémoire déposé, demandeur, 8,4 M,
    Me NDIBA)

WORKFLOW MÉTIER
================

**Ouverture d'un dossier** :
- Élisabeth crée LegalCase en status OPEN
- Choix avocat (BatimCAM travaille avec 3 cabinets partenaires)
- Définition stratégie initiale (validation DG + DAF si > 50 M FCFA)
- Calcul provision IFRS selon probabilité succès (15-100 %)
- Notification CAC (Cabinet KPMG) pour comptabilisation

**Suivi procédural** :
- Chaque acte procédural créé en LegalCaseEvent (hearing, decision,
  memorandum_filed, etc.)
- Documents archivés en GED avec accès restreint (SG + DG + DAF + avocat)
- Communications avocat tracées (échanges email + comptes-rendus appels)
- Honoraires déclarés en charges juridiques

**Calendrier audiences** :
- Notification automatique J-30, J-7, J-1 avant audience
- Présence requise selon affaire (DG, DAF, témoins)
- Compte-rendu post-audience par avocat sous 48 h

**Provisions IFRS** :
- Revue trimestrielle obligatoire par DAF + CAC
- Ajustement selon évolution dossier
- Reprise de provision si succès, augmentation si défaite

**Clôture d'un dossier** :
- Status SETTLED (amiable), WON, LOST ou ABANDONED
- Compte rendu final + leçons apprises
- Archivage permanent en GED (durée légale 30 ans)
- Levée définitive de provision

API
===
- GET /api/sg/legal-cases?status=&jurisdiction=
- GET /api/sg/legal-cases/:id (détail complet + événements)
- POST /api/sg/legal-cases (nouveau dossier)
- PATCH /api/sg/legal-cases/:id
- POST /api/sg/legal-cases/:id/events (ajouter événement procédural)
- POST /api/sg/legal-cases/:id/documents (téléverser document)
- PATCH /api/sg/legal-cases/:id/provision (ajuster provision)
- POST /api/sg/legal-cases/:id/close (clôture)
- GET /api/sg/lawyers (annuaire avocats partenaires)
- GET /api/sg/legal-cases/calendar (calendrier audiences)

COMPOSANTS src/components/sg/contentieux/
==========================================
- LegalCasesHeader.tsx
- LegalCasesKpis.tsx
- LegalCaseCard.tsx ⚠️ avec border-left selon urgence/criticité
- LegalCaseDetailDrawer.tsx (timeline procédurale + documents + honoraires)
- NewLegalCaseWizard.tsx (4 étapes : Identification, Stratégie, Avocat, Provision)
- LegalEventTimeline.tsx
- ProvisionAdjustmentModal.tsx (avec validation DAF)
- LawyersDirectory.tsx
- HearingsCalendar.tsx

⚠️ RESPONSIVE
==============
- Cards dossiers : structure verticale mobile
- Champs détaillés : 4 col → 2 col → 1 col
- Timeline procédurale : verticale mobile

⚠️ SÉCURITÉ
============
- Documents sensibles chiffrés au repos
- Accès tracé avec AuditLog
- Téléchargement avec watermark "Confidentiel · SG · timestamp · user"

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/contentieux

LIVRABLES
=========
- Code complet
- Test : Élisabeth crée dossier "Litige fournisseur" → wizard 4 étapes
- Test : ajout événement procédural "mémoire déposé" sur Ferraillage Plus
- Test : ajustement provision CNPS 4 M → 6 M → workflow validation DAF
- Test : audience J-7 → notification automatique Élisabeth + DG + Me FOTSO
- Test : clôture dossier WON → reprise provision 18 M → écriture comptable
- Audit responsive 7/7 OK
- Commit "feat(sg): contentieux juridique + provisions IFRS — fn 1.4"
```

### PROMPT 1.5 — Conformité et registres obligatoires

```
Fonction 1.5 : gestion conformité réglementaire et registres légaux.

PROTOTYPE HTML
==============
screen-sg-conformite. Reproduire avec :
- Header "SA OHADA · 8 registres légaux · 14 attestations à maintenir ·
  6 échéances dans les 90 jours"
- **Card statut global** : "✓ Conformité globale à jour · 98 %" gradient vert
  avec 3 stats (Conformité 98 %, Échéances 90 j 6 ambré, Registres 8/8 vert)
- **Section "Échéances dans les 90 jours"** : tableau 6 obligations
  (Convocation AG, Avenant MINEE, AG annuelle, Renouvellement RC, Attestation
  CNPS, Attestation fiscale)
- **Section "Registres légaux obligatoires"** : 8 cards de registres avec
  border-left vert/ambré selon statut (AG, Actionnaires, CA, Personnel,
  HSE, Conventions, Cautions, Marchés)

WORKFLOW MÉTIER
================

**Calendrier de conformité annuel** :
- Janvier : déclaration bilan social, déclaration salariale CNPS
- Mars : approbation comptes provisoires (CA)
- Mai : préparation AG annuelle
- Juin : AG annuelle, dépôt comptes annuels au RCCM
- Juillet : déclaration fiscale annuelle DGI
- Août : renouvellement RC (selon échéance)
- Décembre : renouvellement assurances, cotisations associations

**Gestion des échéances** :
- Notification automatique J-90, J-60, J-30, J-15, J-7, J-1
- Escalade DG si échéance dépassée (warning)
- Pénalités tracées si retard (RCCM, DGI, CNPS)

**Registres obligatoires (Acte Uniforme OHADA)** :
- Tous les registres doivent être paraphés par le greffe
- Mise à jour temps réel
- Audit interne trimestriel par Élisabeth
- Audit externe annuel par CAC

**Délégation des registres** :
- Registre du personnel → délégué à RH (Sandrine ONANA)
- Registre HSE chantiers → délégué à DTrav (Paul ETOUNDI)
- Registre cautions → en coordination avec DAF (Marie NGONO)
- Tous les autres → géré directement par SG

API
===
- GET /api/sg/compliance/dashboard (statut global + 90 j échéances)
- GET /api/sg/compliance/registers
- GET /api/sg/compliance/registers/:id (détail + dernières entrées)
- POST /api/sg/compliance/registers/:id/entries (ajouter entrée)
- POST /api/sg/compliance/registers/:id/audit (lancer audit interne)
- GET /api/sg/compliance/deadlines (toutes les échéances)
- POST /api/sg/compliance/deadlines/:id/complete (marquer fait)
- POST /api/sg/compliance/deadlines/:id/snooze (reporter avec justification)
- GET /api/sg/compliance/external-audit (rapport CAC dernier audit)

COMPOSANTS src/components/sg/conformite/
==========================================
- ComplianceHeader.tsx
- ComplianceStatusCard.tsx (gradient vert avec %)
- UpcomingDeadlinesTable.tsx (90 jours)
- RegistersGrid.tsx (8 cards avec border-left coloré)
- RegisterDetailDrawer.tsx (entrées + audit + délégué)
- NewDeadlineModal.tsx
- ComplianceAuditReport.tsx (export PDF)

⚠️ RESPONSIVE
==============
- Card statut global : 3 stats horizontales → empilées mobile
- Tableau échéances : ::before content labels mobile
- Grid registres : 3 col → 2 col → 1 col

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/conformite

LIVRABLES
=========
- Code complet
- Test : Élisabeth voit 6 échéances 90 j → marque "Attestation CNPS" comme
  demandée
- Test : entrée nouvelle décision AG → registre AG_DECISIONS mis à jour
- Test : audit interne registre conventions réglementées → status TO_UPDATE
  → notification DG
- Test : J-7 avant échéance RC → notification automatique Élisabeth + DG
- Audit responsive 7/7 OK
- Commit "feat(sg): conformité + registres légaux OHADA — fn 1.5"
```

### PROMPT 1.6 — Relations institutionnelles

```
Fonction 1.6 : annuaire institutionnel et agréments BTP.

PROTOTYPE HTML
==============
screen-sg-institutionnel. Reproduire avec :
- Header "8 ministères · 4 communes · 6 organisations professionnelles ·
  3 agréments BTP en cours de validité"
- KPIs (Contacts 142, Agréments 3 vert, Adhésions 6, Événements 90 j 4)
- **4 cards en grille** :
  · Ministères clés MOA (MINTP, MINEE, MINEDUB, MINHDU avec statuts)
  · Communes partenaires (Yaoundé I, IV, Mbalmayo, Bonabéri)
  · Adhésions professionnelles (CCIMA, GICAM, OBE, SYNDUSTRICAM, FENECABTP, CAPEM)
  · Agréments BTP et certifications (Cat. 4 MINTP, AEP MINEE, Ouvrages d'art)

WORKFLOW MÉTIER
================

**Annuaire institutionnel** :
- Fiches détaillées par institution avec : contact principal, hiérarchie,
  historique de relations, projets en cours
- Tags pour catégorisation (CLIENT, REGULATORY, ASSOCIATION, SUPPLIER, PARTNER)
- Notes confidentielles SG (commentaires politiques, attentes spécifiques)

**Gestion des agréments BTP** :
- Renouvellement obligatoire (durée 2-3 ans selon catégorie)
- Dossier de renouvellement constitué 90 jours avant échéance
- Pièces : attestations financières, références techniques, agréments en cours,
  CV cadres techniques
- Workflow validation par MINTP/MINEE selon agrément
- Suspension automatique si expire sans renouvellement

**Adhésions professionnelles** :
- Cotisations annuelles à régler en début d'année
- Représentation BatimCAM aux AG des associations
- Participation aux groupes de travail sectoriels
- Élisabeth coordonne avec DG pour stratégie d'influence

**Calendrier des événements** :
- Salons BTP nationaux et internationaux
- AGs associations professionnelles
- Forums institutionnels (Chambre Commerce, Ministère)
- Conférences thématiques (climat, financement, technologies)

API
===
- GET /api/sg/institutions?type=&category=&status=
- GET /api/sg/institutions/:id (détail + historique relations)
- POST /api/sg/institutions
- PATCH /api/sg/institutions/:id
- GET /api/sg/approvals
- GET /api/sg/approvals/:id
- POST /api/sg/approvals/:id/start-renewal (démarrer dossier renouvellement)
- POST /api/sg/approvals/:id/upload-document
- GET /api/sg/events (calendrier événements)
- POST /api/sg/events (ajouter événement)

COMPOSANTS src/components/sg/institutionnel/
=============================================
- InstitutionsHeader.tsx
- InstitutionsKpis.tsx
- MinistriesCard.tsx (ministères clés)
- MunicipalitiesCard.tsx (communes partenaires)
- AssociationsCard.tsx (adhésions professionnelles)
- ApprovalsCard.tsx ⚠️ avec alertes échéance
- InstitutionDetailDrawer.tsx (fiche complète + historique)
- ApprovalRenewalWizard.tsx (dossier renouvellement)
- EventsCalendar.tsx

⚠️ RESPONSIVE
==============
- Grid 4 cards : 2x2 → 1 col empilé < 1024px
- Cards institutions : structure verticale mobile
- Liste contacts dans cards : items 60px hauteur

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/institutionnel

LIVRABLES
=========
- Code complet
- Test : Élisabeth ajoute nouveau contact à MINTP → fiche enrichie
- Test : démarrage dossier renouvellement Agrément BTP cat. 4 → wizard étapes
- Test : agrément ouvrages d'art expire J-39 → alerte automatique
- Test : ajout événement "Forum BTP Cameroun" → notification DG
- Audit responsive 7/7 OK
- Commit "feat(sg): institutions + agréments BTP — fn 1.6"
```

### PROMPT 1.7 — Courriers officiels

```
Fonction 1.7 : registre des courriers entrants et sortants.

PROTOTYPE HTML
==============
screen-sg-courriers. Reproduire avec :
- Header "142 traités ce mois · 12 en attente signature DG · archivage légal
  automatique GED"
- Onglets (Entrants 84, Sortants 58, Brouillons 4, À signer DG 12, Archivés 684)
- KPIs (Entrants 84, Sortants 58, En attente signature 12 ambré, Traités YTD 684)
- **Tableau "Courriers entrants récents"** : 7 lignes avec colonnes N°,
  Date, Expéditeur, Objet, Confidentialité chip, Affecté, Statut
- **Tableau "En attente signature DG (12)"** : 5 courriers sortants avec
  délais et bouton "Soumettre"
- **Section "Activité par administration ce mois"** : 6 cards (MINTP 28,
  MINEE 12, Communes 8, DGI+CNPS 14, Tribunaux 6 rouge, Clients privés 44)

WORKFLOW MÉTIER
================

**Courrier entrant** :
1. Réception (courrier postal, email officiel, fax)
2. Enregistrement par Élisabeth dans le registre (référence CE-AAAA-NNNN)
3. Numérisation et archivage en GED
4. Tri par confidentialité : PUBLIC, STANDARD, SENSITIVE, CONFIDENTIAL
5. Affectation à la direction concernée (DG, DAF, DT, RH, etc.)
6. Notification du destinataire + suivi accusé de réception
7. Suivi de traitement (status RECEIVED → IN_PROGRESS → ARCHIVED)
8. Délai de réponse configurable selon type (5 j ouvrés standard, 30 j pour
   marchés publics, 15 j pour fournisseurs)

**Courrier sortant** :
1. Préparation par Élisabeth (ou autre service, validation SG)
2. Référence CS-AAAA-NNNN attribuée
3. Validation par hiérarchie selon enjeu :
   - Standard → SG seul
   - Sensible → SG + DG validation
   - Engageant juridiquement → SG + Avocat + DG
4. Soumission à signature DG
5. Signature électronique (DG depuis son espace) ou physique (cachet + signature)
6. Envoi (recommandé, email officiel, remise en main propre)
7. Archivage automatique en GED

**Courriers à signature DG** :
- File d'attente prioritaire dans l'espace DG (badge alerte)
- Délai standard 24 h pour signature
- Si > 48 h sans signature : notification d'escalade
- Possibilité d'annoter avant signature (commentaires DG)

**Archivage légal** :
- Tous les courriers archivés en GED avec rétention 5 ans minimum
- Indexation par mots-clés pour recherche
- Recherche full-text PostgreSQL tsvector
- Export annuel pour archives institutionnelles

API
===
- GET /api/sg/correspondences?direction=&status=&date_from=&date_to=&q=
- GET /api/sg/correspondences/:id
- POST /api/sg/correspondences (créer entrant ou brouillon sortant)
- PATCH /api/sg/correspondences/:id
- POST /api/sg/correspondences/:id/upload-document
- POST /api/sg/correspondences/:id/submit-to-dg (soumettre signature)
- POST /api/sg/correspondences/:id/sign (signature DG · endpoint /api/dg/sign)
- POST /api/sg/correspondences/:id/send (envoyer après signature)
- POST /api/sg/correspondences/:id/archive (archiver dans GED)
- GET /api/sg/correspondences/analytics (par admin, par direction, par mois)

COMPOSANTS src/components/sg/courriers/
=========================================
- CorrespondencesHeader.tsx
- CorrespondencesTabs.tsx
- CorrespondencesKpis.tsx
- IncomingCorrespondencesTable.tsx
- AwaitingDgSignatureTable.tsx
- NewCorrespondenceWizard.tsx (3 étapes : Type, Contenu, Routage)
- CorrespondenceDetailDrawer.tsx (preview document + historique workflow)
- SubmitToDgModal.tsx
- DgSignatureView.tsx (côté DG dans son espace)
- AdminActivityCards.tsx (6 cards stats par administration)

⚠️ RESPONSIVE
==============
- Tableaux courriers : ::before content labels mobile
- Onglets : scroll horizontal mobile
- Cards administrations : 3x2 → 2x3 → 1 col

⚠️ INTÉGRATIONS
================
- GED (Christelle EYENGA) : archivage automatique tous courriers
- DG (Albert) : workflow signature avec notifications
- DAF, DT, RH : réception courriers entrants pertinents
- AuditLog : traçabilité complète

VALIDATION
==========
  pnpm exec tsx scripts/audit-responsive.ts /sg/courriers

LIVRABLES
=========
- Code complet
- Test : Élisabeth enregistre courrier MINTP "Notification marché Pont Mfoundi
  extension" → tri CONFIDENTIEL → affectation DG → notification email
- Test : Élisabeth prépare courrier sortant "Mise en demeure Bonabéri Habitat"
  → workflow Avocat + DG → signature DG → envoi recommandé
- Test : courrier en attente signature > 48 h → notification d'escalade
- Test : recherche full-text "AEP Mbalmayo" → 14 courriers indexés trouvés
- Test : export annuel 684 courriers YTD → PDF avec index
- Audit responsive 7/7 OK
- Commit "feat(sg): courriers officiels + workflow signature DG — fn 1.7"
```

---

## ✅ FIN BLOC 1 — Profil Secrétaire Général complet

Tu viens de couvrir l'**ensemble du profil Secrétaire Général** :
- Bloc 0 : 11 nouveaux models corporate + extension User avec 5 pouvoirs spéciaux
- Bloc 1 : 7 fonctions (Dashboard, Marchés, CA/Gouvernance, Contentieux,
  Conformité, Institutions, Courriers)

**Total profil SG : 7 fonctions livrées**

---

## POINTS FORTS DE CE PROFIL

- **Profil cadre dirigeant** distinct du DG et de la DAF
- **Couverture complète SA OHADA** : capital, actionnariat, CA, AG, registres
- **Cycle commercial 8 phases** depuis veille AO jusqu'à GPA 1 an
- **Gestion contentieux** avec provisions IFRS et coordination CAC
- **Conformité réglementaire** Cameroun avec 8 registres légaux
- **Annuaire institutionnel** ministères + communes + associations + agréments
- **Workflow courriers** avec signature DG et archivage légal GED
- **MFA obligatoire** (confidentialité direction)
- **Accès lecture aux dashboards** autres directions sans modification

## ESTIMATION EFFORT

- Bloc 0 (11 models Prisma + RBAC + 5 flags + MFA) : 4-5 jours
- Bloc 1 (7 fonctions) : 12-15 jours
  - fn 1.1 Dashboard : 1,5 jour
  - fn 1.2 Marchés (8 phases) : 3 jours
  - fn 1.3 CA & Gouvernance (CA + AG + PV) : 2,5 jours
  - fn 1.4 Contentieux (timeline + IFRS) : 2 jours
  - fn 1.5 Conformité (registres OHADA) : 1,5 jour
  - fn 1.6 Institutions (annuaire + agréments) : 1 jour
  - fn 1.7 Courriers (workflow signature) : 1,5 jour
- **TOTAL : 16-20 jours**

## INTERACTIONS AVEC AUTRES PROFILS

- **DG (Albert)** : valide ordres du jour CA, signe courriers officiels,
  approuve avenants > 50 M FCFA, conduit AG
- **DAF (Marie)** : présente comptes au CA, calcule provisions IFRS contentieux,
  émet/lève cautions bancaires, coordonne avec CAC
- **DT (Daniel)** : étudie les AO techniquement, suit l'exécution des marchés,
  prépare les avenants chantier
- **RH (Sandrine)** : tient le registre du personnel (délégation SG)
- **DTrav (Paul)** : tient le registre HSE chantiers (délégation SG)
- **GED (Christelle)** : archive automatiquement tous courriers et documents
  corporate
- **IT (Étienne)** : assure la sécurité MFA et confidentialité documents SG
- **CAC externe KPMG** : audite registres + comptes + provisions IFRS

## CONFORMITÉ LÉGALE CAMEROUN

- Acte Uniforme OHADA sur les sociétés commerciales et GIE (1997, révisé 2014)
- Loi camerounaise n° 2010/012 sur la protection des données personnelles
- Loi camerounaise n° 2011/012 portant règlementation activités BTP
- Code général des impôts du Cameroun (mise à jour annuelle)
- Conventions collectives BTP Cameroun (2024)

## PROCHAINE ÉTAPE

Avec ce profil SG, T-ERP compte désormais **14 profils internes** + 3 zones
publiques, soit **121 écrans dans le prototype**. L'écosystème est très complet.

Pistes naturelles pour la suite :
1. **Module Sous-traitance** (encore à concevoir : contrats sous-traitants,
   factures, retenue de garantie, conformité fiscale tiers)
2. **Module Devis-Marchés amont** (avant qu'un chantier ne démarre côté commercial)
3. **Déploiement Railway/Neon production** (J7)
4. **Tests E2E** sur les ~85 fonctions
5. **Internationalisation CEMAC** (Sénégal, Côte d'Ivoire, Gabon)
6. **Marketing terp.cm** avec contenu réel et démos client
