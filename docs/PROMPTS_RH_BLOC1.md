# RH · DÉVELOPPEMENT — Bloc 0 (Préambule) + Bloc 1 (Espace RH)

**Profil cible :** RH (Sandrine ONANA · BatimCAM SA)

**Méthode :** 1 prompt = 1 fonction. Chaque prompt enrichit en parallèle le prototype HTML
ET le code React/API. Chaque livrable doit être **pleinement responsive et VÉRIFIÉ** sur
7 tailles d'écran : 1920 / 1440 / 1280 / 1024 / 768 / 414 / 375.

---

## ⚠️ PROTOCOLE DE VÉRIFICATION RESPONSIVE OBLIGATOIRE

À chaque prompt, l'agent ne peut PAS commit avant d'avoir lancé ce script de test
automatisé qui détecte les débordements horizontaux :

```bash
# Installer Playwright si absent (1 fois)
pnpm add -D @playwright/test
pnpm exec playwright install chromium

# Créer scripts/audit-responsive.ts (ci-dessous) puis lancer :
pnpm exec tsx scripts/audit-responsive.ts <route-à-tester>
```

Contenu du script `scripts/audit-responsive.ts` :

```typescript
import { chromium } from 'playwright';

const SIZES = [
  { w: 1920, h: 1080, name: 'desktop-1920' },
  { w: 1440, h: 900, name: 'laptop-1440' },
  { w: 1280, h: 800, name: 'desktop-1280' },
  { w: 1024, h: 768, name: 'tablet-1024' },
  { w: 768, h: 1024, name: 'tablet-768' },
  { w: 414, h: 896, name: 'mobile-414' },
  { w: 375, h: 667, name: 'mobile-375' },
];

const route = process.argv[2] || '/';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login démo
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', 'sandrine@batimcam.cm');
  await page.fill('input[name="password"]', 'Demo2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|rh/);

  let problems = 0;
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.goto(`${baseUrl}${route}`);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });
    const status = overflow <= 1 ? '✅' : '❌';
    console.log(`${status} ${size.name.padEnd(15)} overflow=${overflow}px`);
    if (overflow > 1) problems++;
    await page.screenshot({ path: `audit-${size.name}.png`, fullPage: false });
  }

  await browser.close();

  if (problems > 0) {
    console.error(`\n❌ ${problems} taille(s) avec débordement. Corriger avant commit.`);
    process.exit(1);
  } else {
    console.log('\n✅ Toutes les tailles OK.');
  }
})();
```

**Règle absolue :** si le script renvoie un code de sortie != 0, l'agent doit corriger
AVANT de proposer le commit. Pas de "c'est responsive" non vérifié.

---

## RÈGLES CSS PRÉ-INTÉGRÉES À CHAQUE PAGE RH

L'agent doit ajouter ces règles dans `globals.css` ou un module CSS partagé pour toutes
les pages de l'Espace RH (`src/app/(app)/rh/`) :

```css
/* Containers RH : empêcher tout débordement horizontal */
[data-rh-screen] {
  max-width: 100vw;
  overflow-x: hidden;
}
[data-rh-screen] .rh-page {
  max-width: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  overflow-x: hidden;
  box-sizing: border-box;
  padding: 16px;
}
@media (max-width: 768px) {
  [data-rh-screen] .rh-page { padding: 12px; }
}
[data-rh-screen] .rh-page > * {
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
```

Et chaque page racine RH doit avoir l'attribut `data-rh-screen` sur son container :

```tsx
export default function RhDashboardPage() {
  return (
    <div data-rh-screen>
      <div className="rh-page">
        {/* contenu */}
      </div>
    </div>
  );
}
```

---

## 🟪 PROMPT 0 — PRÉAMBULE RH

**À coller dans Claude Code dans une nouvelle conversation.**

