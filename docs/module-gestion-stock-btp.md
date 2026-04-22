# T-ERP - Module Gestion de Stock (BTP)

Document parent :

- [Cahier des charges fonctionnel](cahier-des-charges-fonctionnel.md)
- [ERD cible Stock + Finance](erd-stock-finance.md)
- [Contrats API Stock + Finance](contrats-api-stock-finance.md)

## 1. Objet du module

Le module **Gestion de Stock** doit permettre a l'entreprise de centraliser, tracer et securiser tous les flux de stock lies a ses activites BTP.
Il couvre la gestion des materiaux, consommables, outillages et, dans une phase avancee, des equipements et engins.

Le module doit etre exploitable en contexte multi-entreprise, multi-depots et multi-chantiers.

## 2. Objectifs metier

- suivre les entrees, sorties et transferts en temps quasi reel
- connaitre la disponibilite reelle des ressources par depot ou chantier
- controler les consommations rattachees a chaque projet
- limiter les pertes, casses, vols et ruptures
- optimiser les approvisionnements et la rotation du stock
- disposer d'une base fiable pour la valorisation comptable et analytique

## 3. Perimetre fonctionnel

Le module doit couvrir :

- le referentiel des articles
- les emplacements de stockage
- les entrees de stock
- les sorties de stock
- les transferts inter-depots
- les allocations et reservations par projet
- les inventaires et ajustements
- les alertes de seuil
- les rapports de stock et de consommation
- la tracabilite et l'audit des mouvements

## 4. Acteurs et roles

Profils metier cibles :

- **Administrateur d'entreprise** : parametre les regles, seuils et droits
- **Responsable logistique** : pilote les entrees, sorties, transferts et inventaires
- **Magasinier** : execute les operations de stock au quotidien
- **Chef de chantier** : demande ou valide les sorties vers chantier
- **Chef de projet** : suit les consommations et couts par projet
- **Direction / Controle interne** : consulte les rapports, ecarts et alertes

Permissions a prevoir :

- consultation simple
- creation de mouvement
- validation de sortie
- validation de transfert
- validation d'ajustement
- acces aux rapports et exports
- acces aux inventaires

## 5. Referentiels et donnees de base

### 5.1 Fiche article

Chaque article doit disposer au minimum des informations suivantes :

- code article ou SKU
- nom ou designation
- description optionnelle
- categorie
- type d'article
- unite de mesure
- prix moyen
- dernier prix d'achat
- seuil minimal
- seuil maximal optionnel
- fournisseur principal
- statut actif ou inactif

Types d'articles a couvrir :

- materiaux
- equipements
- consommables

Exemples :

- ciment
- fer
- sable
- gravier
- peinture
- gants
- casques
- carburant
- perceuses
- betonniere

### 5.2 Classification

Les articles doivent pouvoir etre classes :

- par categorie
- par type
- par usage
- par famille d'achat
- par fournisseur principal
- par projet standard ou non standard si necessaire

### 5.3 Emplacements de stock

Le systeme doit gerer plusieurs types d'emplacements :

- magasin principal
- depot secondaire
- stock temporaire de chantier
- zone de quarantaine ou d'attente en phase avancee

Chaque emplacement doit inclure :

- code emplacement
- libelle
- type d'emplacement
- adresse ou localisation
- projet associe si emplacement chantier
- responsable de l'emplacement
- statut actif ou inactif

### 5.4 Unites de mesure

Le systeme doit permettre la gestion de plusieurs unites selon la nature des articles :

- piece
- sac
- kg
- tonne
- litre
- metre
- metre carre
- metre cube

Une conversion d'unites pourra etre ajoutee dans une phase avancee.

## 6. Organisation multi-depots

Le module doit permettre :

- la gestion de plusieurs depots pour une meme entreprise
- la visualisation du stock par depot
- la visualisation du stock global consolide
- l'affectation d'un chantier a un stock temporaire
- le transfert entre depots et chantiers

Regles associees :

- un emplacement appartient a une seule entreprise
- un emplacement chantier peut etre lie a un seul projet actif
- un meme article peut exister dans plusieurs emplacements
- les mouvements doivent toujours rester traces par emplacement

## 7. Gestion des entrees de stock

### 7.1 Objectif

Les entrees de stock permettent d'enregistrer toute augmentation de quantite dans un emplacement donne.

### 7.2 Types d'entrees

Le systeme doit couvrir au minimum :

- achat fournisseur
- retour chantier
- ajustement positif
- don
- transfert entrant

### 7.3 Donnees d'une entree

Chaque entree doit inclure :

- date d'entree
- fournisseur ou origine
- reference du bon de livraison
- reference de facture optionnelle
- emplacement de destination
- projet concerne optionnel
- utilisateur ayant saisi l'operation
- commentaire ou observation
- statut du document

### 7.4 Lignes article

Chaque ligne doit inclure :

- article
- quantite
- unite
- prix unitaire
- montant total
- lot ou reference optionnelle
- remarque de ligne optionnelle

### 7.5 Regles de gestion

- la quantite doit etre strictement positive
- un article doit exister dans le referentiel avant saisie
- l'emplacement de destination doit etre actif
- le total peut etre calcule automatiquement a partir de la quantite et du prix unitaire
- une entree validee doit mettre a jour le stock theorique
- une entree annulee doit rester historisee

## 8. Gestion des sorties de stock

### 8.1 Objectif

Les sorties de stock permettent d'enregistrer toute diminution de quantite dans un emplacement.

### 8.2 Types de sorties

Le systeme doit couvrir :

- affectation a projet
- sortie vers chantier
- consommation interne
- perte ou casse
- vol
- transfert sortant

