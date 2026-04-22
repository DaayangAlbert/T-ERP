# T-ERP - Module Gestion Comptable et Financiere

Document parent :

- [Cahier des charges fonctionnel](cahier-des-charges-fonctionnel.md)
- [ERD cible Stock + Finance](erd-stock-finance.md)
- [Contrats API Stock + Finance](contrats-api-stock-finance.md)

## 1. Objet du module

Le module **Gestion Comptable et Financiere** doit permettre a l'entreprise de tracer ses flux financiers, produire ses documents comptables, piloter sa tresorerie et suivre la rentabilite de ses projets.

Il constitue le socle de pilotage economique de T-ERP et doit s'integrer aux modules projets, stock et ressources humaines.

## 2. Objectifs metier

- enregistrer l'ensemble des operations financieres
- structurer les donnees comptables de facon exploitable
- suivre les depenses, recettes et paiements
- piloter la tresorerie en temps quasi reel
- mesurer la rentabilite globale et par projet
- produire des rapports et etats financiers fiables

## 3. Perimetre fonctionnel

Le module doit couvrir :

- le plan comptable
- les journaux comptables
- les depenses
- les recettes
- la facturation
- la gestion des paiements
- la gestion de tresorerie
- le suivi budgetaire et analytique par projet
- le reporting comptable et financier
- la securite, l'audit et la validation des operations

## 4. Acteurs et roles

Profils metier cibles :

- **Administrateur d'entreprise** : parametre les referentiels et supervise le module
- **Comptable** : saisit et controle les ecritures et pieces justificatives
- **Responsable financier** : valide, analyse et pilote la tresorerie
- **Chef de projet** : consulte les budgets, depenses et marges de son chantier
- **Direction generale** : suit les tableaux de bord et indicateurs de rentabilite
- **Auditeur / Controle interne** : consulte l'historique et les traces de validation

Permissions a prevoir :

- consultation
- saisie de depense
- saisie de recette
- emission de facture
- validation comptable
- validation de paiement
- cloture de periode
- acces aux rapports et exports

## 5. Referentiels comptables

### 5.1 Plan comptable

Le systeme doit gerer un plan comptable configurable avec au minimum :

- comptes d'actif
- comptes de passif
- comptes de charges
- comptes de produits
- comptes de tresorerie
- comptes de taxes si necessaire

Chaque compte doit comporter :

- numero ou code
- libelle
- classe
- nature debit ou credit dominante
- statut actif ou inactif
- rattachement analytique optionnel

### 5.2 Journaux

Le systeme doit proposer au minimum :

- journal des ventes
- journal des achats
- journal de caisse
- journal de banque
- journal d'operations diverses

### 5.3 Autres referentiels

Autres donnees de base a gerer :

- periodes comptables
- centres de cout
- projets
- fournisseurs
- clients
- modes de paiement
- devises
- taux de taxe

## 6. Gestion des depenses

### 6.1 Objet

Le systeme doit permettre d'enregistrer toute sortie financiere engagee par l'entreprise.

### 6.2 Donnees minimales

Chaque depense doit inclure :

- date
- reference interne
- montant
- categorie
- fournisseur
- projet optionnel
- centre de cout optionnel
- mode de paiement
- compte de tresorerie
- piece justificative
- utilisateur createur
- statut

### 6.3 Categories attendues

- materiaux
- salaires
- transport
- location materiel
- charges administratives
- carburant
- maintenance
- sous-traitance

### 6.4 Workflow recommande

Statuts possibles :

- brouillon
- en attente de validation
- valide
- paye
- annule

Regles de gestion :

- une depense validee doit etre historisee
- un montant doit etre strictement positif
- les pieces justificatives doivent etre conserves
- les depenses rattachees a un projet doivent alimenter le suivi budgetaire
- une double approbation peut etre activee pour certains seuils

## 7. Gestion des recettes

### 7.1 Types de recettes

- paiement client
- avance
- decompte
- remboursement
- produit exceptionnel

### 7.2 Donnees minimales

Chaque recette doit inclure :

- date
- reference
- client ou origine
- montant
- projet associe optionnel
- mode de paiement
- compte de destination
- piece justificative
- statut

### 7.3 Regles de gestion

- une recette doit pouvoir etre rattachee a une facture
- les encaissements partiels doivent etre supportes
- le solde restant a recevoir doit etre calcule automatiquement

## 8. Facturation

### 8.1 Fonctionnalites attendues

- creation de facture
- rattachement a un projet
- numerotation automatique
- gestion des lignes de facture
- calcul des taxes et totaux
- emission de recu
- suivi des paiements

### 8.2 Donnees d'une facture

- numero de facture
- date d'emission
- date d'echeance
- client
- projet optionnel
- lignes
- sous-total
- taxes
- total TTC
- montant paye
- reste a payer
- statut

### 8.3 Statuts a couvrir

