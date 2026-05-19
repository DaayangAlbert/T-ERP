# DAF · DÉVELOPPEMENT — Bloc 0 (Préambule) + Bloc 1 (Espace DAF dédié)

**Profil cible :** DAF (Marie NGONO · BatimCAM SA)

**Méthode :** 1 prompt = 1 fonction. Chaque prompt enrichit en parallèle le prototype HTML
ET le code React/API. Chaque livrable doit être **pleinement responsive** sur 7 tailles
d'écran : 1920px / 1440px / 1280px / 1024px / 768px / 414px / 375px.

---

## ⚠️ EXIGENCE TRANSVERSE — RESPONSIVE OBLIGATOIRE

À chaque prompt, l'agent doit impérativement :

1. **Tester visuellement** sur les 7 tailles d'écran citées ci-dessus avant tout commit
2. **Suivre les règles responsive du prototype** :
   - >1280px : layout pleine largeur, sidebar 220px, KPIs en row, tableaux complets
   - 1024-1280px : sidebar bascule en compact 64px (icônes seules + tooltips)
   - 768-1024px : KPIs en grille 2x2, sidebar compact, tableaux scroll horizontal
   - <768px : sidebar tiroir overlay, KPIs en 1 colonne, listviews → cards empilées,
     header simplifié (burger + logo + avatar), nav-tabs en scroll horizontal
3. **Aucun débordement horizontal** sur mobile (scroll horizontal uniquement sur les
   tableaux complexes type listview, jamais sur la page entière)
4. **Tap targets minimum 44×44px** sur mobile (boutons, items de liste cliquables)
5. **Texte lisible sans zoom** (taille de police minimum 14px sur mobile pour le contenu,
   13px pour les libellés, 11.5px pour les métadonnées)
6. **Modales adaptées mobile** : plein écran < 768px, centrée > 768px
7. **Graphes redimensionnés** automatiquement (preserveAspectRatio sur les SVG, ou
   responsive container Recharts)
8. **Le DAF en particulier consulte beaucoup en mobilité** (entre réunions, au volant, en
   déplacement chantier) : chaque écran doit donner l'essentiel en 3 secondes sur smartphone.

---

## 🟪 PROMPT 0 — PRÉAMBULE DAF

**À coller dans Claude Code dans une nouvelle conversation, avant tout autre prompt DAF.**

