# T-ERP - Reference du Socle Actuel

Date de consolidation : `2026-04-10`

## 1. Objet

Ce document fixe la **verite documentaire du socle actuellement implemente**.

Il ne remplace pas :

- le [cahier des charges fonctionnel](cahier-des-charges-fonctionnel.md), qui reste la **cible produit**
- les [ERD](erd-base-de-donnees.md) et [ERD Stock + Finance](erd-stock-finance.md), qui restent la **cible de modelisation**
- la [documentation des routes API](routes-api-flask-detaillees.md), qui reste la **reference descriptive des endpoints**

Il sert a repondre a une question simple :

> qu'est-ce qui est vraiment expose, branche et exploitable dans le code aujourd'hui ?

## 2. Sources canoniques

En cas de doute, les sources de verite techniques sont, dans cet ordre :

1. backend expose :
   [backend/app/api/__init__.py](../backend/app/api/__init__.py)
2. modules frontend exposes par defaut :
   [frontend/src/shared/config/runtimeConfig.js](../frontend/src/shared/config/runtimeConfig.js)
3. navigation et garde de role :
   [frontend/src/shared/navigation/appNavigation.js](../frontend/src/shared/navigation/appNavigation.js)
   [frontend/src/shared/utils/operationalRoles.js](../frontend/src/shared/utils/operationalRoles.js)
4. wrappers role-aware :
   [frontend/src/features/dashboard/DashboardEntryPage.jsx](../frontend/src/features/dashboard/DashboardEntryPage.jsx)
   [frontend/src/features/finance/FinanceEntryPage.jsx](../frontend/src/features/finance/FinanceEntryPage.jsx)
   [frontend/src/features/inventory/InventoryEntryPage.jsx](../frontend/src/features/inventory/InventoryEntryPage.jsx)
   [frontend/src/features/payroll/PayrollEntryPage.jsx](../frontend/src/features/payroll/PayrollEntryPage.jsx)
   [frontend/src/features/chat/ChatEntryPage.jsx](../frontend/src/features/chat/ChatEntryPage.jsx)
   [frontend/src/features/calls/CallsEntryPage.jsx](../frontend/src/features/calls/CallsEntryPage.jsx)

## 3. Regles de lecture

- Le **cahier** exprime la cible et la priorisation, pas l'etat reel du code.
- Les **ERD** expriment la structure cible et la trajectoire de modelisation, pas uniquement les tables deja presentes.
- Les **routes API** doivent etre verifiees contre les blueprints/backend si une divergence apparait.
- Ce document est la **reference de perimetre implemente** pour le MVP reel et le socle actuellement exploitable.

## 4. Modules backend reels exposes

Les blueprints API actuellement enregistres sont :

- `auth`
- `companies`
- `users`
- `projects`
- `finance`
- `inventory`
- `attendance`
- `payroll`
- `planning`
- `procurement`
- `chat`
- `calls`
- `recruitment`
- `admin`

Reference :
[backend/app/api/__init__.py](../backend/app/api/__init__.py)

## 5. Modules frontend exposes par defaut

Les modules backend exposes par defaut dans le frontend sont :

- `companies`
- `users`
- `projects`
- `planning`
- `attendance`
- `finance`
- `inventory`
- `procurement`
- `recruitment`
- `payroll`
- `chat`
- `calls`

Reference :
[frontend/src/shared/config/runtimeConfig.js](../frontend/src/shared/config/runtimeConfig.js)

## 6. Statut officiel par domaine

| Domaine | Statut officiel | Decision documentaire |
|---|---|---|
| `companies` | reel et expose | module coeur, parcours d'onboarding referme |
| `users` | reel et expose | module coeur RH/personnel |
| `projects` | reel et expose | module coeur chantier/projet |
| `planning` | reel et expose | module transversal sans permission dediee, frontiere clarifiee avec la paie |
| `inventory` | reel et expose | module coeur, entree officielle rebranchee sur le module reel |
| `finance` | reel et expose | module reel, entree officielle rebranchee sur le module reel, encore a consolider |
| `payroll` | reel et expose | module reel, frontiere clarifiee avec planning et self-service |
| `procurement` | reel et expose | module reel, encore a consolider |
| `recruitment` | reel et expose | module reel, parcours entreprise/candidat referme |
| `chat` | reel et expose | module reel, entree officielle rebranchee sur le module reel |
| `calls` | reel et expose | module reel, entree officielle rebranchee sur le module reel |
| `admin` | reel backend seulement | capacite `super_admin`, pas module de navigation utilisateur |
| `correspondences` | fonctionnalite reelle | sous-espace de `companies`, pas module backend autonome |
| `attendance` | reel et expose | module RH operationnel reel, relie a `users`, `payroll` et `planning` |

