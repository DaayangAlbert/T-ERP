# Finance architecture

Cette architecture reorganise la finance autour de neuf domaines relies, au lieu d'un seul ecran monolithique.

## Domaines

1. `accounting_reporting`
   - Source: comptes, journaux, cash-flow, synthese, TVA
   - Produit: etats financiers, journal general, position fiscale, flux de tresorerie

2. `budgeting`
   - Source: budgets, rentabilite projet, versions chantier, paie previsionnelle
   - Produit: versions budgetaires, atterrissages, ecarts reel/prevision

3. `treasury`
   - Source: comptes de tresorerie, paiements, encaissements, decaissements, echues
   - Produit: cash position, calendrier de paiement, alertes de liquidite

4. `payroll_planning`
   - Source: employes paie, periodes, runs, absences
   - Produit: masse salariale previsionnelle, besoin de cash paie, impact budget

5. `analytics_decision`
   - Source: tous les domaines
   - Produit: signaux de pilotage, alertes, scenarios, arbitrages

6. `audit_trail`
   - Source: toute creation, mise a jour, validation, paiement, rapport chantier
   - Produit: timeline transverse, historique par entite, export audit

7. `project_cost_control`
   - Source: projets, rentabilite, depenses, recettes, factures, paie, rapports
   - Produit: cout reel, marge par projet, derivees chantier, ventilation MO/materiel

8. `payment_delays_btp`
   - Source: factures, impayes, retards, decomptes, echeanciers BTP
   - Produit: aging balance, plan de recouvrement, projection d'encaissement chantier

9. `site_reporting`
   - Source: rapports terrain, incidents, presences, couts observes
   - Produit: feedback de cout terrain, demandes d'ajustement, alertes chantier

## Flux de donnees

- `site_reporting -> project_cost_control`
  Les rapports terrain injectent les couts constates, presences et incidents dans le suivi chantier.

- `project_cost_control -> budgeting`
  Les couts reels chantier recalent l'atterrissage budgetaire.

- `payroll_planning -> budgeting`
  La masse salariale previsionnelle et les absences nourrissent le budget.

- `payroll_planning -> treasury`
  Les runs de paie deviennent des decaissements previsibles de tresorerie.

- `payment_delays_btp -> treasury`
  Les retards d'encaissement et decomptes modifient la projection de cash.

- `treasury -> accounting_reporting`
  Les flux reels et rapprochements alimentent la cloture comptable.

- `accounting_reporting -> analytics_decision`
  Les etats financiers et le cash-flow deviennent des signaux de pilotage.

- `budgeting -> analytics_decision`
  Les ecarts et reforecasts deviennent des alertes d'arbitrage.

- `project_cost_control -> analytics_decision`
  La marge chantier et les derivees cout/delai montent au pilotage.

- `all -> audit_trail`
  Chaque domaine ecrit dans un historique transverse unifie.

## Structure creee

```text
frontend/src/features/finance/
  FINANCE_ARCHITECTURE.md
  modules/
    accountingReporting/
    analyticsDecision/
    auditTrail/
    budgeting/
    paymentDelaysBtp/
    payrollPlanning/
    projectCostControl/
    siteReporting/
    treasury/
    buildFinanceOperatingModel.js
    integrationGraph.js
    registry.js
    index.js
```

## Regles de composition

- La page Finance continue a lire les memes sources API.
- `buildFinanceOperatingModel()` regroupe ces sources dans les nouveaux domaines.
- `buildFinanceAuditTrail()` fabrique un historique transverse a partir des operations connues.
- Les modules Paie et Chantier restent proprietaires de leurs ecrans, mais exposent des donnees canoniques a Finance.

## Points d'interaction cle

- Budget <-> Paie
  - budget mensuel
  - charges sociales
  - absences impactantes

- Tresorerie <-> Delais BTP
  - echeances client
  - relances
  - decomptes a encaisser

- Chantier <-> Finance
  - cout main-d'oeuvre
  - materiel
  - sous-traitance
  - marge projet

- Reporting terrain <-> Budget
  - remontee cout reel
  - incidents
  - ajustements de prevision
