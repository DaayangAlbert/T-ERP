# DG · BLOC 5 — Stocks et espace personnel

**4 modules · 4 prompts à enchaîner**

---

## 🟣 PROMPT 5.1 — Stocks & matériel (vue DG)

```
Module : Stocks & matériel · vue DG.

CONTEXTE
========
L'écran screen-stocks existe en lecture. On l'enrichit pour le DG :
valorisation patrimoniale, immobilisations stratégiques, mouvements anormaux.

PROTOTYPE HTML — ENRICHISSEMENT screen-stocks
==============================================

1. Garde la structure existante, ajoute des onglets :
   - Stocks (existant)
   - Matériel (existant)
   - Patrimoine (nouveau)
   - Mouvements (nouveau)
   - Inventaires (nouveau)

2. Onglet "Patrimoine" (vue DG immobilisations) :
   - Tableau des immobilisations significatives (valeur > 10 M FCFA)
   - Colonnes : Bien | Acquisition | Valeur brute | Amort. cumulé | VNC |
     Chantier affecté | État | Assurance | Date dernière valorisation
   - Total VNC du parc, comparaison année précédente
   - Graphe répartition par type (engins, véhicules, bâtiments, outillage)
   - Plan de renouvellement (engins arrivant en fin de vie 12-24 mois)

3. Onglet "Mouvements" :
   Listview filtrable des mouvements stock + matériel :
   date | type (entrée/sortie/transfert/ajustement) | article | quantité |
   valeur | site source | site destination | initiateur | motif
   Détection automatique des mouvements anormaux (sortie > 3σ habituel,
   ajustements négatifs) avec alertes visibles par le DG.

4. Onglet "Inventaires" :
   Tableau des inventaires :
   période | site | articles inventoriés | écarts (nb + valeur) | statut
   Bouton "Lancer un inventaire" (wizard : périmètre, équipe, dates).
   Pour les inventaires terminés : lien vers le rapport d'écart à valider DG si > seuil.

5. Section "Sinistres et pertes" :
   Liste des sinistres déclarés (vol, casse, perte) avec :
   bien | valeur | site | date | déclaration assurance | indemnisation |
   actions correctives mises en place

CODE
====

a) PRISMA :
   model FixedAsset {
     id            String   @id @default(cuid())
     tenantId      String
     code          String
     description   String
     category      AssetCategory
     acquisitionDate DateTime
     grossValue    BigInt
     accumulatedDepreciation BigInt @default(0)
     netValue      BigInt   // calculé
     usefulLifeMonths Int
     siteId        String?
     condition     String   // EXCELLENT, GOOD, FAIR, POOR
     insurance     Json?
     lastRevaluedAt DateTime?
   }
   enum AssetCategory { EQUIPMENT VEHICLE BUILDING TOOLING IT FURNITURE OTHER }

   model StockMovement {
     id           String   @id @default(cuid())
     tenantId     String
     type         MovementType
     itemCode     String
     quantity     Float
     unitValue    BigInt
     totalValue   BigInt
     fromSiteId   String?
     toSiteId     String?
     reason       String?
     initiatorId  String
     anomalous    Boolean  @default(false)
     createdAt    DateTime @default(now())
   }
   enum MovementType { INBOUND OUTBOUND TRANSFER ADJUSTMENT WRITEOFF }

   model Inventory {
     id            String   @id @default(cuid())
     tenantId      String
     siteId        String?
     period        String
     items         Json     // résultats détaillés
     gapsCount     Int      @default(0)
     gapsValue     BigInt   @default(0)
     status        InventoryStatus
     dgValidated   Boolean  @default(false)
     startDate     DateTime
     endDate       DateTime?
   }
   enum InventoryStatus { PLANNED IN_PROGRESS COMPLETED VALIDATED }

   model Loss {
     id          String   @id @default(cuid())
     tenantId    String
     type        LossType
     itemDescription String
     value       BigInt
     siteId      String?
     occurredAt  DateTime
     declaredToInsurance Boolean @default(false)
     indemnification BigInt?
     correctiveActions String? @db.Text
   }
   enum LossType { THEFT DAMAGE LOSS OTHER }

b) API :
   - GET /api/stocks/fixed-assets
   - PATCH /api/stocks/fixed-assets/:id
   - GET /api/stocks/movements (avec filtre anomalous=true)
   - GET /api/stocks/inventories
   - POST /api/stocks/inventories (lancer inventaire)
   - POST /api/stocks/inventories/:id/validate-dg
   - GET /api/stocks/losses
   - POST /api/stocks/losses

c) Pages :
   - /stocks/page.tsx (refonte avec 5 onglets)
   - /stocks/inventaires/[id]/page.tsx

d) Composants src/components/stocks/ :
   - FixedAssetsTable.tsx
   - RenewalPlan.tsx
   - MovementsTable.tsx (avec highlight anomalous)
   - InventoriesTable.tsx
   - InventoryWizard.tsx
   - LossesTable.tsx

SEED
====
- 42 immobilisations (engins, véhicules, bâtiments) cohérentes
- 200 mouvements stock sur les 30 derniers jours dont 5 marqués anormaux
- 4 inventaires (2 terminés, 1 en cours, 1 planifié)
- 3 sinistres historiques

LIVRABLES
=========
- Prototype enrichi avec 5 onglets
- Code complet
- Commit "feat(dg): stocks — patrimoine, mouvements, inventaires, sinistres"
```