```
Phase de développement du profil DAF (Marie NGONO).

CONTEXTE
========
- Le MVP J0-J7 est livré et déployé.
- Le profil DG a été développé via 5 blocs (cockpit DG, validations, modules transverses,
  finances DG, espace personnel).
- Le prototype HTML contient déjà 5 écrans Espace DAF dédiés :
  screen-daf, screen-daf-treso, screen-daf-validations, screen-daf-paie,
  screen-daf-recouvrement, screen-daf-fiscal.
- Tu dois reproduire ces écrans en code React/Next.js, ajouter les API et le stockage,
  puis enrichir avec les fonctions complémentaires définies dans les prompts suivants.

CONVENTIONS
============
- Écrans prototype : id="screen-daf-<fonction>"
- Pages Next.js : src/app/(app)/daf/<fonction>/page.tsx
- Composants : src/components/daf/<NomFonction>.tsx
- API routes : src/app/api/daf/<fonction>/route.ts
- Hooks : src/hooks/useDaf<Fonction>.ts
- Tables Prisma : pas de préfixe spécifique, mais relations via tenantId obligatoire

EXIGENCE RESPONSIVE
====================
Cf. section "Exigence transverse responsive" du fichier de prompts.
Chaque commit doit inclure dans son message un check liste type :
"Testé responsive : 1920 ✓ · 1440 ✓ · 1280 ✓ · 1024 ✓ · 768 ✓ · 414 ✓ · 375 ✓"

TÂCHES PRÉPARATOIRES (AVANT FONCTIONS)
=======================================

1. Lis le prototype HTML, concentre-toi sur les 5 écrans screen-daf-*.
   Liste-moi les composants visuels récurrents que tu vas factoriser.

2. Crée la section "Espace DAF" dans la sidebar uniformisée :
   - Tableau de bord DAF → /daf
   - Trésorerie temps réel → /daf/tresorerie
   - Validations N2 → /daf/validations (avec badge alerte du nombre)
   - Cycle de paie → /daf/paie
   - Recouvrement → /daf/recouvrement (avec badge)
   - Fiscalité & déclarations → /daf/fiscal

   La section "Espace DAF" doit s'afficher uniquement si role === DAF.
   Pour le DG, elle apparaît en mode lecture seule (drill-down possible mais pas d'action).

3. Crée le layout dédié src/app/(app)/daf/layout.tsx :
   - Vérifie que l'utilisateur a Role.DAF ou Role.DG (DG en read-only)
   - Affiche un breadcrumb "Espace DAF > <fonction>"
   - Hérite du layout principal authentifié

4. Crée la table Prisma "daf_settings" :
     model DafSettings {
       id           String   @id @default(cuid())
       userId       String   @unique
       user         User     @relation(fields: [userId], references: [id])
       alertsConfig Json?    // seuils alertes personnalisés
       dashboardLayout Json?
       updatedAt    DateTime @updatedAt
     }
   Migration : pnpm prisma migrate dev --name daf_settings

5. RESPONSIVE ASSESSMENT INITIAL
   Avant de coder quoi que ce soit, ouvre le prototype HTML sur mobile (375px) et :
   - Identifie les composants qui débordent
   - Note les tableaux qui doivent passer en cards empilées
   - Vérifie que la sidebar Espace DAF passe bien en tiroir overlay

   Note tes observations dans un fichier docs/RESPONSIVE_DAF_NOTES.md pour référence.

LIVRABLES
=========
- Layout DAF protégé par rôle, fonctionnel
- Section sidebar Espace DAF visible pour Marie NGONO
- Table dg_settings en base
- docs/RESPONSIVE_DAF_NOTES.md créé
- Test : connexion en DAF affiche la sidebar enrichie ; connexion en autre rôle (RH par
  exemple) ne montre pas la section DAF
- Commit "chore(daf): bootstrap espace DAF + responsive baseline"

Une fois validé, attends mon prompt 1.1.
```

---

## 🟪 BLOC 1 — Espace DAF (5 fonctions)

### PROMPT 1.1 — Tableau de bord DAF