## 7. Cas particuliers importants

### 7.1 `correspondences`

`correspondences` ne constitue pas un module backend autonome.

Il s'agit d'une fonctionnalite rattachee a l'espace entreprise :

- stockage et lecture via `companies`
- permission effective : `companies.read`
- exposition frontend maintenue comme entree specialisee

Conclusion :
**documenter `correspondences` comme sous-fonction de `companies`**.

### 7.2 `attendance`

`attendance` est desormais un module backend reel expose.

Le point d'entree frontend :

- [frontend/src/features/attendance/AttendancePage.jsx](../frontend/src/features/attendance/AttendancePage.jsx)

consomme maintenant un vrai domaine API :

- [backend/app/modules/attendance/routes.py](../backend/app/modules/attendance/routes.py)
- [backend/app/modules/attendance/service.py](../backend/app/modules/attendance/service.py)
- [backend/app/models/attendance.py](../backend/app/models/attendance.py)

Conclusion :
**documenter `attendance` comme module RH operationnel reel, encore a consolider avec la paie**.

### 7.3 `admin`

`admin` existe cote backend, mais il n'est pas expose comme module utilisateur navigable.

Il est consomme depuis des ecrans existants :

- dashboard super admin
- gestion des entreprises

Conclusion :
**documenter `admin` comme capacite transverse `super_admin`**.

## 8. Workspaces prototypes a distinguer des modules reels

### 8.1 Prototype comptable

Le workspace comptable reste un prototype frontend role-aware :

- seed mock :
  [frontend/src/features/comptable/data/mockComptableData.ts](../frontend/src/features/comptable/data/mockComptableData.ts)
- hook principal :
  [frontend/src/features/comptable/hooks/useComptableWorkspace.ts](../frontend/src/features/comptable/hooks/useComptableWorkspace.ts)
- persistance locale :
  `localStorage`

Il ne constitue plus le point d'entree officiel des modules reels suivants :

- inventory
- finance
- payroll

Il reste utile comme experience specialisee pour :

- le dashboard comptable
- des parcours internes encore prototypes
- des parcours comptables internes encore specialises

### 8.2 Prototype magasinier

Le workspace magasinier reste un prototype frontend role-aware :

- seed mock :
  [frontend/src/features/magasinier/data/mockMagasinierData.ts](../frontend/src/features/magasinier/data/mockMagasinierData.ts)
- hook principal :
  [frontend/src/features/magasinier/hooks/useMagasinierWorkspace.ts](../frontend/src/features/magasinier/hooks/useMagasinierWorkspace.ts)

Il ne constitue plus le point d'entree officiel des modules reels suivants :

- inventory
- chat
- calls

Il reste utile comme experience specialisee pour :

- le dashboard magasinier
- des parcours locaux encore prototypes

## 9. Consequences pour la documentation existante

### 9.1 Cahier

Le cahier reste valide comme vision produit et priorisation par phases.

Mais pour lire correctement la cible :

- `finance` est decrit comme `Phase 2` dans le cahier, alors qu'un module reel existe deja dans le code
- `procurement`, `chat`, `calls`, `payroll` et `planning` sont deja plus avances dans le code que dans la lecture strictement MVP du cahier

### 9.2 ERD

Les ERD doivent etre lus comme **cible de modelisation**.

En particulier :

- `erd-stock-finance.md` est un **ERD cible**
- `erd-base-de-donnees.md` doit etre relu avec prudence tant qu'il n'a pas ete re-synchronise avec les modules reels deja presents en finance, payroll, procurement, planning et admin

### 9.3 Routes API

La documentation `routes-api-flask-detaillees.md` reste utile, mais elle doit etre arbitree par le backend reel si une divergence apparait.

### 9.4 Fin d'etape 2

La fin d'etape 2 modifie la lecture du socle sur plusieurs points :