---

## 🟣 PROMPT 5.2 — Mon profil (vue DG enrichie)

```
Module : Mon profil · vue DG.

CONTEXTE
========
L'écran screen-profile existe pour tous. On l'enrichit pour le DG : préférences
DG, signature numérique, agenda, déclarations, accès rapide à ses délégations.

PROTOTYPE HTML — ENRICHISSEMENT screen-profile
===============================================

1. Garde la structure existante (hero, identité, infos pro, documents, sécurité).

2. Ajoute pour le DG des sections supplémentaires :

   Section "Signature numérique" :
   - Upload signature manuscrite (image PNG transparent)
   - Paraphe (initiales)
   - Affichage preview
   - Bouton "Signer un document" (test)
   - Conformité eIDAS (badge)

   Section "Préférences DG" :
   - Tableau de bord : choix des widgets affichés au démarrage (multi-select)
   - Alertes : seuils personnalisés (alerter si trésorerie < X, marge < Y %)
   - Notifications : canaux préférés par type d'événement
   - Rapport quotidien : recevoir un email résumé chaque matin (heure configurable)
   - Format des nombres : affichage en M FCFA, Md FCFA, ou montant brut

   Section "Agenda DG" :
   - Calendrier intégré du DG (rendez-vous, conseils, audits, validations programmées)
   - Synchronisation Google Calendar / Outlook (placeholder)
   - Bouton "+ Nouveau rendez-vous"
   - Vue mois/semaine/jour

   Section "Déclarations d'intérêts" :
   - Mandats externes (autres entreprises, associations, fonctions publiques)
   - Détentions de parts sociales
   - Conflits d'intérêts potentiels
   - Mise à jour annuelle obligatoire (alerte 30 jours avant échéance)

   Section "Mes délégations actives" :
   - Liste des délégations que j'ai données (à qui, quoi, jusqu'à quand)
   - Liste des délégations reçues
   - Lien vers /validations/delegations pour gestion

3. Onglet "Activité" enrichi :
   - Timeline de mes actions sur les 30 derniers jours
   - Filtres : type d'action, module
   - Rapport mensuel d'activité (téléchargeable)

CODE
====

a) PRISMA :
   model UserPreferences {
     id          String   @id @default(cuid())
     userId      String   @unique
     user        User     @relation(fields: [userId], references: [id])
     dashboardWidgets Json @default("[]")
     alertThresholds  Json @default("{}")
     notificationChannels Json @default("{}")
     dailyReportEnabled Boolean @default(false)
     dailyReportTime    String? // "07:00"
     numberFormat       String  @default("M_FCFA")
   }

   model UserSignature {
     id          String   @id @default(cuid())
     userId      String   @unique
     user        User     @relation(fields: [userId], references: [id])
     signatureUrl String?
     initialsUrl  String?
     uploadedAt   DateTime?
   }

   model AgendaEvent {
     id        String   @id @default(cuid())
     userId    String
     title     String
     description String?
     startAt   DateTime
     endAt     DateTime
     location  String?
     type      EventType
     externalId String? // pour sync Google/Outlook
   }
   enum EventType { MEETING BOARD AUDIT VALIDATION_DEADLINE PERSONAL OTHER }

   model InterestDeclaration {
     id          String   @id @default(cuid())
     userId      String
     year        Int
     mandates    Json
     shareholdings Json
     conflictsOfInterest Json
     declaredAt  DateTime
     validUntil  DateTime
   }

b) API :
   - GET/PATCH /api/users/me/preferences
   - POST /api/users/me/signature (upload)
   - GET /api/users/me/agenda?from=...&to=...
   - POST /api/users/me/agenda
   - PATCH /api/users/me/agenda/:id
   - GET /api/users/me/interests
   - POST /api/users/me/interests
   - GET /api/users/me/activity?days=30

c) Pages :
   - /profil/page.tsx (refonte avec sections supplémentaires DG)
   - /profil/agenda/page.tsx (vue calendrier dédiée)

d) Composants src/components/profile/ :
   - SignatureUploader.tsx
   - PreferencesForm.tsx
   - AgendaCalendar.tsx (vue mois/semaine/jour)
   - InterestDeclarationForm.tsx
   - ActivityTimeline.tsx

SEED
====
- Préférences DG par défaut pour Albert
- 15 événements agenda sur 30 jours (CA, audits, validations, RDV)
- Déclaration d'intérêts 2026 avec 2 mandats fictifs

LIVRABLES
=========
- Prototype enrichi (sections DG conditionnelles selon rôle)
- Code complet
- Commit "feat(dg): mon profil enrichi — signature, préférences, agenda, intérêts"
```