### 8.3 Donnees d'une sortie

Chaque sortie doit inclure :

- date de sortie
- emplacement source
- projet concerne optionnel
- tache concernee optionnelle
- responsable demandeur
- responsable validateur
- motif de sortie
- utilisateur ayant effectue la sortie
- commentaire

### 8.4 Regles de gestion

- la quantite doit etre strictement positive
- le stock disponible doit etre suffisant avant validation
- une sortie doit etre rattachee a un motif trace
- une sortie vers chantier peut exiger une validation hierarchique
- les sorties pour perte, casse ou vol doivent obligatoirement porter un motif explicite
- le systeme doit eviter le stock negatif par defaut

## 9. Transferts inter-depots

Le systeme doit gerer les transferts entre deux emplacements d'une meme entreprise.

Donnees minimales :

- depot source
- depot destination
- date du transfert
- articles transferes
- quantites
- utilisateur emetteur
- utilisateur recepteur ou validateur
- statut du transfert

Statuts recommandes :

- brouillon
- en attente de validation
- valide
- recu
- annule

Regles de gestion :

- un transfert doit contenir au moins une ligne
- le depot source et le depot destination doivent etre differents
- le transfert doit conserver la reference source et destination
- le stock doit etre diminue a la validation de depart et confirme a la reception selon le workflow retenu
- les ecarts de reception doivent etre traces

## 10. Suivi des stocks en temps reel

Le module doit afficher, par article et par emplacement :

- stock disponible
- stock reserve
- stock en commande
- stock en transit
- stock minimum
- stock theorique

Indicateurs utiles :

- rotation de stock
- jours de couverture
- stock dormant
- consommation moyenne

Alertes a prevoir :

- rupture de stock
- stock faible
- surstock
- article sans mouvement depuis une longue periode

## 11. Reservation et allocation par projet

Le systeme doit permettre de lier les mouvements de stock aux projets afin de suivre les consommations reelles.

Fonctionnalites attendues :

- allocation d'une quantite a un projet
- reservation d'une quantite avant sortie physique
- rattachement a une tache ou un lot de travaux
- suivi par responsable
- historique de consommation par chantier

Benefices attendus :

- calcul du cout reel du projet
- comparaison budget versus realise
- meilleure anticipation des besoins chantier

## 12. Inventaire

### 12.1 Types d'inventaire

- inventaire periodique
- inventaire tournant

### 12.2 Fonctionnalites attendues

- generation d'une campagne d'inventaire
- selection d'un depot, d'une famille ou d'une zone
- comptage physique
- saisie du stock reel
- comparaison theorique versus reel
- calcul automatique de l'ecart
- proposition d'ajustement
- validation des ecarts

### 12.3 Regles de gestion

- toute campagne d'inventaire doit etre historisee
- les ajustements issus d'inventaire doivent porter un motif
- les ecarts significatifs peuvent necessiter une double validation
- les resultats d'inventaire doivent pouvoir etre exportes

## 13. Rapports et tableaux de bord

Le module doit produire au minimum :

- etat du stock global
- etat du stock par depot
- fiche de stock par article
- historique detaille des mouvements
- consommation par projet
- valorisation du stock
- rapport d'inventaire
- rapport de pertes et casses
- rapport de transferts

Filtres attendus :

- periode
- depot
- chantier
- article
- categorie
- fournisseur
- projet

Formats d'export :

- PDF
- Excel
- CSV

## 14. Securite, audit et controle interne

Le module doit garantir :

- la gestion des droits par role
- la validation des sorties sensibles
- la validation des transferts
- la tracabilite des ajustements
- l'horodatage des mouvements
- l'identification de l'auteur de chaque operation
- la conservation de l'historique

Exigences de controle :

- aucune suppression physique d'un mouvement valide
- toute correction doit passer par un mouvement inverse ou un ajustement trace
- les operations critiques doivent etre auditables

## 15. Integrations avec les autres modules

Le module doit s'integrer avec :

- **Projets** : suivi des consommations et couts par chantier
- **Achats / Commandes** : alimentation des entrees de stock dans une phase future
- **Comptabilite / Finance** : valorisation des stocks et impact sur les charges
- **RH** : identification des responsables et validateurs
- **Mobile** : scan et saisie terrain en phase avancee

## 16. Evolutions avancees

Fonctionnalites cibles :

- code-barres
- QR code
- scan mobile
- suggestion d'approvisionnement
- previsions de consommation
- gestion de lots et dates de peremption si necessaire
- interface avec capteurs IoT en option future

## 17. User stories prioritaires

- En tant que magasinier, je veux enregistrer une entree fournisseur afin de mettre a jour le stock disponible.
- En tant que chef de chantier, je veux demander une sortie de stock pour mon projet afin d'alimenter mes travaux.
- En tant que responsable logistique, je veux transferer du stock entre depots afin d'equilibrer les besoins.
- En tant que chef de projet, je veux consulter la consommation de materiaux par chantier afin de suivre le cout reel.
- En tant que controleur interne, je veux comparer le stock theorique et le stock physique afin de detecter les ecarts.

## 18. Priorisation recommandee

### MVP

- referentiel articles
- emplacements de stock
- entrees, sorties, transferts
- allocation a un projet
- stock global et par emplacement
- seuils d'alerte
- historique des mouvements

### Phase 2

- inventaire tournant
- reporting avance
- equipements et maintenance
- workflow de validation plus fin
- reservation de stock

### Phase 3

- scan code-barres et QR code
- suggestion d'approvisionnement
- prevision de consommation
- integrer des objets connectes ou capteurs