- le parcours `companies` est referme de l'inscription publique au premier usage
- `users` devient le noyau RH/personnel officiellement exploitable
- `projects`, `inventory` et `recruitment` sont refermes sur leurs parcours coeur
- `planning` et `payroll` ont une frontiere produit explicite
- les wrappers d'entree `finance`, `payroll`, `chat` et `calls` renvoient de nouveau vers les modules reels

### 9.5 Fin d'etape 3

La fin d'etape 3 modifie la lecture du socle RH sur plusieurs points :

- `attendance` devient un vrai domaine backend/frontend, avec permissions, policy et pointage journalier
- `payroll` ne porte plus seul les absences et conges ; il se synchronise avec `attendance`
- `users` devient le cockpit RH de reference pour le pilotage personnel, les alertes et le dossier sensible
- `planning` reste un module transverse, mais sa frontiere avec `attendance` et `payroll` est maintenant explicite
- les demandes RH suivent un vrai workflow d'approbation `manager -> RH -> direction` selon les cas

### 9.6 Fin de `E4.1.1` - source de verite finance par objet

Le sous-lot `E4.1.1` est considere comme **clos documentairement** avec la matrice suivante.

Elle fixe la lecture officielle des objets finance **dans le code reel**, avant les travaux ulterieurs sur les workflows plus avances.

| Objet | Source de verite officielle | Usage principal | Impact tresorerie | Regle de lecture |
|---|---|---|---|---|
| `FinanceEntry` | journal financier legacy / generique | historique comptable simple, ecritures finance historiques, appoint pour certains agrégats projet | indirect, pas par lui-meme | ne pas l'utiliser comme support principal du workflow depense / facture / paiement |
| `ExpenseRecord` | verite depense | cout operationnel, validation, depense projet, justificatif, arbitrage finance | oui, si approuvee avec compte de tresorerie et paiement cree | toute lecture des depenses doit partir d'ici |
| `RevenueRecord` | verite recette operationnelle | recette hors cycle facture client, encaissement direct, produit projet | oui, si un compte de tresorerie est rattache | ne pas le confondre avec un encaissement de facture |
| `Invoice` | verite facturation client | montant facture, reste du, echeance, statut client | indirect, via `InvoicePayment` puis `Payment` | toute lecture d'impaye ou de relance doit partir d'ici |
| `InvoicePayment` | verite du paiement rattache a une facture | trace d'un reglement de facture | indirect, relaie par creation d'un `Payment` | ne pas le confondre avec `RevenueRecord` |
| `Payment` | verite du flux de paiement metier | trace un encaissement ou decaissement relie a facture, depense ou recette | oui, via `TreasuryMovement` | c'est l'objet de reference pour la liste des paiements visibles |
| `TreasuryAccount` | verite du solde courant | caisse, banque, mobile money, solde disponible | oui, porte le solde courant | tout solde affiche doit venir d'ici |
| `TreasuryMovement` | verite du mouvement cash | flux entrants / sortants, historique tresorerie, cash-flow | oui, atomique | tout reporting de flux de tresorerie doit venir d'ici |

#### Regles de lecture officielles

- `ExpenseRecord` est la source de verite des depenses operationnelles.
- `RevenueRecord` est la source de verite des recettes operationnelles non facturees.
- `Invoice` est la source de verite des creances clients et des relances.
- `InvoicePayment` decrit l'evenement de reglement d'une facture.
- `Payment` decrit le paiement metier visible et relie aux autres objets finance.
- `TreasuryAccount` porte le solde courant des comptes de tresorerie.
- `TreasuryMovement` porte le flux cash reel et le running balance.
- `FinanceEntry` reste un support legacy/generique, encore pris en compte dans certains calculs projet, mais ne doit plus piloter les workflows coeur.

#### Consequences de lecture pour les ecrans et rapports

- cout projet : lire d'abord `ExpenseRecord`, avec `FinanceEntry` seulement comme heritage legacy tant que la compatibilite n'est pas retiree
- recette projet : lire `RevenueRecord`, puis `Invoice` pour la creance et `InvoicePayment` / `Payment` pour le recouvrement
- tresorerie courante : lire `TreasuryAccount`
- cash-flow : lire `TreasuryMovement`
- impayes clients : lire `Invoice` avec `effective_status`
- relances : exclure `draft`, `paid` et `cancelled`
- dashboard finance : les KPIs de recouvrement et de retard ne doivent pas etre derives depuis des objets non dedies