```
Phase de développement du profil RH (Sandrine ONANA).

CONTEXTE
========
- Le MVP J0-J7 est livré et déployé.
- Les profils DG et DAF ont déjà été développés (ou sont en cours).
- Le prototype HTML contient les écrans Espace RH suivants :
  * screen-rh-dashboard (Tableau de bord)
  * screen-rh-personnel (Annuaire 487 collaborateurs)
  * screen-rh-paie-saisie (Saisie variables paie)
  * screen-rh-recrutement (Pipeline kanban)
  Et les 4 autres écrans (Congés, Formations, Visites médicales, Disciplinaire) seront
  ajoutés au prototype au fur et à mesure des prompts.

CONVENTIONS
============
- Écrans prototype : id="screen-rh-<fonction>"
- Pages Next.js : src/app/(app)/rh/<fonction>/page.tsx
- Composants : src/components/rh/<NomFonction>.tsx
- API routes : src/app/api/rh/<fonction>/route.ts
- Hooks : src/hooks/useRh<Fonction>.ts
- Toutes les pages RH ont l'attribut data-rh-screen sur leur container racine

EXIGENCE RESPONSIVE — NON-NÉGOCIABLE
=====================================
1. Avant chaque commit, lancer obligatoirement :
   pnpm exec tsx scripts/audit-responsive.ts /rh/<route-livrée>
2. Si le script signale un débordement, CORRIGER AVANT le commit
3. Inclure dans le message de commit le résultat du script :
   "✅ Audit responsive : 7/7 tailles OK"
4. Ne JAMAIS écrire "c'est responsive" sans avoir lancé le script

TÂCHES PRÉPARATOIRES
====================

1. Lis le prototype HTML, concentre-toi sur les 4 écrans Espace RH existants.

2. Crée le script scripts/audit-responsive.ts (cf. spec ci-dessus).
   Teste-le avec la commande :
     pnpm exec tsx scripts/audit-responsive.ts /
   Vérifie qu'il login correctement et capture les 7 tailles.

3. Ajoute dans globals.css les règles CSS data-rh-screen (cf. spec ci-dessus).

4. Crée le layout dédié src/app/(app)/rh/layout.tsx :
   - Vérifie que l'utilisateur a Role.HR (sinon redirect /dashboard)
   - Affiche un breadcrumb "Espace RH > <fonction>"
   - Wrap children dans <div data-rh-screen className="rh-page">{children}</div>

5. Sidebar : vérifie qu'elle affiche la section "Espace RH" UNIQUEMENT pour les
   utilisateurs avec Role.HR. Items :
   - Tableau de bord → /rh
   - Personnel → /rh/personnel (badge 487)
   - Saisie de paie → /rh/paie (badge alerte mois courant)
   - Recrutement → /rh/recrutement (badge nb candidats actifs)
   - Congés & absences → /rh/conges (badge nb demandes en attente)
   - Formations → /rh/formations
   - Visites médicales → /rh/medical (badge alerte)
   - Disciplinaire → /rh/disciplinaire (badge nb)

6. Crée la table Prisma "rh_settings" :
     model RhSettings {
       id           String   @id @default(cuid())
       userId       String   @unique
       user         User     @relation(fields: [userId], references: [id])
       alertsConfig Json?
       updatedAt    DateTime @updatedAt
     }
   Migration : pnpm prisma migrate dev --name rh_settings

LIVRABLES
=========
- Layout RH protégé par rôle, fonctionnel
- Section sidebar Espace RH visible uniquement pour Sandrine ONANA
- Script audit-responsive.ts fonctionnel et testé
- Règles CSS data-rh-screen en place dans globals.css
- Test : connexion en RH affiche la sidebar enrichie ; connexion en DG ou DAF
  ne montre PAS la section RH
- Audit responsive : 7/7 OK sur la page /rh (vide pour l'instant)
- Commit "chore(rh): bootstrap espace RH + protocole responsive"

Une fois validé, attends mon prompt 1.1.
```

---

## 🟪 BLOC 1 — Espace RH (8 fonctions)

### PROMPT 1.1 — Tableau de bord RH

