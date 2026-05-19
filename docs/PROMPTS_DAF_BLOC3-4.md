# DAF · BLOC 3 — Modules transverses (vues DAF spécifiques)

**3 fonctions · 3 prompts à enchaîner**

⚠️ Responsive obligatoire sur 7 tailles. Vérifier à chaque commit.

---

## 🟪 PROMPT 3.1 — Validations transverses (vue DAF lecture)

```
Module : Mes validations · vue DAF.

CONTEXTE
========
Le DAF a son propre écran de validations N2 (déjà fait au bloc 1 fn 1.3).
Mais il doit aussi voir l'état de TOUTES les validations en cours dans l'entreprise
(N1, N2, N3) avec une vue transverse.

PROTOTYPE HTML — ENRICHISSEMENT
================================
L'écran screen-validations existe (générique). On l'enrichit pour le DAF avec :

1. Bandeau spécifique DAF en haut :
   "Vue transverse des validations · 32 demandes en circuit · 218 M FCFA total"

2. Onglets supplémentaires DAF :
   - Mes N2 (existant)
   - Tout le circuit (NOUVEAU, transverse)
   - Statistiques de validation (NOUVEAU)
   - Délégations (NOUVEAU)

3. Onglet "Tout le circuit" :
   Listview de toutes les demandes en cours avec workflow visuel :
   colonnes Réf | Type | Initiateur | Montant | Étape actuelle | Bloqué depuis | Action
   Permet au DAF de débloquer une demande coincée à un niveau, de relancer le validateur,
   ou de prendre la main si délégation.

4. Onglet "Statistiques de validation" :
   - Délai moyen par étape (N1, N2, N3)
   - Délai moyen par type de demande
   - Top validateurs lents (graphe barres horizontales)
   - Taux de rejet par étape
   - Heatmap temporelle (heures de la journée où les validations s'accumulent)

5. Onglet "Délégations" :
   - Mes délégations actives (à qui j'ai délégué quoi)
   - Délégations reçues (qui m'a délégué)
   - Bouton "Nouvelle délégation"
   - Historique des délégations passées

API
===
- GET /api/daf/validations/all-circuit
- GET /api/daf/validations/stats
- POST /api/daf/validations/:id/unblock (relancer validateur ou auto-valider si délégué)
- GET /api/daf/validations/delegations
- POST /api/daf/validations/delegations

COMPOSANTS src/components/daf/validations/
===========================================
- AllCircuitView.tsx ⚠️ RESPONSIVE
- ValidationStatsCharts.tsx (3 graphes Recharts)
- DelegationsManager.tsx

RESPONSIVE
==========
- Listview transverse → cards mobile avec workflow vertical
- Graphes statistiques → ResponsiveContainer Recharts
- Heatmap temporelle : tableau classique en desktop, cards par heure en mobile

LIVRABLES
=========
- Prototype OK
- Code complet
- Commit "feat(daf): validations vue transverse + stats + délégations — fn 3.1"
```

---

## 🟪 PROMPT 3.2 — Rapports consolidés (vue DAF reporting financier)

```
Module : Rapports consolidés · vue DAF.

CONTEXTE
========
Le DG a sa vue rapports stratégiques. Le DAF a une vue rapports financiers
opérationnels qu'il produit pour le DG, le CA, les banques, les commissaires aux comptes.

PROTOTYPE HTML — ENRICHISSEMENT
================================

1. Section "Rapports financiers DAF" en haut (4 cards) :
   - Reporting trésorerie hebdomadaire (lundi pour DG)
   - Reporting financier mensuel (P&L + BFR + Tréso)
   - Reporting bancaire trimestriel (pour relationship managers)
   - Reporting CAC trimestriel (commissaires aux comptes)

2. Section "Reportings réglementaires" :
   - DSF préparation (lien vers vue spécifique)
   - Bilan + compte de résultat OHADA
   - États sociaux (DAS2, déclaration salaires)

3. Section "Mes rapports planifiés DAF" :
   - Tableau de bord trésorerie envoyé chaque lundi 6h au DG
   - Synthèse mensuelle envoyée le 5 du mois au COMEX
   - Reporting CAC trimestriel envoyé 15 jours avant la réunion CAC

4. Wizard "Rapport sur mesure DAF" :
   Pré-rempli avec les blocs financiers les plus utilisés (P&L, balance, tréso,
   ratios, KPIs financiers).

API
===
Étend l'API rapports existante avec types DAF spécifiques :
   ReportType { ..., DAF_TREASURY_WEEKLY, DAF_FINANCIAL_MONTHLY, DAF_BANKING_QUARTERLY,
                DAF_CAC_QUARTERLY, DAF_DSF_PREP }

COMPOSANTS
==========
Réutilise les composants reports créés pour le DG, ajoute des templates DAF spécifiques.

RESPONSIVE
==========
Standard (cards en grille responsive, listview → cards mobile).

LIVRABLES
=========
- Prototype enrichi avec section DAF
- Code (4 templates DAF + wizard pré-rempli)
- Commit "feat(daf): rapports financiers DAF — fn 3.2"
```