#### Point de vigilance assume

Le code conserve encore une compatibilite legacy via `FinanceEntry` dans `_project_actuals`.

Conclusion documentaire :

- c'est un **heritage temporaire admis**
- mais ce n'est **pas** la source de verite cible pour les nouveaux workflows finance
- les prochains travaux de consolidation doivent continuer a deplacer la lecture metier vers `ExpenseRecord`, `RevenueRecord`, `Invoice`, `Payment` et `TreasuryMovement`

### 9.7 Fin de `E4.1.2` - transitions critiques finance fermees

Le sous-lot `E4.1.2` est considere comme **clos sur le perimetre critique** avec les transitions suivantes.

#### Factures

- creation autorisee en `draft`, `sent` ou `cancelled`
- transition explicite `draft -> sent` via `POST /finance/invoices/<id>/send`
- transition explicite `draft|sent|overdue -> cancelled` tant qu'aucun paiement n'a ete impute
- paiement interdit sur `draft`
- paiement interdit sur `cancelled`
- annulation interdite des factures `partially_paid` ou `paid`
- les filtres et la lecture produit doivent partir de `effective_status`, pas du champ brut uniquement

#### Depenses

- creation autorisee en `draft`, `pending` ou `approved`
- creation interdite directement en `rejected`
- transition explicite `draft|pending -> approved`
- transition explicite `draft|pending -> rejected`
- une depense `approved` peut maintenant etre reglee apres coup via `POST /finance/expenses/<id>/payments`
- le reglement peut etre `partial` puis `paid`
- le reglement est interdit tant que la depense n'est pas `approved`
- une depense `rejected` ne peut plus etre re-approuvee
- une depense creee directement en `approved` porte maintenant bien une trace `approved_by_user_id` / `approved_at`, meme sans paiement immediat

#### Recettes

- une recette sans compte de tresorerie a la creation reste `uncollected`
- une recette peut maintenant etre encaissee apres coup via `POST /finance/revenues/<id>/payments`
- l'encaissement peut etre `partial` puis `collected`
- le systeme interdit tout encaissement superieur au solde restant
- les mouvements de tresorerie ne sont crees que lorsqu'un paiement/encaissement reel est poste

#### Validation ciblee de cloture

La fermeture du lot est appuyee par :

- [backend/tests/test_finance_invoice_statuses.py](../backend/tests/test_finance_invoice_statuses.py)
- [backend/tests/test_finance_settlement_transitions.py](../backend/tests/test_finance_settlement_transitions.py)
- [backend/tests/test_finance_profile_approval.py](../backend/tests/test_finance_profile_approval.py)
- [backend/tests/test_v1_critical_flows.py](../backend/tests/test_v1_critical_flows.py)

Conclusion documentaire :

- les transitions critiques `invoice`, `expense` et `revenue` ne sont plus implicites ou inaccessibles
- le domaine `finance` peut maintenant poursuivre sa consolidation sur les lots suivants (`E4.2+`) sans rouvrir le coeur des transitions critiques
- mais le coeur des passages de statut sensibles est maintenant **ferme et testable**

### 9.8 Fin de `E4.1.3` - coherence tresorerie stabilisee

Le sous-lot `E4.1.3` est considere comme **clos sur le socle de tresorerie** avec les garanties suivantes.

#### Regles fermes

- aucun mouvement de tresorerie n'est poste sans compte valide et actif
- la validation de solde ne repose plus seulement sur `current_balance`
- un mouvement date dans le passe est maintenant verifie contre la chronologie complete du compte
- un debit n'est plus autorise s'il ne pouvait etre couvert qu'en comptant une entree future
- `running_balance` est recalcule chronologiquement apres chaque nouveau mouvement
- `current_balance` est recalcule a partir de `opening_balance + treasury_movements`, pas seulement incremente a l'aveugle
- une re-approbation d'objet deja regle ne cree pas de paiement ou mouvement duplique

#### Consequences de lecture