```
Fonction 1.1 : tableau de bord RH (point d'entrée Sandrine ONANA).

PROTOTYPE HTML
==============
L'écran screen-rh-dashboard existe dans le prototype. Le reproduire en React.

ÉLÉMENTS CLÉS À REPRODUIRE
===========================
- KPIs (487 effectif, 432 présents 88,7%, 12 embauches en cours, 9 validations en attente)
- Section "Alertes RH" avec 5 alertes contextualisées :
  · 5 visites médicales urgentes (rouge)
  · 8 recyclages CACES expirent 60j (rouge)
  · 3 CDD à décider ce mois (orange) — P. ABEGA, J. NDONGO, F. MBALLA
  · 7 demandes de congés en attente (orange)
  · Saisie paie Avril à finaliser avant 28/04 18h (bleu, action)
- Graphe "Évolution effectifs 12 mois" en aire violette (380 → 487)
- Donut "Répartition par catégorie" (Cadres ETAM 110, OQ 78, OS 147, Journaliers 152)
- Tableau "Embauches en cours" avec 5 candidats (Hervé MOUKAM, Sylvie ATANGANA,
  Thierry NJOYA, Achille BIYIK, Aïssatou BOUBA)

PRISMA
======
Étendre le model User avec un champ helper si besoin, ou créer un model RhAlert :

   model RhAlert {
     id        String   @id @default(cuid())
     tenantId  String
     type      RhAlertType
     severity  AlertSeverity
     title     String
     details   String?
     link      String?
     resolved  Boolean  @default(false)
     createdAt DateTime @default(now())
   }
   enum RhAlertType { MEDICAL_VISIT_DUE TRAINING_RECYCLE_DUE CDD_ENDING LEAVE_REQUEST_PENDING PAYROLL_INPUT_DEADLINE }

API
===
- GET /api/rh/dashboard
  Renvoie {
    kpis: { totalHeadcount, presentToday, presentRate, hiringInProgress, pendingValidations },
    alerts: RhAlert[],
    headcountEvolution12m: [...],
    categoryBreakdown: [...],
    hiringPipeline: [{ candidateName, position, site, stage, expectedStartDate }]
  }

COMPOSANTS src/components/rh/dashboard/
========================================
- RhKpiRow.tsx (4 cards, grille 4col → 2x2 mobile)
- RhAlertsList.tsx (5 alertes avec barre colorée gauche)
- HeadcountEvolutionChart.tsx (Recharts AreaChart, ResponsiveContainer)
- CategoryDonut.tsx (Recharts PieChart avec légende latérale, empilée mobile)
- HiringPipelineTable.tsx (transformation cards mobile)

⚠️ RESPONSIVE — RÈGLES SPÉCIFIQUES
===================================
1. KPIs : grille 4 col → 2x2 (768px) → 1 col (480px)
2. Donut + légende : flex row desktop → column mobile
3. Tableau embauches : transformation cards par candidat sur mobile, avec :
   ┌──────────────────────────────┐
   │ Hervé MOUKAM                 │
   │ ─────────────────────────    │
   │ Poste       Cond. travaux    │
   │ Chantier    Bastos R+8       │
   │ Étape       ✓ Contrat signé  │
   │ Date entrée 15/05/2026       │
   │ ─────────────────────────    │
   │ [Suivi]                      │
   └──────────────────────────────┘
4. Graphe évolution : ResponsiveContainer Recharts, hauteur 220 → 180 → 160px
5. Action bar : view-header en flex-wrap, boutons stack vertical sur mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
Avant commit, lancer :
  pnpm dev (dans un terminal)
  pnpm exec tsx scripts/audit-responsive.ts /rh

Le script doit afficher :
  ✅ desktop-1920    overflow=0px
  ✅ laptop-1440     overflow=0px
  ✅ desktop-1280    overflow=0px
  ✅ tablet-1024     overflow=0px
  ✅ tablet-768      overflow=0px
  ✅ mobile-414      overflow=0px
  ✅ mobile-375      overflow=0px

Si UNE seule taille échoue, corriger avant commit.

LIVRABLES
=========
- Code complet conforme au prototype
- 7 captures d'écran générées par le script
- Commit "feat(rh): tableau de bord — fn 1.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.2 — Personnel (annuaire 487)

```
Fonction 1.2 : annuaire complet du personnel.

PROTOTYPE HTML
==============
L'écran screen-rh-personnel existe. Reproduire avec :
- Filtres avancés (recherche + 4 selects : statuts / catégories / chantiers / contrat)
- Tableau 487 collaborateurs paginé (8 par défaut affichés, pagination 1-61)

ÉLÉMENTS CLÉS
=============
- Recherche full-text (nom, matricule, n° CNPS, téléphone)
- 4 selects : Tous statuts / Toutes catégories / Tous chantiers / Type contrat
- Listview : Matricule mono, Identité avec avatar+téléphone, Poste, Catégorie,
  Contrat (chip), Affectation, Ancienneté, N° CNPS
- Bouton "+ Nouvel employé" qui ouvre modale création complète
- Bouton "Fiche" par ligne → ouvre détail employé

PRISMA
======
Étendre le model User existant avec champs si manquants :
   identityCard      String?  // CNI
   familyStatus      String?  // marié, célibataire...
   childrenCount     Int      @default(0)
   address           Json?    // { city, neighborhood, ... }
   emergencyContact  Json?
   bankAccount       Json?    // pour virement paie

   model EmployeeDocument {
     id         String   @id @default(cuid())
     userId     String
     user       User     @relation(fields: [userId], references: [id])
     type       DocumentType
     title      String
     fileUrl    String
     uploadedAt DateTime @default(now())
     uploadedBy String
   }
   enum DocumentType { CNI CONTRACT MEDICAL_CERT TRAINING_CERT BANK_RIB CV OTHER }