```
Fonction 1.1 : tableau de bord DAF (point d'entrée Marie NGONO).

PROTOTYPE HTML
==============
Crée screen-daf (s'il existe déjà, l'enrichir) avec une vraie cockpit DAF :

1. Bandeau gradient violet sombre — Position consolidée du jour :
   - Trésorerie consolidée (en grand, mono 36px)
   - Variation jour vs hier
   - Lignes bancaires accordées vs utilisées
   - Disponible total

2. Ligne KPIs principaux (4 cards cliquables avec sparklines) :
   - Encaissements jour (vert + sparkline 7j)
   - Décaissements jour (rouge + sparkline 7j)
   - Validations N2 en attente (badge nb + montant cumulé)
   - DSO clients (jaune si > 60j)

3. Ligne KPIs secondaires (4 cards) :
   - Échéances fiscales 30 jours (rouge si urgentes)
   - Créances échues (rouge montant)
   - Marge YTD (% vs budget)
   - BFR (jours de CA)

4. Section "Mes priorités du jour" (encart violet pâle) :
   Liste actionnable de 5-7 items à traiter aujourd'hui :
   - Valider la paie Avril (action urgente)
   - Préparer dépôt TVA + DIPE + IRPP J+6
   - Relancer SCI Bastos (créance 38,4 M, retard 68j)
   - Rapprocher comptes UBA Mars (écart 2,1 M)
   - 3 BC > 50 M à instruire

5. 2 graphes côte à côte :
   - Évolution trésorerie 30 jours (aire violette)
   - Décomposition des sorties à venir 7 jours (donut : salaires, fournisseurs, fiscal, autres)

6. Bouton "Personnaliser tableau de bord" (placeholder)

CODE NEXT.JS
============

a) API GET /api/daf/dashboard :
   Renvoie {
     consolidatedPosition: { value, dailyDelta, creditLines: { granted, used, available } },
     primaryKpis: { receipts, payments, pendingValidations, dso },
     secondaryKpis: { taxDeadlines, overdueReceivables, ytdMargin, bfr },
     priorities: [{ type, title, urgency, link }],
     treasuryEvolution30d: [...],
     outflowsBreakdown7d: [...]
   }

b) Composants src/components/daf/dashboard/ :
   - DafConsolidatedBanner.tsx (responsive : taille mono 36px → 24px sur mobile)
   - DafKpiRow.tsx (grille 4 col → 2x2 → 1col responsive)
   - DafPrioritiesList.tsx
   - TreasuryAreaChart.tsx (Recharts ResponsiveContainer)
   - OutflowsDonutChart.tsx

c) Page src/app/(app)/daf/page.tsx

RESPONSIVE — TESTS OBLIGATOIRES
===============================
- 1920px : grille pleine, bandeau monospace 36px, KPIs en row 4
- 1280px : bandeau monospace 32px, KPIs en row 4 mais resserrés
- 1024px : KPIs en 2x2, graphes empilés au lieu de côte à côte
- 768px : KPIs en 2x2 plus serrés, bandeau monospace 24px
- 414px : KPIs en 1 colonne, "Mes priorités" prend toute la largeur, graphes en
  responsive containers, bandeau gradient en hauteur réduite
- 375px : pas de débordement horizontal, cards "Mes priorités" tap-friendly

LIVRABLES
=========
- Prototype enrichi
- Code complet
- Captures du tableau de bord sur 4 tailles (1920, 1280, 768, 375)
- Commit "feat(daf): tableau de bord DAF responsive — fn 1.1"
  Avec message : "Testé responsive : 1920 ✓ · 1440 ✓ · 1280 ✓ · 1024 ✓ · 768 ✓ · 414 ✓ · 375 ✓"
```

---

### PROMPT 1.2 — Trésorerie temps réel