---

## 🟪 PROMPT 3.3 — RH & Paie (vue DAF financier)

```
Module : RH & Paie · vue DAF.

CONTEXTE
========
Le DAF intervient en N2 dans le cycle de paie (déjà fait fn 1.4). Il a aussi un rôle de
contrôle financier sur les RH : masse salariale, provisions sociales, indemnités de
rupture, charges sociales.

PROTOTYPE HTML — ENRICHISSEMENT
================================
L'écran screen-rh-payroll existe. Enrichir pour le DAF avec une vue financière.

1. Onglet supplémentaire "Vue financière DAF" :
   - Ratio masse salariale / CA (mensuel + tendance)
   - Coût total chargé par catégorie professionnelle
   - Provisions sociales (congés payés, IFC indemnités fin carrière, primes)
   - Engagements sociaux long terme (retraites, mutuelle)
   - Coût de revient horaire par catégorie (utile pour devis)

2. Section "Indemnités et ruptures" :
   - Suivi des départs avec calcul indemnités prévisionnelles
   - Provisions à constituer pour les départs négociés en cours
   - Historique des ruptures sur 24 mois avec coûts moyens

3. Section "Heures supplémentaires" :
   - Top 20 employés avec le plus d'heures sup
   - Coût total heures sup mensuel
   - Alerte si dépasse seuil convention collective
   - Drill-down par chantier (impact marge)

4. Section "Subventions et exonérations" :
   - Suivi des aides à l'emploi
   - Exonérations charges sociales (jeunes, longue durée, handicap)
   - Crédits formation à récupérer

PRISMA
======
   model SocialProvision {
     id          String   @id @default(cuid())
     tenantId    String
     type        ProvisionType
     amount      BigInt
     calculatedAt DateTime
     periodEnd   String  // exercice concerné
   }
   enum ProvisionType { PAID_LEAVE END_OF_CAREER BONUSES MUTUAL OTHER }

   model EmployeeDeparture {
     id          String   @id @default(cuid())
     userId      String
     departureType DepartureType
     departureDate DateTime
     severancePay BigInt
     unusedLeavePay BigInt
     bonusProrata BigInt
     totalCost   BigInt
     status      DepartureStatus
   }
   enum DepartureType { RESIGNATION DISMISSAL_INDIVIDUAL DISMISSAL_ECONOMIC RETIREMENT END_OF_CONTRACT NEGOTIATED }
   enum DepartureStatus { PROVISIONED PAID DISPUTED }

API
===
- GET /api/daf/hr/financial-overview
- GET /api/daf/hr/social-provisions
- GET /api/daf/hr/departures
- GET /api/daf/hr/overtime-summary
- GET /api/daf/hr/subsidies

COMPOSANTS src/components/daf/hr/
==================================
- HrFinancialOverview.tsx
- SocialProvisionsTable.tsx
- DeparturesTable.tsx
- OvertimeAnalysis.tsx
- SubsidiesTracker.tsx

RESPONSIVE
==========
Standard. Tableaux → cards mobile, graphes ResponsiveContainer.

LIVRABLES
=========
- Prototype enrichi avec onglet "Vue financière DAF"
- Code complet
- Commit "feat(daf): RH&Paie vue financière + provisions + départs — fn 3.3"
```

---

## ✅ FIN BLOC 3

Format : "Bloc 3 DAF terminé. Tu peux me livrer le Bloc 4."

---

# DAF · BLOC 4 — Espace personnel + Profil

**3 fonctions · 3 prompts à enchaîner**

---

## 🟪 PROMPT 4.1 — Mon profil (vue DAF enrichie)

```
Module : Mon profil · vue DAF.

CONTEXTE
========
Le DG a son profil enrichi. Le DAF a des spécificités :
- Signature électronique (signe les documents financiers)
- Procurations bancaires (qui peut signer les chèques en mon absence)
- Préférences alertes financières
- Agenda lié aux échéances fiscales

PROTOTYPE HTML — ENRICHISSEMENT screen-profile
================================================
Quand l'utilisateur est DAF, ajouter ces sections :

1. Section "Signature et procurations" :
   - Signature manuscrite uploadée
   - Plafond de signature seul (5 M FCFA pour DAF)
   - Plafond cosignature avec DG (50 M FCFA)
   - Liste des cosignataires (DG, président)
   - Liste des banques où ma signature est déposée

2. Section "Mes procurations délivrées" :
   - À qui j'ai délégué quoi (en cas d'absence)
   - Plafond de la procuration
   - Période de validité

3. Section "Préférences alertes financières" :
   - Trésorerie sous seuil → alerte (seuil personnalisable)
   - DSO en hausse → alerte
   - BC > X M dépose → alerte immédiate
   - Échéance fiscale J-3 → rappel
   - Canal préféré (email, SMS, push, in-app)

4. Section "Agenda DAF" :
   - Échéances fiscales du mois pré-remplies automatiquement
   - Réunions banques
   - CA, AG
   - Audits CAC
   - Synchronisation avec /daf/fiscal pour échéances

PRISMA
======
   model UserSignaturePower {
     id              String   @id @default(cuid())
     userId          String   @unique
     soloLimit       BigInt   // seuil signature seul
     coSignLimit     BigInt   // seuil cosignature
     coSigners       String[] // userIds des cosignataires possibles
     banksRegistered BankCode[]
     proxyHolders    Json     // procurations délivrées
   }

API
===
- GET /api/daf/profile/signature-power
- PATCH /api/daf/profile/signature-power
- GET /api/daf/profile/proxies
- POST /api/daf/profile/proxies
- GET /api/daf/profile/alert-preferences
- PATCH /api/daf/profile/alert-preferences

RESPONSIVE
==========
Sections standard mobile-friendly.

LIVRABLES
=========
- Prototype profile enrichi (sections DAF conditionnelles)
- Code complet
- Commit "feat(daf): mon profil enrichi DAF — signature, procurations, alertes — fn 4.1"
```