API
===
- GET /api/rh/personnel?search=&status=&category=&site=&contract=&page=&limit=
- GET /api/rh/personnel/:id (détail complet)
- POST /api/rh/personnel (création)
- PATCH /api/rh/personnel/:id (modification)
- POST /api/rh/personnel/:id/documents (upload doc)
- GET /api/rh/personnel/export?format=xlsx (export Excel paginé full)

COMPOSANTS src/components/rh/personnel/
========================================
- PersonnelFilters.tsx (recherche + 4 selects, grille 5col → 1col mobile)
- PersonnelTable.tsx (transformation cards verticales sur mobile avec labels intégrés)
- PersonnelPagination.tsx (compact sur mobile)
- EmployeeFormModal.tsx (création/édition, plein écran sur mobile)
- EmployeeFiche.tsx (détail multi-onglets : Identité / Pro / Documents / Paie / Activité)

⚠️ RESPONSIVE — RÈGLES SPÉCIFIQUES
===================================
1. Filtres : grille 5 col (recherche2fr + 4selects) → 3 col tablette → 1 col mobile
2. Tableau Personnel : sur mobile, transformation totale en cards :
   ┌──────────────────────────────┐
   │ EMP-2018-00001               │  ← matricule mono petit
   │ Albert DAAYANG               │  ← nom en grand
   │ +237 6 77 12 34 56           │  ← téléphone
   │ ─────────────────────────    │
   │ Poste       Directeur Gén.   │
   │ Catégorie   Cadre Sup HC     │
   │ Contrat     CDI              │
   │ Affectation Siège            │
   │ Anc.        8 ans            │
   │ N° CNPS     10-1000001-A     │
   │ ─────────────────────────    │
   │ [Fiche]                      │  ← pleine largeur 40px
   └──────────────────────────────┘
3. Modale "Nouvel employé" : plein écran sur mobile avec stepper en haut
4. Pagination : flex-wrap sur mobile, boutons compacts

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/personnel

LIVRABLES
=========
- Code complet
- Recherche full-text fonctionnelle (debounced 300ms)
- Export Excel des 487 employés fonctionnel
- Audit responsive 7/7 OK
- Commit "feat(rh): personnel + filtres + export — fn 1.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.3 — Saisie de paie (variables mensuelles)