---

## 🟣 PROMPT 5.3 — Ma paie (vue DG enrichie)

```
Module : Ma paie · vue DG.

CONTEXTE
========
L'écran screen-pay et screen-payslip existent. On les enrichit pour le DG :
avantages spécifiques, primes performance, stock-options, déclarations fiscales.

PROTOTYPE HTML — ENRICHISSEMENT screen-pay
===========================================

1. Garde la structure existante.

2. Ajoute pour le DG des sections spécifiques :

   Section "Rémunération globale annuelle" :
   - Pyramide de la rémunération totale annuelle :
     Salaire de base | Primes contractuelles | Primes variables (performance) |
     Avantages en nature (logement, véhicule, carburant, téléphone) |
     Indemnités (transport, représentation) |
     Cotisations patronales |
     TOTAL CHARGE EMPLOYEUR
   - Comparaison N vs N-1 vs cible théorique selon contrat

   Section "Avantages en nature" :
   - Tableau détaillé des avantages avec valeur estimée mensuelle :
     Logement de fonction (300 K) · Véhicule de service (180 K) ·
     Carburant (80 K) · Téléphone (25 K) · Mutuelle santé famille (75 K)
   - Évaluation conforme barème CNPS

   Section "Primes de performance" :
   - Bonus annuel sur résultat (formule contractuelle visible)
   - Bonus sur objectifs (lié aux objectifs définis en fonction 1.3)
   - Historique 3 ans
   - Provision en cours

   Section "Déclarations fiscales DG" :
   - Brut imposable cumulé YTD
   - IRPP retenu cumulé
   - CAC, CFC, taxes communales
   - Préparation déclaration annuelle de revenus
   - Bouton "Générer attestation de revenus" (PDF)

3. Section "Solde de tout compte (simulation)" :
   Si le DG quitte ses fonctions, simulation du STC :
   - Indemnités de rupture
   - Solde congés non pris
   - Préavis
   - Bonus prorata
   - Primes acquises non versées

CODE
====

a) PRISMA :
   model BenefitInKind {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     type        BenefitType
     description String
     monthlyValue BigInt
     fiscalValue BigInt   // selon barème CNPS
     startDate   DateTime
     endDate     DateTime?
   }
   enum BenefitType { HOUSING VEHICLE FUEL PHONE INSURANCE OTHER }

   model PerformanceBonus {
     id          String   @id @default(cuid())
     userId      String
     fiscalYear  Int
     bonusType   BonusType
     formula     String?
     targetAmount BigInt
     actualAmount BigInt?
     status      BonusStatus
     paidAt      DateTime?
   }
   enum BonusType { ANNUAL_RESULT OBJECTIVES SIGNING RETENTION }
   enum BonusStatus { TARGETED PROVISIONED VALIDATED PAID }

b) API :
   - GET /api/users/me/total-compensation?year=...
   - GET /api/users/me/benefits-in-kind
   - GET /api/users/me/bonuses
   - GET /api/users/me/income-attestation/pdf
   - GET /api/users/me/stc-simulation

c) Pages :
   - /paie/page.tsx (refonte avec sections DG conditionnelles)
   - /paie/remuneration-globale/page.tsx (vue dédiée DG)

d) Composants src/components/payroll/ :
   - TotalCompensationPyramid.tsx
   - BenefitsTable.tsx
   - PerformanceBonusesHistory.tsx
   - IncomeAttestationGenerator.tsx
   - StcSimulator.tsx

SEED
====
- 5 avantages en nature pour Albert (logement, véhicule, carburant, phone, santé)
- 3 ans de bonus historiques (2024, 2025) + 2026 en cours
- Simulation STC réaliste

LIVRABLES
=========
- Prototype enrichi (sections DG)
- Code complet
- Commit "feat(dg): ma paie enrichie — rémunération globale, avantages, bonus"
```

---