```
Fonction 1.2 : trésorerie temps réel multi-banques.

PROTOTYPE HTML
==============
L'écran screen-daf-treso existe. À reproduire fidèlement en React.

ÉLÉMENTS CLÉS À REPRODUIRE
===========================
- Bandeau gradient violet sombre avec position consolidée 412 845 320 FCFA
- KPIs jour (4 cards : encaissements, décaissements, projeté J+7, à payer demain)
- Tableau des 5 banques avec leurs codes couleurs (UBA rouge, BICEC vert sarcelle,
  Afriland violet, Ecobank bleu, SGBC rouge), N° comptes mono, soldes, lignes,
  statut synchro (Live / 3 min)
- Pied de tableau "TOTAL CONSOLIDÉ" en gras
- Graphe 7 derniers jours en aire violette dégradée
- Liste des 5 derniers mouvements avec icônes ▲ ▼ et heures précises

PRISMA
======
   model BankAccount {
     id              String   @id @default(cuid())
     tenantId        String
     bank            BankCode
     accountNumber   String
     accountType     BankAccountType
     currentBalance  BigInt
     creditLineGranted BigInt @default(0)
     creditLineUsed    BigInt @default(0)
     lastSyncAt      DateTime?
     syncStatus      SyncStatus @default(MANUAL)
     contactInfo     Json?
     primaryColor    String?
   }
   enum BankCode { UBA BICEC AFRILAND ECOBANK SGBC SCB ATLANTIQUE OTHER }
   enum BankAccountType { CURRENT ESCROW SAVINGS GUARANTEE FOREIGN_CURRENCY }
   enum SyncStatus { LIVE DELAYED MANUAL ERROR }

   model BankMovement {
     id            String   @id @default(cuid())
     bankAccountId String
     bankAccount   BankAccount @relation(fields: [bankAccountId], references: [id])
     direction     MovementDirection
     amount        BigInt
     label         String
     reference     String?
     counterparty  String?
     siteId        String?
     occurredAt    DateTime
     createdAt     DateTime @default(now())
   }
   enum MovementDirection { INBOUND OUTBOUND }

API
===
- GET /api/daf/banks (liste comptes avec soldes consolidés)
- GET /api/daf/banks/:id (détail compte + 30 derniers mouvements)
- GET /api/daf/banks/:id/movements (paginée + filtres date/montant/sens)
- POST /api/daf/banks/sync (déclenche synchro tous comptes — placeholder pour API banques)
- POST /api/daf/banks/transfer (créer un virement, déclenche workflow validation N2 ou N3)

COMPOSANTS src/components/daf/treasury/
========================================
- TreasuryHeader.tsx (bandeau gradient avec position consolidée)
- TreasuryKpis.tsx (4 cards KPIs jour)
- BanksTable.tsx ⚠️ RESPONSIVE DÉLICAT
  - Desktop : tableau 8 colonnes complet
  - Tablet : 6 colonnes (masque ligne accordée + statut synchro)
  - Mobile : transformation en cards empilées par banque,
    chaque card : pastille banque + nom en haut, mini-grille 2 colonnes pour les chiffres
- TreasuryEvolutionChart.tsx (Recharts area, ResponsiveContainer)
- LatestMovementsList.tsx (liste verticale, idéale mobile)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Bandeau gradient :
   - Desktop : padding 20px, mono 36px
   - Mobile : padding 16px, mono 28px, info secondaire en colonne

2. Tableau banques (le plus critique) :
   - >1024px : tableau classique
   - 768-1024px : scroll horizontal avec sticky column "Banque"
   - <768px : transformation totale en cards :
     ┌─────────────────────────────┐
     │ [UBA] UBA Cameroon          │
     │ ──────────────────────────  │
     │ Solde         156 420 000   │
     │ Disponible    956 420 000   │
     │ Synchro       Live ✓        │
     │ [Détail]                    │
     └─────────────────────────────┘

3. Graphe 7 jours :
   - Hauteur fixe 220px desktop, 180px tablet, 160px mobile
   - Labels axes simplifiés sur mobile (M, J au lieu de Mai, Juin)

4. Mouvements :
   - Format inchangé sur toutes tailles (déjà optimisé liste verticale)
   - Tap sur un mouvement → ouvre détail en modale plein écran sur mobile

LIVRABLES
=========
- Prototype présent (l'écran existe déjà, vérifier conformité responsive)
- Code complet avec transformation tableau ↔ cards selon breakpoint
- Test mobile 375px : pas de débordement, tap-friendly
- Commit "feat(daf): trésorerie temps réel multi-banques — fn 1.2"
  Avec check responsive 7 tailles obligatoire
```

---

### PROMPT 1.3 — Validations N2