```
Fonction 1.3 : saisie des éléments variables de paie (heures sup, primes, avances...).

PROTOTYPE HTML
==============
L'écran screen-rh-paie-saisie existe. Reproduire avec :
- Workflow paie statusbar 6 étapes (étape "Saisie variables (moi)" en orange)
- KPIs (487 bulletins, 142/175 saisis = 81%, 1248h sup, 32 avances)
- Onglets par catégorie (Journaliers 175 / Heures sup permanents / Primes / Avances / Retenues)
- Tableau de saisie inline éditable avec inputs numériques par employé

PRISMA
======
   model PayrollInput {
     id          String   @id @default(cuid())
     payrollCycleId String
     payrollCycle PayrollCycle @relation(fields: [payrollCycleId], references: [id])
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     daysWorked  Int      @default(0)
     hoursWorked Float    @default(0)
     overtimeHours Float  @default(0)
     bonuses     Json     @default("[]")  // [{ code, label, amount }]
     advances    BigInt   @default(0)
     deductions  Json     @default("[]")
     savedAt     DateTime?
     savedBy     String?
   }

API
===
- GET /api/rh/payroll/current-cycle
- GET /api/rh/payroll/cycles/:id/inputs?category=&search=
- PATCH /api/rh/payroll/cycles/:id/inputs/:userId (auto-save sur blur)
- POST /api/rh/payroll/cycles/:id/calculate (lance le calcul de tous les bulletins)
- POST /api/rh/payroll/cycles/:id/import-csv (import en lot)
- POST /api/rh/payroll/cycles/:id/validate-n1 (validation RH N1)

COMPOSANTS src/components/rh/payroll-input/
============================================
- PayrollWorkflowBar.tsx (statusbar 6 étapes, vertical stack mobile)
- PayrollInputKpis.tsx (4 cards)
- PayrollCategoryTabs.tsx (scroll horizontal mobile)
- PayrollInputTable.tsx (inline editing avec auto-save, transformation cards mobile)
- PayrollImportModal.tsx
- PayrollCalculateConfirm.tsx (modale confirmation lancement calcul)

⚠️ RESPONSIVE — RÈGLES SPÉCIFIQUES
===================================
1. Workflow statusbar : horizontal desktop → vertical mobile (cf. DAF fn 1.4)
2. KPIs : 4 col → 2x2 → 1 col
3. Tableau saisie : sur mobile, transformation en cards par employé :
   ┌──────────────────────────────┐
   │ JRN-2026-00472               │  ← matricule
   │ Pierre ABEGA                 │  ← nom grand
   │ Pont Mfoundi                 │  ← chantier
   │ ─────────────────────────    │
   │ Jours       [22 ]            │  ← input 80px
   │ Tarif/jour  8 500            │
   │ H. supp     [14 ]            │
   │ Prime       [22 ]            │
   │ ─────────────────────────    │
   │ Total brut  227 700 ✓        │  ← grand mono
   └──────────────────────────────┘
4. Inputs numériques : largeur 80px desktop → 100% mobile, hauteur min 38px
5. Auto-save : indicateur visuel pulse violet pendant le save (UX importante mobile)
6. Bouton "Lancer calcul paie Avril" : sticky bottom sur mobile (CTA principal)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/paie

LIVRABLES
=========
- Code complet avec auto-save (debounced 800ms après dernier input)
- Test : modifier 22 → 23 jours, attendre 1s, vérifier persistance via Prisma Studio
- Test : import CSV de 50 saisies → vérifier création atomique (transaction)
- Audit responsive 7/7 OK
- Commit "feat(rh): saisie de paie + workflow + auto-save — fn 1.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.4 — Recrutement (pipeline kanban + offres)

```
Fonction 1.4 : pipeline recrutement avec kanban candidats et gestion des offres.

PROTOTYPE HTML
==============
L'écran screen-rh-recrutement existe. Reproduire avec :
- KPIs (5 offres, 142 candidatures, 8 entretiens, 3 embauches)
- Pipeline kanban 5 colonnes (Reçues 28 / Présélection 15 / Entretien 8 / Décision 4 / Embauchés 3)
- Tableau offres publiées (REC-2026-008 à 012)

PRISMA
======
Les models JobOffer et Application existent depuis le MVP. Les enrichir :
   model JobOffer {
     ...
     hiringManager String?  // userId du DG/DT qui valide
     internalOnly  Boolean  @default(false)
     diffusionChannels String[] // PORTAL, LINKEDIN, JOBBOARD, REFERRAL
   }

   model Application {
     ...
     stage         AppStage // existe déjà : RECEIVED SHORTLISTED INTERVIEW TECHNICAL_TEST OFFER HIRED REJECTED
     interviews    Interview[]
     scoring       Json?    // { technical, soft, motivation, overall }
     internalNotes String?  @db.Text
   }

   model Interview {
     id            String   @id @default(cuid())
     applicationId String
     application   Application @relation(fields: [applicationId], references: [id])
     scheduledAt   DateTime
     duration      Int      @default(60)
     interviewers  String[] // userIds
     mode          InterviewMode
     location      String?
     completed     Boolean  @default(false)
     feedback      String?  @db.Text
     score         Int?     // 1-5
     decision      InterviewDecision?
   }
   enum InterviewMode { ONSITE PHONE VIDEO }
   enum InterviewDecision { GO NO_GO PENDING }

API
===
- GET /api/rh/recruitment/dashboard
- GET /api/rh/recruitment/pipeline (kanban groupé par stage)
- PATCH /api/rh/recruitment/applications/:id/stage (drag-and-drop kanban)
- GET /api/rh/recruitment/applications/:id (détail candidat avec CV, entretiens, scoring)
- POST /api/rh/recruitment/applications/:id/interviews (planifier entretien)
- POST /api/rh/recruitment/applications/:id/hire (finaliser embauche → crée User)
- GET /api/rh/recruitment/offers (liste offres avec stats candidatures)
- POST /api/rh/recruitment/offers (publier nouvelle offre)
- PATCH /api/rh/recruitment/offers/:id/status (PUBLISH/CLOSE)