- `TreasuryAccount.current_balance` doit etre lu comme **solde consolide recalcule**
- `TreasuryMovement.running_balance` doit etre lu comme **solde du compte a la date de ce mouvement dans la chronologie reelle**
- les listes de mouvements peuvent rester affichees en ordre descendant, mais la valeur `running_balance` correspond a l'ordre chronologique de calcul

#### Validation ciblee de cloture

La fermeture du lot est appuyee par :

- [backend/tests/test_finance_treasury_consistency.py](../backend/tests/test_finance_treasury_consistency.py)
- [backend/tests/test_finance_settlement_transitions.py](../backend/tests/test_finance_settlement_transitions.py)
- [backend/tests/test_finance_invoice_statuses.py](../backend/tests/test_finance_invoice_statuses.py)
- [backend/tests/test_v1_critical_flows.py](../backend/tests/test_v1_critical_flows.py)

Conclusion documentaire :

- la tresorerie n'est plus seulement protegee contre les erreurs "simples"
- elle est maintenant **coherente dans le temps**, y compris quand les mouvements sont saisis avec des dates anterieures
- le coeur `solde / mouvement / non-duplication` est considere comme stabilise pour la suite de `E4.1`

### 9.9 Fin de `E4.1.4` - cycle facture / paiement securise

Le sous-lot `E4.1.4` est considere comme **clos sur le cycle critique facture / reglement** avec les garanties suivantes.

#### Regles fermes

- une facture `draft` ou `cancelled` ne peut pas recevoir de paiement
- une facture `partially_paid` ou `paid` ne peut pas etre annulee
- chaque paiement de facture met a jour `amount_paid`, `amount_due`, `effective_status` et, a solde complet, `paid_on`
- le passage `sent -> partially_paid -> paid` est maintenant couvert explicitement par les tests
- l'historique des reglements est disponible par facture via `GET /finance/invoices/<id>/payments`
- chaque ligne d'historique expose le contexte utile de la facture : numero, client, total, montant deja regle et reste du

#### Consequences de lecture

- `Invoice.amount_due` doit etre lu comme **reste du reel a date**
- `Invoice.paid_on` doit etre lu comme **date de complet reglement**, pas comme date du premier paiement
- `InvoicePayment` doit etre lu comme **journal des reglements de la facture**, distinct du `Payment` metier global
- la liste globale des paiements reste utile pour la tresorerie, mais la lecture detaillee du recouvrement facture se fait maintenant par l'historique dedie

#### Validation ciblee de cloture

La fermeture du lot est appuyee par :

- [backend/tests/test_finance_invoice_statuses.py](../backend/tests/test_finance_invoice_statuses.py)
- [backend/tests/test_v1_critical_flows.py](../backend/tests/test_v1_critical_flows.py)

Conclusion documentaire :

- le cycle `facture -> paiement partiel -> paiement final -> solde nul` est maintenant **ferme et testable**
- le reste du travail finance peut se concentrer sur les KPIs, dashboards et ambiguities UI sans rouvrir le coeur du recouvrement

### 9.10 Fin de `E4.1.5` - KPIs et dashboard finance consolides

Le sous-lot `E4.1.5` est considere comme **clos sur le dashboard et les indicateurs critiques** avec les garanties suivantes.

#### Regles fermes

- le dashboard expose maintenant des KPIs distincts pour `cash_balance`, `revenues_today`, `expenses_today`, `payments_incoming_today`, `payments_outgoing_today` et `net_cash_flow_today`
- `pending_invoices` compte uniquement les factures reellement ouvertes (`sent`, `partially_paid`, `overdue`)
- `overdue_invoice_count` et `overdue_receivables` reposent uniquement sur les vraies factures en retard
- `outstanding_amount` suit l'encours client reel a date
- `pending_expenses` et `pending_expenses_amount` suivent uniquement la file de depenses `pending`
- `treasury_accounts_in_alert` et `treasury_accounts_count` ne reposent que sur les comptes de tresorerie actifs
- les alertes dashboard exposent maintenant une structure exploitable (`code`, `level`, `amount`, `count`, metadonnees de projet ou de compte) au lieu de simples messages libres

#### Consequences de lecture

- le dashboard finance doit etre lu comme **tableau de pilotage consolide**, pas comme simple reprise des totaux legacy
- le cash du jour doit etre interprete a partir des paiements postes (`Payment`) et non d'un melange implicite avec les factures
- l'encours client et les retards se lisent depuis les factures ouvertes / overdue, pas depuis `RevenueRecord`
- la file d'arbitrage depense doit etre lue depuis `ExpenseRecord.approval_status == pending`
- le frontend peut maintenant afficher des helpers de suivi fiables sur les cartes KPI sans recalcul local ambigu