## 🟣 PROMPT 5.4 — Messagerie (vue DG enrichie)

```
Module : Messagerie · vue DG.

CONTEXTE
========
L'écran screen-msg existe (style WhatsApp violet). On l'enrichit pour le DG :
groupes stratégiques, messages prioritaires, notes vocales, annotations.

PROTOTYPE HTML — ENRICHISSEMENT screen-msg
===========================================

1. Garde la structure existante (sidebar conversations + panneau actif).

2. Ajoute des sections dans la sidebar conversations :

   Section "Groupes stratégiques DG" (épinglés en haut) :
   - Comité de direction (DG, DAF, DT, Dir. travaux, RH)
   - Conseil d'administration (DG + 5 administrateurs externes)
   - Cellule de crise (DG + experts mobilisables)
   - Banques relations (DG + DAF + relationship managers)

   Indicateur visuel "Stratégique" sur ces conversations.

3. Filtres en haut :
   - Tous (existant)
   - Non lus (existant)
   - Mentions de moi (nouveau)
   - Prioritaire (nouveau, marquage manuel)

4. Composer enrichi :
   - Bouton "Note vocale" (placeholder, fonctionnel V2)
   - Bouton "Sondage" pour créer rapidement un sondage dans un groupe
   - Bouton "Important" qui marque le message en priorité (notification push immédiate)
   - Mention @utilisateur avec autocomplete
   - Joindre depuis GED (au lieu d'upload local) — pratique pour partager docs internes

5. Panneau latéral droit (optionnel, sur écran large) :
   Pour la conversation active :
   - Membres du groupe
   - Documents partagés dans cette conversation
   - Liens vers chantiers/objectifs/validations mentionnés
   - Recherche dans la conversation
   - Paramètres (épingler, archiver, quitter, ajouter membre)

6. Section "Mes messages prioritaires" (nouvelle vue) :
   Tableau de bord des messages marqués "Important" non encore traités :
   expéditeur, conversation, extrait, date, action recommandée

CODE
====

a) PRISMA :
   model Conversation {
     ...
     isStrategic Boolean  @default(false)
     pinnedAt    DateTime?
   }

   model Message {
     ...
     priority    MessagePriority @default(NORMAL)
     mentions    String[] // userIds mentionnés
     attachedDocumentIds String[] // depuis GED
     pollData    Json?
   }
   enum MessagePriority { LOW NORMAL HIGH URGENT }

   model VoiceNote {
     id          String   @id @default(cuid())
     messageId   String   @unique
     audioUrl    String
     durationSec Int
     transcript  String?  @db.Text  // OCR/STT V2
   }

b) API :
   - GET /api/messages/strategic
   - PATCH /api/messages/:id/priority
   - GET /api/messages/mentions
   - POST /api/messages/voice-note (upload audio)
   - POST /api/messages/poll
   - GET /api/messages/priority-inbox

c) Pages :
   - /messagerie/page.tsx (enrichissement)
   - /messagerie/prioritaires/page.tsx (vue dédiée messages importants)

d) Composants src/components/messaging/ :
   - StrategicGroupsSection.tsx (épinglée en haut sidebar)
   - MessagePriorityBadge.tsx
   - VoiceNoteRecorder.tsx (placeholder UI)
   - PollComposer.tsx
   - MentionAutocomplete.tsx
   - GedAttachmentPicker.tsx
   - ConversationDetailsPanel.tsx (panneau latéral droit)

SEED
====
- 4 groupes stratégiques avec membres cohérents
- 30 messages dont 5 marqués HIGH ou URGENT
- 2 sondages historiques

LIVRABLES
=========
- Prototype enrichi
- Code complet
- Commit "feat(dg): messagerie enrichie — groupes stratégiques, priorités, mentions, sondages"
```

---

## ✅ PROFIL DG TERMINÉ

Tu viens de couvrir l'**ensemble du profil DG** :
- Bloc 1 : 5 fonctions exclusives DG (cockpit, conso, objectifs, tréso, reporting CA)
- Bloc 2 : 4 modules pilotage (validations, rapports, configuration, sécurité)
- Bloc 3 : 3 modules opérationnels (chantiers, planning, RH stratégique)
- Bloc 4 : 3 modules financiers (finances, comptabilité, achats)
- Bloc 5 : 4 modules personnels et inventaire (stocks, profil, paie, messagerie)

**Total profil DG : 19 fonctions livrées.**

À ce stade le DG est complet, démontrable, professionnel.

PROCHAINE ÉTAPE
================
Quand tu es prêt, demande-moi le profil suivant :
"Profil DG terminé. On attaque le profil DAF."

Et je te livrerai les blocs DAF avec la même méthode.