COMPOSANTS src/components/rh/recruitment/
==========================================
- RecruitmentKpis.tsx
- KanbanBoard.tsx ⚠️ RESPONSIVE CRITIQUE
- KanbanColumn.tsx (header avec compteur)
- CandidateCard.tsx (carte draggable)
- ApplicationDetailDrawer.tsx (panneau latéral, plein écran mobile)
- InterviewSchedulerModal.tsx
- HiringWizard.tsx (wizard finalisation embauche)
- OffersTable.tsx (cards mobile)
- OfferFormModal.tsx (création offre, plein écran mobile)

⚠️ RESPONSIVE — KANBAN CRITIQUE
===================================
1. Desktop > 1280px : kanban 5 colonnes alignées
2. 1024-1280px : kanban 5 colonnes mais cards resserrées (padding réduit)
3. 768-1024px : kanban 3 colonnes avec scroll horizontal pour voir les 2 dernières
4. < 768px : kanban en flex horizontal scrollable avec scroll-snap, chaque colonne
   fait 240px de large, snap-align start
   CSS critique :
   .kanban-board {
     display: flex; overflow-x: auto;
     -webkit-overflow-scrolling: touch;
     scroll-snap-type: x mandatory;
     gap: 10px; padding-bottom: 8px;
   }
   .kanban-column { flex: 0 0 240px; scroll-snap-align: start; }
5. Cards candidats : drag-and-drop desktop, sur mobile bouton "Déplacer" qui ouvre
   bottom sheet "Vers quelle étape ?"
6. Modale détail candidature : drawer latéral 480px desktop, plein écran mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/recrutement

LIVRABLES
=========
- Code complet
- Test : drag-and-drop d'un candidat de "Présélection" → "Entretien" met à jour le stage
- Test mobile : tap sur card → bottom sheet → "Vers Entretien" → kanban scrolle vers la
  bonne colonne
- Audit responsive 7/7 OK
- Commit "feat(rh): recrutement — kanban + offres + entretiens — fn 1.4
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.5 — Congés et absences

```
Fonction 1.5 : gestion congés + absences journaliers.

PROTOTYPE HTML
==============
L'écran screen-rh-conges N'EXISTE PAS encore dans le prototype. À créer.

ÉLÉMENTS À CRÉER DANS LE PROTOTYPE
===================================
1. Header : "Congés et absences" + sélecteur mois (Mai 2026)
2. Onglets :
   - Demandes en attente (7 - badge alerte)
   - Calendrier équipes (vue mois)
   - Soldes par employé
   - Absences journaliers
3. Onglet "Demandes en attente" :
   Listview demandes :
   employé | type (CP, RTT, sans solde, maladie) | période (du/au) | jours |
   solde restant après | motif | statut (En attente RH / OK chef équipe)
   Boutons Valider / Refuser / Demander info
4. Onglet "Calendrier équipes" :
   Vue calendrier mensuelle avec rangées par employé et cases colorées (CP=vert,
   maladie=rouge, formation=bleu, RTT=violet). Filtre par chantier.
5. Onglet "Soldes" :
   Listview employé | CP acquis | CP pris | CP solde | RTT solde | dernière prise
6. Onglet "Absences journaliers" :
   Tableau de pointage avec absences déclarées (justifiées/non justifiées).

⚠️ RESPONSIVE — pendant la création du prototype, RESPECTER :
- Pas de max-width:1400px en inline sur la page (utiliser une classe)
- KPIs en grille avec min-width:0
- Tableaux préparés pour transformation en cards mobile (data-label sur td)
- Calendrier : scroll horizontal sur mobile (semaines visibles sur 1024+, jours sur mobile)

PRISMA
======
   model LeaveRequest {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     type        LeaveType
     startDate   DateTime
     endDate     DateTime
     daysCount   Float
     reason      String?
     status      LeaveStatus
     n1ValidatedBy String? // chef d'équipe
     n1ValidatedAt DateTime?
     rhValidatedBy String?
     rhValidatedAt DateTime?
     createdAt   DateTime @default(now())
   }
   enum LeaveType { PAID_LEAVE RTT UNPAID SICK MATERNITY PATERNITY FAMILY OTHER }
   enum LeaveStatus { PENDING N1_APPROVED RH_APPROVED REJECTED CANCELLED }

   model LeaveBalance {
     id           String   @id @default(cuid())
     userId       String   @unique
     user         User     @relation(fields: [userId], references: [id])
     paidLeaveAcquired Float @default(0)
     paidLeaveTaken    Float @default(0)
     rttBalance        Float @default(0)
     lastTakenAt       DateTime?
     updatedAt    DateTime @updatedAt
   }

   model Absence {
     id        String   @id @default(cuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id])
     date      DateTime
     reason    AbsenceReason
     justified Boolean  @default(false)
     reportedBy String  // chef de chantier
     createdAt DateTime @default(now())
   }
   enum AbsenceReason { SICK FAMILY UNJUSTIFIED LATE STRIKE OTHER }

API
===
- GET /api/rh/leaves/pending
- POST /api/rh/leaves/:id/approve
- POST /api/rh/leaves/:id/reject (avec motif)
- GET /api/rh/leaves/calendar?month=2026-05&site=
- GET /api/rh/leaves/balances
- GET /api/rh/absences?date=&site=

COMPOSANTS src/components/rh/leaves/
=====================================
- PendingLeavesTable.tsx (cards mobile)
- TeamCalendar.tsx ⚠️ RESPONSIVE COMPLEXE
- LeaveBalancesTable.tsx
- AbsencesTable.tsx
- LeaveDecisionModal.tsx (valider avec commentaire)

⚠️ RESPONSIVE — CALENDRIER ÉQUIPES
====================================
- Desktop > 1280px : calendrier complet, 31 colonnes (jours), 1 ligne par employé
- 1024-1280px : 31 colonnes mais largeur réduite à 24px par jour
- 768-1024px : scroll horizontal, sticky column "employé"
- < 768px : un employé à la fois avec sélecteur en haut, calendrier vue mensuelle
  type Google Agenda (cellules cliquables)

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/conges

LIVRABLES
=========
- Prototype : nouvel écran screen-rh-conges (4 onglets)
- Code complet
- Test : valider une demande de congé → solde mis à jour, notif envoyée
- Audit responsive 7/7 OK
- Commit "feat(rh): congés + absences + calendrier équipes — fn 1.5
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.6 — Formations et certifications

```
Fonction 1.6 : plan de formation et suivi certifications obligatoires.