```
Fonction 1.3 : validations niveau 2 DAF.

PROTOTYPE HTML
==============
L'écran screen-daf-validations existe. À reproduire en React avec workflow visuel.

ÉLÉMENTS CLÉS
=============
- KPIs (à valider, valeur cumulée, délai moyen, validées du mois)
- Onglets de filtrage (Tous, Paie, Achats, Dépenses, Virements, Avoirs)
- Listview avec workflow visuel inline pour chaque ligne :
  "N1 ✓ → N2 moi (en cours) → N3 DG"
- Boutons valider/rejeter par ligne
- Sélection multiple → validation en lot

PRISMA
======
Étendre le model Validation existant :
   model Validation {
     ...
     workflow      Json     // [{ level: "N1", role: "HR", validatedBy, validatedAt }, ...]
     currentStep   String   // "N1", "N2", "N3", "PAID"
     comments      Json[]   // historique commentaires
     attachments   String[] // URLs documents joints
   }

API
===
- GET /api/daf/validations?type=...&status=pending
- POST /api/daf/validations/:id/approve (avec commentaire optionnel)
- POST /api/daf/validations/:id/reject (avec motif obligatoire)
- POST /api/daf/validations/:id/request-info (demander complément)
- POST /api/daf/validations/bulk-approve (ids[], commentaire commun optionnel)
- POST /api/daf/validations/delegate (déléguer ponctuellement à un autre cadre)

COMPOSANTS src/components/daf/validations/
===========================================
- ValidationsKpis.tsx (4 cards)
- ValidationsTabs.tsx (filtres par type)
- ValidationsTable.tsx ⚠️ RESPONSIVE
- WorkflowInline.tsx (mini diagramme horizontal des étapes)
- BulkApproveBar.tsx (apparaît quand sélection > 0)
- ValidationDetailModal.tsx (détail + actions)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Onglets :
   - Desktop : tabs horizontaux classiques
   - Mobile : scroll horizontal des tabs (overflow-x-auto)

2. Listview :
   - >1024px : 9 colonnes complètes
   - 768-1024px : scroll horizontal, sticky col "Référence"
   - <768px : transformation en cards, chaque card affiche :
     ┌───────────────────────────────┐
     │ [PAY-202604-001]    🔴 Urgent │
     │ Paie Avril 2026               │
     │ S. ONANA · 186 420 000        │
     │ ─────────────────────────     │
     │ Workflow:                     │
     │ N1 ✓ → N2 moi → N3 DG         │
     │ ─────────────────────────     │
     │ [✓ Valider] [✗] [⋮]           │
     └───────────────────────────────┘

3. Bouton "Valider en lot" :
   - Desktop : barre flottante en haut
   - Mobile : bottom sheet sticky en bas avec compteur "(3)" sélection

4. Workflow inline :
   - Desktop : horizontal "N1 ✓ → N2 moi → N3 DG"
   - Mobile : vertical stack pour économiser largeur

LIVRABLES
=========
- Prototype OK (existe déjà)
- Code complet avec actions fonctionnelles
- Validation en lot testée
- Workflow inline lisible sur mobile
- Commit "feat(daf): validations N2 + workflow visuel + lot — fn 1.3"
```

---

### PROMPT 1.4 — Cycle de paie