#### Validation ciblee de cloture

La fermeture du lot est appuyee par :

- [backend/tests/test_finance_dashboard_metrics.py](../backend/tests/test_finance_dashboard_metrics.py)
- [backend/tests/test_finance_invoice_statuses.py](../backend/tests/test_finance_invoice_statuses.py)
- [backend/tests/test_finance_treasury_consistency.py](../backend/tests/test_finance_treasury_consistency.py)
- [backend/tests/test_v1_critical_flows.py](../backend/tests/test_v1_critical_flows.py)
- [frontend/tests/finance-invoice-status.test.jsx](../frontend/tests/finance-invoice-status.test.jsx)

Conclusion documentaire :

- les KPIs critiques du dashboard finance sont maintenant **coherents avec les objets metier reels**
- les cartes de suivi frontend distinguent mieux cash, encaissements, decaissements, encours et arbitrages
- le chantier `E4.1` ne laisse plus que la finition UI de `E4.1.6` avant cloture

### 9.11 Fin de `E4.1.6` - ambiguities UI finance reduites

Le sous-lot `E4.1.6` est considere comme **clos sur la clarification des formulaires et actions frontend** avec les garanties suivantes.

#### Regles fermes

- la creation de facture depuis l'UI ne propose plus que `draft` et `sent`
- l'annulation n'est plus presentee comme un etat de creation, mais comme une action explicite ulterieure sur une facture existante
- le formulaire depense explicite maintenant qu'une depense saisie reste en attente et n'impacte pas la tresorerie tant qu'elle n'est pas validee puis reglee
- le formulaire recette distingue explicitement le cas `encaissement immediat` avec compte de tresorerie du cas `a recouvrer` sans compte
- le formulaire paiement ne propose que des factures vraiment ouvertes, pre-remplit le reste du et affiche un contexte facture en lecture seule
- le montant de paiement est borne cote UI par le `amount_due` de la facture selectionnee

#### Consequences de lecture