PROTOTYPE HTML
==============
L'écran screen-rh-formations N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Formations et certifications"
2. KPIs :
   - Budget formation 2026 : 18 M FCFA
   - Dépensé YTD : 6,2 M (34%)
   - Formations en cours : 12
   - Certifications expirant 60j : 8 (rouge)
3. Onglets :
   - Plan annuel 2026
   - Formations en cours
   - Certifications obligatoires (CACES, sécurité, métiers)
   - Recyclages à programmer
4. Onglet "Plan annuel" :
   Tableau formations programmées avec dates, participants, coût, statut
5. Onglet "Certifications obligatoires" :
   Listview employés avec leurs certifs CACES (R482 cat B1, R489, R486 nacelle...),
   date obtention, date expiration, statut (valide/à recycler/expiré)
   Filtres par type, par chantier, par échéance
6. Onglet "Recyclages à programmer" :
   Liste des certifs expirant 60j avec proposition de session de recyclage
   Bouton "Programmer session de recyclage"

PRISMA
======
   model Training {
     id          String   @id @default(cuid())
     tenantId    String
     title       String
     category    TrainingCategory
     provider    String?
     startDate   DateTime
     endDate     DateTime
     location    String?
     budgetEstimated BigInt
     budgetActual    BigInt?
     participants String[] // userIds
     status      TrainingStatus
     certificateUrl String?
   }
   enum TrainingCategory { SAFETY CACES TECHNICAL MANAGEMENT LANGUAGES OTHER }
   enum TrainingStatus { PLANNED CONFIRMED IN_PROGRESS COMPLETED CANCELLED }

   model Certification {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     type        String   // "CACES R482 cat B1", "Travail en hauteur", "SST"
     issuedAt    DateTime
     expiresAt   DateTime
     issuedBy    String
     certificateUrl String?
   }

API
===
- GET /api/rh/trainings
- POST /api/rh/trainings (création session)
- PATCH /api/rh/trainings/:id (modif)
- GET /api/rh/certifications
- GET /api/rh/certifications/expiring-soon?days=60
- POST /api/rh/certifications (enregistrer nouvelle certif)

⚠️ RESPONSIVE
==============
- Pas de débordement possible
- Tableaux → cards mobile avec date d'expiration en grand au-dessus si proche

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/formations

LIVRABLES
=========
- Prototype : screen-rh-formations
- Code complet
- 30 certifications seedées dont 8 expirant 60j (cohérent avec dashboard alertes)
- Audit responsive 7/7 OK
- Commit "feat(rh): formations + certifications + recyclages — fn 1.6
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.7 — Visites médicales