```
Fonction 1.4 : pilotage du cycle de paie mensuel.

PROTOTYPE HTML
==============
L'écran screen-daf-paie existe. Reproduire avec statusbar du workflow paie complet.

ÉLÉMENTS CLÉS
=============
- Statusbar workflow 7 étapes (Pré-validation ✓, Calcul ✓, N1 RH ✓, N2 DAF ⏳,
  N3 DG, Virement, DIPE CNPS) — l'étape courante en orange
- 4 KPIs (Bulletins, Masse salariale brute, Charges patronales, Net à virer)
- Section "Points d'attention avant validation N2" — 4 alertes contextualisées :
  · 12 employés sans n° CNPS valide (orange)
  · 8 heures sup > 60h Pont Mfoundi (orange)
  · 3 nouveaux embauchés en prorata (info bleu, OK)
  · Écarts vs M-1 cohérents (vert OK)
- Card "Actions DAF disponibles" avec 4 raccourcis (état complet, ordre virement
  multi-banques, DIPE CNPS, État IRPP)
- Graphe évolution masse salariale 12 mois (barres violettes)

PRISMA
======
   model PayrollCycle {
     id              String   @id @default(cuid())
     tenantId        String
     period          String   @unique  // "2026-04"
     status          PayrollCycleStatus
     totalBulletins  Int      @default(0)
     grossAmount     BigInt   @default(0)
     employerCharges BigInt   @default(0)
     netToPay        BigInt   @default(0)
     startedAt       DateTime
     calculatedAt    DateTime?
     n1ValidatedAt   DateTime?
     n2ValidatedAt   DateTime?
     n3ValidatedAt   DateTime?
     paidAt          DateTime?
     dipeSubmittedAt DateTime?
     warnings        Json[]   // alertes pré-validation
     createdAt       DateTime @default(now())
   }
   enum PayrollCycleStatus { DRAFT CALCULATING CALCULATED N1_PENDING N2_PENDING N3_PENDING PAID DIPE_SUBMITTED CLOSED }

API
===
- GET /api/daf/payroll/current (cycle en cours)
- GET /api/daf/payroll/:period
- GET /api/daf/payroll/:period/warnings (génère les 4 alertes pré-validation)
- POST /api/daf/payroll/:period/validate-n2 (si toutes alertes vérifiées)
- GET /api/daf/payroll/:period/state-pdf?type=full|dipe|irpp|wire-order

COMPOSANTS src/components/daf/payroll/
=======================================
- PayrollWorkflowBar.tsx ⚠️ RESPONSIVE COMPLEXE
- PayrollKpis.tsx (4 cards)
- PayrollWarningsList.tsx (les 4 alertes pré-validation)
- PayrollActionsCard.tsx (4 raccourcis)
- PayrollMassChart.tsx (Recharts barchart 12 mois, ResponsiveContainer)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Workflow statusbar (7 étapes) :
   - Desktop > 1280px : horizontal full, étapes lisibles
   - 1024-1280px : horizontal mais texte raccourci ("Pré-val.", "N1 RH"...)
   - 768-1024px : scroll horizontal forcé, 2 doigts utilisable
   - <768px : VERTICAL STACK avec connecteurs verticaux entre les étapes :
     ●━ Pré-validation ✓
     │
     ●━ Calcul ✓
     │
     ●━ N1 RH ✓
     │
     ◉━ N2 DAF (en cours, orange)
     │
     ○━ N3 DG
     │
     ○━ Virement
     │
     ○━ DIPE CNPS

2. Alertes pré-validation :
   - Toutes tailles : conservent le format card avec bordure colorée gauche,
     icône + texte + bouton, optimisée pour le tap

3. Graphe masse salariale :
   - Mobile : labels mois simplifiés (1 sur 2)

4. Bouton "Valider la paie Avril (N2)" :
   - Desktop : button-primary classique
   - Mobile : pleine largeur, sticky en bas (call-to-action principal de l'écran)

LIVRABLES
=========
- Prototype OK
- Code complet avec validation N2 fonctionnelle
- Workflow statusbar bascule en vertical sur mobile (CRITIQUE)
- Test : valider paie → cycle passe en N3_PENDING, notification au DG
- Commit "feat(daf): cycle de paie + workflow + alertes pré-validation — fn 1.4"
```

---

### PROMPT 1.5 — Recouvrement clients (avec scoring)