- brouillon
- envoyee
- payee
- partiellement payee
- en retard
- annulee

### 8.4 Regles de gestion

- la numerotation doit etre unique par entreprise
- une facture envoyee ne doit plus etre modifiee sans trace
- les paiements partiels doivent mettre a jour le reste a payer
- les factures en retard doivent alimenter les alertes

## 9. Gestion des paiements

### 9.1 Modes de paiement

- especes
- virement bancaire
- cheque si necessaire
- Mobile Money

### 9.2 Suivi des paiements

Le systeme doit suivre :

- paiements effectues
- paiements recus
- paiements en attente
- paiements partiels
- paiements rejetes ou annules

### 9.3 Regles de gestion

- chaque paiement doit etre rattache a une operation d'origine
- les references externes doivent etre conservees
- les paiements doivent impacter le solde du compte de tresorerie associe

## 10. Gestion de tresorerie

### 10.1 Comptes de tresorerie

Le systeme doit gerer plusieurs comptes :

- caisse
- banque
- Mobile Money

### 10.2 Fonctionnalites attendues

- suivi des soldes
- historique des flux entrants et sortants
- virement interne entre comptes
- visualisation du solde disponible
- prevision de tresorerie

### 10.3 Alertes de tresorerie

- solde critique
- decaissement important
- echeance fournisseur imminente
- encaissement client en retard

## 11. Suivi financier des projets

### 11.1 Donnees a suivre

- budget initial
- revisions budgetaires
- depenses engagees
- depenses reelles
- recettes
- marge
- resultat

### 11.2 Indicateurs projet

- rentabilite
- cout reel
- ecart budget
- taux d'avancement financier
- reste a engager ou reste a decaisser

### 11.3 Regles de gestion

- chaque projet peut porter son propre budget
- les depenses et recettes rattachees a un projet doivent alimenter les indicateurs
- les consommations de stock valorisees doivent pouvoir contribuer au cout projet

## 12. Comptabilite generale et analytique

Le module doit permettre :

- l'enregistrement structure des operations
- la ventilation par journal
- le rattachement a un projet ou centre de cout
- la production d'etats consolides

Sorties comptables attendues :

- grand livre en phase avancee
- balance comptable
- journal detaille
- balance par projet ou centre de cout

## 13. Reporting et tableaux de bord

Le systeme doit produire au minimum :

- rapport des depenses
- rapport des recettes
- tableau de bord financier
- bilan financier
- compte de resultat
- rapport de flux de tresorerie
- suivi des impayes
- rentabilite par projet

Indicateurs cles :

- chiffre d'affaires
- benefice
- charges
- cash-flow
- marge par projet
- depenses par categorie
- niveau de tresorerie

Formats d'export :

- PDF
- Excel
- CSV

## 14. Documents produits par le systeme

Le module doit pouvoir generer :

- factures
- recus
- bons de paiement
- bons de commande
- etats financiers
- syntheses budgetaires

## 15. Integrations avec les autres modules

Le module doit s'integrer avec :

- **Projets** : budget, rentabilite, suivi analytique
- **Stock** : valorisation des materiaux et couts de consommation
- **RH** : salaires, charges et couts du personnel
- **Achats** : engagement de depenses et rapprochement fournisseur en phase future

## 16. Securite, audit et controle interne

Le module doit garantir :

- validation des operations sensibles
- double approbation optionnelle
- horodatage
- historisation des changements
- journal d'audit
- cloture des periodes pour eviter les modifications retroactives

Exigences :

- aucune suppression physique d'une operation validee
- toute correction doit laisser une trace
- les pieces justificatives doivent rester associees aux operations

## 17. Evolutions avancees

Fonctionnalites strategiques a prevoir :

- calcul automatique des marges par projet
- alertes de depassement budget
- simulation financiere
- gestion multi-devises
- integration fiscale TVA et autres taxes
- export vers logiciels comptables externes
- rapprochement bancaire avance

## 18. User stories prioritaires

- En tant que comptable, je veux enregistrer une depense liee a un projet afin de suivre son cout reel.
- En tant que responsable financier, je veux suivre les soldes de caisse, banque et mobile money afin de piloter la tresorerie.
- En tant que chef de projet, je veux comparer mon budget initial et mes depenses reelles afin d'anticiper un depassement.
- En tant qu'administrateur, je veux emettre une facture avec numerotation automatique afin de fiabiliser la facturation.
- En tant que direction, je veux consulter le resultat et la marge par projet afin de prendre de meilleures decisions.

## 19. Priorisation recommandee

### Phase 2

- depenses et recettes
- facturation
- paiements
- comptes de tresorerie
- suivi budgetaire des projets
- tableaux de bord financiers de base

### Phase 3

- comptabilite analytique plus fine
- multi-devises
- fiscalite
- rapprochement bancaire avance
- exports vers outils comptables tiers