```
Fonction 1.7 : suivi médecine du travail.

PROTOTYPE HTML
==============
L'écran screen-rh-medical N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Visites médicales et aptitudes"
2. KPIs :
   - Visites prévues ce mois : 24
   - Visites en retard : 5 (rouge)
   - Aptes sans réserve : 462
   - Avec restrictions : 18 (orange)
3. Onglets :
   - Échéances (visites obligatoires à programmer)
   - Calendrier (planning des visites avec médecin)
   - Aptitudes (par employé : apte/restrictions/inapte)
   - Médecin du travail (contact + statistiques)
4. Onglet "Échéances" :
   Listview employés avec date dernière visite, type (embauche/périodique/reprise),
   échéance suivante, statut (à jour / J-30 ambré / dépassé rouge)
   Action "Programmer visite"

PRISMA
======
   model MedicalVisit {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     type        MedicalVisitType
     scheduledAt DateTime
     completedAt DateTime?
     fitnessVerdict FitnessVerdict?
     restrictions String?
     nextVisitDue DateTime?
     doctor      String?
     notes       String?  @db.Text
   }
   enum MedicalVisitType { HIRING PERIODIC RETURN_TO_WORK SPONTANEOUS }
   enum FitnessVerdict { FIT FIT_WITH_RESTRICTIONS UNFIT TEMPORARILY_UNFIT }

API
===
- GET /api/rh/medical/upcoming
- GET /api/rh/medical/overdue
- POST /api/rh/medical (programmer visite)
- PATCH /api/rh/medical/:id/complete (saisir résultat)

⚠️ RESPONSIVE — pareil que prompts précédents

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/medical

LIVRABLES
=========
- Prototype : screen-rh-medical
- Code complet
- 5 visites en retard seedées (cohérent avec alertes dashboard)
- Audit responsive 7/7 OK
- Commit "feat(rh): visites médicales + aptitudes — fn 1.7
   ✅ Audit responsive : 7/7 tailles OK"
```

---

### PROMPT 1.8 — Disciplinaire

```
Fonction 1.8 : avertissements, sanctions, départs négociés.

PROTOTYPE HTML
==============
L'écran screen-rh-disciplinaire N'EXISTE PAS. À créer.

ÉLÉMENTS À CRÉER
=================
1. Header : "Procédures disciplinaires et conflits sociaux"
2. KPIs :
   - Procédures en cours : 3
   - Avertissements 12 mois : 8
   - Conseils de discipline : 1
   - Départs négociés en cours : 2
3. Onglets :
   - Procédures actives
   - Historique sanctions
   - Départs négociés
   - Conflits collectifs
4. Onglet "Procédures actives" :
   Listview procédures avec employé, motif, étape (entretien préalable, sanction,
   recours), date, gravité

PRISMA
======
   model DisciplinaryCase {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     reason      String
     severity    DisciplinarySeverity
     stage       DisciplinaryStage
     openedAt    DateTime
     resolvedAt  DateTime?
     sanction    Sanction?
     facts       String   @db.Text
     notes       String?  @db.Text
     documents   String[]
   }
   enum DisciplinarySeverity { MINOR MAJOR CRITICAL }
   enum DisciplinaryStage { OPENED PRELIMINARY_INTERVIEW SANCTION_DECIDED APPEALED CLOSED }
   enum Sanction { WARNING REPRIMAND SUSPENSION_3D SUSPENSION_8D DISMISSAL_FAULT GROSS_MISCONDUCT_DISMISSAL }

API
===
- GET /api/rh/disciplinary
- POST /api/rh/disciplinary (ouvrir procédure)
- PATCH /api/rh/disciplinary/:id (avancer étape, saisir sanction)

⚠️ RESPONSIVE
==============
Données sensibles, écrans compacts. Tableaux → cards mobile avec gravité en couleur.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rh/disciplinaire

LIVRABLES
=========
- Prototype : screen-rh-disciplinaire
- Code complet
- 2 procédures actives seedées
- Audit responsive 7/7 OK
- Commit "feat(rh): disciplinaire + sanctions + départs — fn 1.8
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ FIN BLOC 1 — Espace RH (8 fonctions)

Une fois les 8 fonctions livrées, demande-moi le Bloc 2 :
"Bloc 1 RH terminé. Tu peux me livrer le Bloc 2."

Le Bloc 2 RH couvrira les modules transverses vue RH (Validations RH, Rapports RH,
Mon profil/paie/messagerie enrichis pour Sandrine).