---

## 🟪 PROMPT 4.2 — Ma paie (vue DAF)

```
Module : Ma paie · vue DAF.

CONTEXTE
========
Marie NGONO consulte sa propre paie. Profil DAF, donc rémunération avec primes
performance liées aux résultats financiers de l'entreprise.

ENRICHISSEMENT screen-pay
==========================

Pour le DAF, ajouter :

1. Section "Bonus performance financière" :
   - Bonus annuel sur résultat net (formule : 1% du résultat net si > seuil)
   - Bonus sur DSO (réduction du DSO de X jours = prime)
   - Bonus sur conformité fiscale (100% des dépôts à temps = prime)
   - Provision en cours visible
   - Historique 3 ans

2. Section "Avantages DAF spécifiques" :
   - Voiture de fonction
   - Téléphone
   - Mutuelle famille
   - Plan d'épargne entreprise (placeholder)

API
===
Réutilise API `users/me/total-compensation` du DG, ajoute DAF-specific bonus types.

LIVRABLES
=========
- Prototype enrichi
- Code complet
- Commit "feat(daf): ma paie enrichie DAF — bonus financiers — fn 4.2"
```

---

## 🟪 PROMPT 4.3 — Messagerie (vue DAF)

```
Module : Messagerie · vue DAF.

CONTEXTE
========
Le DAF utilise intensément la messagerie pour :
- Communication avec banques (relationship managers)
- Coordination avec comptable, RH, achats
- Échanges avec CAC et expert-comptable
- Suivi recouvrement avec commerciaux

ENRICHISSEMENT screen-msg
==========================

Pour le DAF, ajouter dans la sidebar conversations :

1. Section "Groupes financiers DAF" épinglés :
   - Cellule trésorerie (DAF + comptable + assistante)
   - Banques relationship (DAF + 5 RM banques)
   - Comité d'audit (DAF + DG + CAC + président audit committee)
   - Recouvrement (DAF + commerciaux)

2. Section "Contacts externes DAF" :
   - Cabinet expert-comptable
   - Cabinet CAC
   - Avocat fiscaliste
   - Inspecteur DGI référent
   - Inspecteur CNPS référent

3. Sondages spécifiques DAF :
   Modèles pré-prêts :
   - "Validation paie ce mois ?" (pour comité paie)
   - "Disponibilité réunion banque" (pour relationship managers)

LIVRABLES
=========
- Prototype enrichi (groupes financiers DAF en haut sidebar)
- Code complet
- Commit "feat(daf): messagerie enrichie DAF — groupes financiers — fn 4.3"
```

---

## ✅ PROFIL DAF TERMINÉ

Tu viens de couvrir l'**ensemble du profil DAF** :
- Bloc 1 : 6 fonctions exclusives DAF (cockpit, trésorerie, validations N2, paie, recouvrement, fiscalité)
- Bloc 2 : 3 modules financiers approfondis (compta, finance, achats)
- Bloc 3 : 3 modules transverses vue DAF (validations transverses, rapports, RH financier)
- Bloc 4 : 3 modules personnels (profil, paie, messagerie)

**Total profil DAF : 15 fonctions livrées.**

PROCHAINE ÉTAPE
================
Quand tu es prêt, demande le profil suivant :
"Profil DAF terminé. On attaque le profil <X>."

Profils à venir possibles : Comptable, RH, Magasinier, Chef chantier, Directeur travaux,
Directeur technique, Conducteur travaux, Logisticien, GED, Employé, Ouvrier, Informaticien.

Je recommande l'ordre :
1. Comptable (saisie écritures, rapprochements) — gros levier opérationnel
2. RH (saisie paie, gestion personnel) — complète le cycle paie
3. Chef chantier (PWA mobile, pointage hors-ligne) — démontre la mobilité
4. Magasinier (mouvements stock, inventaires) — quotidien chantier
5. Autres profils dans l'ordre que tu veux