```
Fonction 1.5 : recouvrement clients avec balance âgée et niveaux de relance.

PROTOTYPE HTML
==============
L'écran screen-daf-recouvrement existe. Reproduire avec balance âgée et 8 dossiers actifs.

ÉLÉMENTS CLÉS
=============
- KPIs (Créances totales 684 M, DSO 58j, Échues 142 M, Encaissé YTD 2,12 Md)
- Balance âgée 5 tranches avec progress bars colorisées :
  · Non échu (vert)
  · Échu < 30j (ambre)
  · Échu 30-60j (ambre)
  · Échu 60-90j (rouge)
  · Échu > 90j douteux (rouge)
- Listview 8 dossiers en relance active avec niveau (R1 amiable bleu, R2 ferme orange,
  R3 mise en demeure rouge), retard en jours, dernière action, état

PRISMA
======
   model Receivable {
     id            String   @id @default(cuid())
     tenantId      String
     invoiceRef    String
     clientName    String
     clientId      String?
     amount        BigInt
     issueDate     DateTime
     dueDate       DateTime
     paidAmount    BigInt   @default(0)
     status        ReceivableStatus
     siteId        String?
     daysOverdue   Int      @default(0) // calculé
     reminders     Reminder[]
     createdAt     DateTime @default(now())
   }
   enum ReceivableStatus { OPEN PARTIALLY_PAID PAID OVERDUE LITIGATION WRITEOFF }

   model Reminder {
     id           String   @id @default(cuid())
     receivableId String
     receivable   Receivable @relation(fields: [receivableId], references: [id])
     level        ReminderLevel  // R1, R2, R3
     channel      ReminderChannel // EMAIL, LETTER, PHONE, BAILIFF
     sentAt       DateTime
     sentBy       String
     responseReceived Boolean @default(false)
     responseDate     DateTime?
     responseNote     String?  @db.Text
   }
   enum ReminderLevel { R1_AMIABLE R2_FIRM R3_FORMAL_NOTICE LITIGATION }
   enum ReminderChannel { EMAIL LETTER REGISTERED_MAIL PHONE BAILIFF }

API
===
- GET /api/daf/receivables/aging-balance
- GET /api/daf/receivables/active-reminders
- GET /api/daf/receivables/:id (détail dossier avec historique relances)
- POST /api/daf/receivables/:id/reminder (envoie une nouvelle relance, niveau + canal)
- POST /api/daf/receivables/:id/promise (enregistrer promesse de paiement)
- POST /api/daf/receivables/:id/litigation (passer en contentieux)
- POST /api/daf/receivables/campaign (campagne de relance en lot R1)

COMPOSANTS src/components/daf/receivables/
===========================================
- ReceivablesKpis.tsx
- AgingBalanceTable.tsx ⚠️ RESPONSIVE
- ActiveRemindersList.tsx ⚠️ RESPONSIVE
- ReceivableDetailModal.tsx (avec timeline relances)
- NewReminderModal.tsx (wizard niveau + canal + lettre)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Balance âgée :
   - Desktop : tableau 4 colonnes (tranche, montant, %, indicateur barre)
   - Mobile : cards superposées par tranche, barre de progression sous chaque ligne :
     ┌───────────────────────────┐
     │ Échu 60-90 j   2,2%       │
     │ 14 800 000 FCFA           │
     │ ▓░░░░░░░░░░░░ rouge       │
     └───────────────────────────┘

2. Listview dossiers actifs :
   - Desktop : 8 colonnes
   - Mobile : cards par dossier :
     ┌────────────────────────────┐
     │ SCI Bastos Plus      🟠 R2 │
     │ FAC-2026-005               │
     │ 38 400 000 · retard 68j    │
     │ ─────────────────────      │
     │ Promesse 15/05             │
     │ Dernière action 02/05      │
     │ [Suivi]                    │
     └────────────────────────────┘

3. Modale "Nouvelle relance" :
   - Plein écran sur mobile, étapes paginées (niveau → canal → lettre → confirmation)

LIVRABLES
=========
- Prototype OK
- Code complet
- Test : créer une relance R1 sur SCI Bastos → email envoyé, historique mis à jour
- Mobile : cards dossiers tap-friendly, modale plein écran fonctionnelle
- Commit "feat(daf): recouvrement clients + balance âgée + relances — fn 1.5"
```

---

### PROMPT 1.6 — Fiscalité & déclarations