- l'utilisateur ne devrait plus confondre `saisie d'un objet` et `effet financier immediat`
- l'UI finance est maintenant plus explicite sur la difference entre `creation`, `validation`, `annulation` et `reglement`
- les parcours `depense`, `recette`, `facture` et `paiement` reduisent les etats trompeurs et les selections incoherentes

#### Validation ciblee de cloture

La fermeture du lot est appuyee par :

- [frontend/tests/finance-invoice-status.test.jsx](../frontend/tests/finance-invoice-status.test.jsx)
- [frontend/tests/finance-expense-review.test.jsx](../frontend/tests/finance-expense-review.test.jsx)

Conclusion documentaire :

- le sous-lot `E4.1` est maintenant **clos sur son coeur de stabilisation finance**
- la suite du chantier finance peut se deplacer vers les workflows et integrations plus riches de `E4.2+`


## 10. Verite de reference pour la suite

Pour toute decision produit ou technique sur le socle actuel, appliquer les regles suivantes :

1. la cible produit vient du cahier
2. le perimetre implemente vient du backend reel et du runtime frontend
3. `correspondences` = `companies`
4. `attendance` = module reel, distinct de `payroll`
5. `admin` = capacite `super_admin`, pas module utilisateur
6. les workspaces `comptable` et `magasinier` sont des experiences specialisees, pas des domaines backend autonomes

## 11. Suite recommandee

Les prochains travaux documentaires logiques sont :

1. poursuivre la re-synchronisation de `erd-base-de-donnees.md` sur les domaines encore sous reserve
2. maintenir `routes-api-flask-detaillees.md` a jour pour les nouveaux workflows metier consolides
3. produire ensuite une matrice `module -> backend -> frontend -> permissions -> tests`

## 12. Baseline officielle MVP exploitable reel

La **baseline officielle consolidee a la fin de l'etape 3** est la suivante.

Elle sert a definir :

- ce qui peut etre considere comme **vraiment exploitable**
- ce qui peut rester **visible mais sous reserve**
- ce qui doit rester **hors perimetre produit**

### 12.1 Modules stables du MVP reel

Les modules suivants constituent le **coeur officiellement exploitable** du socle :

- `companies`
- `users`
- `projects`
- `planning`
- `inventory`
- `recruitment`
- `payroll`
- `attendance`

Critere documentaire :

- backend reel expose
- frontend expose par defaut
- controle d'acces coherent
- couverture de test deja presente ou suffisamment consolidee
- pas de contradiction structurante identifiee apres consolidation des etapes 1 et 2

### 12.2 Modules reellement utilisables mais encore sous reserve

Les domaines suivants restent **accessibles**, mais ne doivent pas etre consideres comme totalement stabilises au meme niveau que le coeur MVP :

- `finance`
- `procurement`
- `chat`
- `calls`

Decision documentaire :

- ils font partie du perimetre exploitable actuel
- mais ils restent **sous surveillance produit/technique**
- les prochaines iterations doivent prioriser leur consolidation avant d'elargir encore le scope

Justification :

- `finance` a ete stabilise sur les flux critiques pendant l'etape 1 puis rebranche correctement en entree produit pendant l'etape 2, mais reste un domaine sensible
- `procurement`, `chat` et `calls` sont reels, exposes et utilisables, mais encore moins "solidifies" que les modules coeur

### 12.3 Capacites hors baseline produit

Les elements suivants ne doivent **pas** etre presentes comme modules produit du MVP reel :

- `admin`

Interpretation officielle :

- `admin` = capacite transverse `super_admin`, pas module de navigation utilisateur

### 12.4 Fonctionnalites rattachees a un autre domaine

Les elements suivants existent, mais doivent etre lus comme **sous-fonctions** et non comme modules autonomes :

- `correspondences` = sous-espace de `companies`

### 12.5 Workspaces specialises hors verite module

Les workspaces suivants ne definissent **pas** la verite metier du MVP :

- prototype `comptable`
- prototype `magasinier`

Interpretation officielle :

- ils peuvent rester utiles comme experiences role-aware ou prototypes internes
- ils ne doivent pas servir de preuve qu'un domaine backend autonome existe
- les points d'entree `finance`, `payroll`, `inventory`, `chat` et `calls` ont deja ete rebranches sur les modules reels
- les dashboards specialises peuvent subsister tant qu'ils restent clairement documentes comme cockpits role-aware

### 12.6 Regle de pilotage pour la suite

A partir de cette baseline :

1. les nouveaux travaux doivent s'appuyer d'abord sur les modules `stables`
2. les modules `sous reserve` doivent etre consolides avant tout elargissement important
3. aucun developpement ne doit reintroduire `admin` comme faux module utilisateur
4. `correspondences` doit rester aligne sur `companies`
5. `attendance` reste la source de verite du realise terrain RH, tandis que `payroll` reste la source des demandes et calculs paie
6. tout prototype role-aware doit etre clairement distingue d'un module backend reel

### 12.7 Definition courte du MVP reel

La version **MVP exploitable reelle** de T-ERP a la fin de l'etape 3 est :

> un socle multi-entreprise securise, navigable et testable, centre sur `companies`, `users`, `projects`, `planning`, `inventory`, `recruitment`, `payroll` et `attendance`, avec `finance`, `procurement`, `chat` et `calls` disponibles mais encore a consolider, sans exposer `admin` comme module produit autonome.

### 12.8 Validation ciblee fin d'etape 3

La consolidation RH de l'etape 3 est appuyee par des tests cibles sur les zones suivantes :

- `attendance` backend :
  [backend/tests/test_attendance_module.py](../backend/tests/test_attendance_module.py)
- `payroll` backend :
  [backend/tests/test_payroll_api.py](../backend/tests/test_payroll_api.py)
- `users` backend :
  [backend/tests/test_users_personnel_module.py](../backend/tests/test_users_personnel_module.py)
- `attendance` frontend :
  [frontend/tests/attendance-page.test.jsx](../frontend/tests/attendance-page.test.jsx)
- cockpit RH frontend :
  [frontend/tests/users-hr-dashboard.test.jsx](../frontend/tests/users-hr-dashboard.test.jsx)
- dossier RH frontend :
  [frontend/tests/users-hr-file.test.jsx](../frontend/tests/users-hr-file.test.jsx)