```
Fonction 1.6 : pilotage des échéances fiscales et sociales.

PROTOTYPE HTML
==============
L'écran screen-daf-fiscal existe. Reproduire avec 6 échéances 30 jours.

ÉLÉMENTS CLÉS
=============
- KPIs (Échéances 30j, Montant à payer, TVA crédit, Conformité YTD 100%)
- Tableau échéancier réglementaire avec dates en mono colorisées (rouge urgent J+6,
  ambre J+22, gris J+37) : TVA Avril, DIPE CNPS Avril, IRPP Avril, Taxes annexes,
  DSF liasse fiscale 2025, Acompte IS T2
- Card "Dépôts récents" (3 derniers : DIPE Mars, TVA Mars, IRPP Mars avec accusés OK)
- Card "Audits et contrôles fiscaux" (vérification CIME en cours, audit CAC 2025 clos,
  contrôle CNPS programmé 25 mai)

PRISMA
======
   model TaxDeadline {
     id            String   @id @default(cuid())
     tenantId      String
     type          TaxType
     authority     TaxAuthority
     period        String
     dueDate       DateTime
     amount        BigInt?
     declarationStatus DeclarationStatus
     paymentStatus PaymentStatus
     declaredAt    DateTime?
     paidAt        DateTime?
     receiptUrl    String?
     createdAt     DateTime @default(now())
   }
   enum TaxType { VAT IRPP CNPS_DIPE CFC FNE RAV TC CAC IS_INSTALLMENT IS_BALANCE DSF_FILING TAXES_ANNEXES OTHER }
   enum TaxAuthority { DGI CNPS COMMUNE CNAM_OCCUPATIONAL OTHER }
   enum DeclarationStatus { PENDING PREPARED SUBMITTED ACCEPTED REJECTED }
   enum PaymentStatus { PENDING SCHEDULED PAID OVERDUE }

   model TaxAudit {
     id            String   @id @default(cuid())
     tenantId      String
     type          AuditType
     authority     TaxAuthority
     period        String
     auditor       String?
     status        AuditStatus
     startDate     DateTime
     endDate       DateTime?
     opinion       String?
     adjustmentsAmount BigInt?
   }
   enum AuditType { TAX_VERIFICATION CNPS_CONTROL EXTERNAL_AUDIT CAC INTERNAL }
   enum AuditStatus { ANNOUNCED IN_PROGRESS CONTRADICTORY CLOSED CHALLENGED }

API
===
- GET /api/daf/tax/deadlines?days=30
- GET /api/daf/tax/deadlines/:id/prepare (génère pré-déclaration)
- POST /api/daf/tax/deadlines/:id/declare (soumet, marque submitted)
- POST /api/daf/tax/deadlines/:id/pay (enregistre paiement)
- GET /api/daf/tax/recent-submissions
- GET /api/daf/tax/audits
- GET /api/daf/tax/audits/:id

COMPOSANTS src/components/daf/fiscal/
======================================
- FiscalKpis.tsx
- TaxDeadlinesTable.tsx ⚠️ RESPONSIVE
- RecentSubmissionsList.tsx
- AuditsList.tsx
- PrepareDeclarationModal.tsx (génère le PDF officiel format CNPS/DGI)

RESPONSIVE — RÈGLES SPÉCIFIQUES
================================
1. Tableau échéancier :
   - Desktop : 7 colonnes avec date en mono colorisée à gauche
   - Mobile : cards par échéance, date proéminente en haut :
     ┌─────────────────────────────┐
     │ 🔴 15/05/2026 · J+6         │
     │ TVA mensuelle               │
     │ DGI · Avril 2026            │
     │ 28 400 000 FCFA             │
     │ ─────────────────────────   │
     │ [Préparer dépôt]            │
     └─────────────────────────────┘

2. Cards dépôts récents et audits :
   - Format inchangé sur toutes tailles (déjà optimisé liste verticale)

LIVRABLES
=========
- Prototype OK
- Code complet
- Génération PDF officiel DIPE / IRPP / TVA fonctionnelle (mise en page conforme)
- Mobile : cards échéances tap-friendly
- Commit "feat(daf): fiscalité et déclarations — fn 1.6"
```

---

## ✅ FIN BLOC 1

Une fois les 6 fonctions livrées, demande-moi le Bloc 2 :
"Bloc 1 DAF terminé. Tu peux me livrer le Bloc 2."
