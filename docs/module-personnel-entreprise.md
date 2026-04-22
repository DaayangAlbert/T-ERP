# T-ERP - Module Personnel de l'entreprise

Document parent :

- [Cahier des charges fonctionnel](cahier-des-charges-fonctionnel.md)
- [ERD Base de Donnees](erd-base-de-donnees.md)
- [Routes API Flask detaillees](routes-api-flask-detaillees.md)

## 1. Objet du module

Le module **Personnel de l'entreprise** doit permettre de structurer l'organisation interne, definir les responsabilites, gerer les acces au systeme et suivre l'activite des collaborateurs.

Il constitue le point de jonction entre la gouvernance, l'execution des projets, la logistique, la finance et, a terme, les fonctions RH avancees.

Dans le MVP actuel, il s'appuie principalement sur les fondations `users`, `roles`, `permissions`, `teams` et `projects`.
En phase suivante, il doit evoluer vers un module RH plus complet sans casser les mecanismes de securite deja en place.

## 2. Objectifs metier

- structurer clairement l'organigramme de l'entreprise
- definir les roles, missions et responsabilites de chaque acteur
- securiser l'acces aux modules selon le principe du moindre privilege
- suivre l'affectation des collaborateurs aux directions, services et projets
- fluidifier la coordination entre direction, technique, finance, administratif et logistique
- disposer d'un socle fiable pour les workflows de validation et les audits
- preparer l'extension vers les presences, conges, paie et evaluations

## 3. Perimetre fonctionnel

Le module doit couvrir :

- l'organigramme de l'entreprise
- les directions, services et rattachements hierarchiques
- les fiches collaborateurs
- les comptes utilisateurs et profils d'acces
- les roles systeme et roles personnalises
- les affectations aux projets, equipes et chantiers
- les tableaux de bord par profil de direction
- les workflows de validation inter-services
- les journaux d'activite et d'audit
- les rapports RH et organisationnels de base

## 4. Acteurs et roles

Profils metier cibles :

- **Administrateur d'entreprise** : parametre le referentiel interne, cree les comptes et gere les roles
- **Responsable RH / administratif** : gere les dossiers collaborateurs, les contrats et les affectations internes
- **Directeur General (DG)** : supervise l'ensemble des activites et valide les decisions majeures
- **Directeur Technique (DT)** : pilote l'execution technique des projets et les equipes terrain
- **Directeur Administratif** : controle les documents, contrats et conformites administratives
- **Directeur Administratif et Financier (DAF)** : pilote la finance, les budgets et la rentabilite
- **Responsable Logistique** : gere les stocks, livraisons, affectations materiels et besoins chantier
- **Chef de projet / Chef de chantier** : execute la coordination operationnelle sur un projet donne
- **Direction / Controle interne** : consulte les rapports, alertes et traces de validation

Permissions a prevoir :

- consultation des collaborateurs
- creation et modification de compte
- affectation ou retrait de role
- consultation des donnees sensibles
- validation hierarchique
- validation budgetaire
- acces aux rapports et exports
- acces aux journaux d'audit

Regle de cadrage :

- dans le MVP, les acces doivent s'appuyer d'abord sur les permissions existantes par module, par exemple `users.read`, `users.manage`, `projects.read`, `inventory.manage`, `finance.read`
- en phase 2, le systeme pourra introduire des droits plus fins tels que `users.sensitive_read`, `workflow.approve`, `reports.export` ou `finance.threshold_approve`

## 4.1 Distinction profil admin et profil entreprise

Pour l'administrateur d'entreprise, le produit doit separer clairement deux parcours :

- **profil utilisateur admin** : identite du compte admin, preferences de notifications, pieces personnelles
- **profil entreprise** : informations societaires, documents juridiques, statut de validation et parametres globaux

Contraintes UX :

- les deux parcours doivent avoir des titres et sections differencies
- le profil utilisateur admin ne doit pas etre presente comme le dossier legal de l'entreprise
- un lien direct doit permettre de passer du profil utilisateur admin vers le profil entreprise

## 5. Referentiels organisationnels

### 5.1 Directions et services

Le systeme doit permettre de definir au minimum :

- Direction generale
- Direction technique
- Direction administrative
- Direction administrative et financiere
- Logistique et approvisionnement
- Ressources humaines
- Equipes projet et chantier

Chaque entite organisationnelle doit inclure :

- code
- libelle
- type d'entite
- responsable principal
- rattachement parent optionnel
- niveau hierarchique
- statut actif ou inactif

### 5.2 Postes et fonctions

Le systeme doit distinguer :

- le **poste** occupe dans l'entreprise
- le **role applicatif** dans T-ERP
- le **niveau de validation** autorise

Chaque fonction doit pouvoir definir :

- intitule
- description
- missions principales
- competences requises
- service de rattachement
- niveau de responsabilite
- modules accessibles
- seuils de validation eventuels

### 5.3 Organigramme

Le module doit permettre :

- la visualisation de l'organigramme
- l'identification du responsable par service
- le rattachement d'un collaborateur a un service
- la gestion d'interims ou delegations temporaires
- l'historisation des changements d'organisation

## 6. Dossier collaborateur

### 6.1 Donnees d'identification

Chaque collaborateur doit disposer au minimum des informations suivantes :

- matricule interne
- nom
- prenom
- email
- telephone
- sexe optionnel
- date de naissance optionnelle
- adresse optionnelle
- personne a contacter en cas d'urgence

### 6.2 Donnees contractuelles et RH

Le dossier collaborateur doit pouvoir contenir :

- fonction
- direction ou service
- type de contrat
- date d'embauche
- date de fin de contrat optionnelle
- salaire ou fourchette salariale
- statut actif, suspendu, en preavis ou sorti
- competences
- certifications et habilitations
- documents RH

### 6.3 Documents associes

Documents a gerer en priorite :

- contrat de travail
- piece d'identite
- CV
- diplomes et certificats
- attestations administratives
- evaluations internes
- sanctions ou avertissements en phase avancee

### 6.4 Statuts de cycle de vie

Statuts recommandes :

- brouillon
- en onboarding
- actif
- suspendu
- en mobilite interne
- en sortie
- archive

Regles de gestion :

- un collaborateur archive ne doit plus pouvoir se connecter
- l'historique des affectations et roles doit etre conserve
- les documents sensibles ne doivent etre visibles que par les profils habilites

## 7. Gestion des acces et habilitations

### 7.1 Principes directeurs

Le module doit garantir :

- l'isolation stricte par entreprise
- le moindre privilege
- la separation des responsabilites
- la tracabilite des validations
- la revocabilite rapide des acces

### 7.2 Modele d'acces

Un acces doit etre calcule a partir de :

- l'utilisateur
- son type de compte
- ses roles applicatifs
- son entreprise
- son service
- ses affectations projet
- son statut actif ou non

### 7.3 Synthese des acces metier

| Role | Projets | Stock | Comptabilite | Personnel | Documents / Marches | Rapports |
| --- | --- | --- | --- | --- | --- | --- |
| DG | Lecture + validation | Lecture | Lecture + validation majeure | Lecture globale | Lecture | Lecture globale |
| DT | Complet | Partiel | Limite | Lecture technique | Lecture chantier | Lecture technique |
| DAF | Lecture financiere | Limite | Complet | Lecture | Lecture budgetaire | Lecture + export |
| Directeur administratif | Lecture | Non | Partiel | Oui | Complet | Lecture administrative |
| Responsable logistique | Partiel | Complet | Limite | Non | Fournisseurs / achats | Lecture logistique |

### 7.4 Permissions applicatives minimales

Le MVP doit au minimum supporter les combinaisons suivantes :

- DG : `users.read`, `projects.read`, `finance.read`, `inventory.read`, `procurement.read`
- DT : `projects.read`, `projects.manage`, `inventory.read`, `users.read`
- Directeur administratif : `users.read`, `users.manage`, `procurement.read`
- DAF : `finance.read`, `finance.manage`, `projects.read`, `inventory.read`
- Responsable logistique : `inventory.read`, `inventory.manage`, `projects.read`, `finance.read`, `procurement.read`

Remarque :

- les niveaux "validation" ou "approbation de seuil" doivent etre modelises d'abord par workflow metier, puis ensuite par permissions specialisees en phase 2

## 8. Profils de direction et responsables

### 8.1 Directeur General (DG)

#### Definition du role

Le Directeur General est le responsable principal de l'entreprise.
Il supervise l'ensemble des activites, arbitre les priorites et prend les decisions strategiques.

#### Missions principales

- superviser tous les departements
- valider les decisions importantes
- suivre les projets et marches
- controler la performance globale
- prendre les decisions financieres majeures
- representer l'entreprise

#### Acces dans le systeme

Le DG doit beneficier d'un acces global en lecture sur :

- les projets
- la comptabilite
- le stock
- le personnel
- les marches publics
- les rapports

Il doit egalement pouvoir valider certaines operations critiques :

- projet majeur
- marche
- depense au-dela d'un seuil
- arbitrage inter-services

#### Fonctionnalites specifiques

- consulter tous les projets
- valider un projet ou un marche
- consulter les etats financiers
- approuver les depenses importantes
- consulter les rapports d'activite
- visualiser la rentabilite par projet
- acceder aux KPI strategiques

#### Tableau de bord DG

Le tableau de bord DG doit afficher au minimum :

- projets en cours
- projets en retard
- chiffre d'affaires
- depenses globales
- benefices estimes
- etat du stock
- personnel actif
- alertes critiques

### 8.2 Directeur Technique (DT)

#### Definition du role

Le Directeur Technique est responsable de la realisation technique des projets et de la qualite de l'execution terrain.

#### Missions principales

- superviser les chantiers
- valider les choix techniques
- suivre l'execution des travaux
- coordonner les equipes techniques
- assurer la qualite des travaux

#### Acces systeme

- module projets en gestion complete
- module ressources techniques et equipe
- acces limite a la comptabilite
- acces au personnel technique

#### Fonctionnalites specifiques

- creer et gerer les projets
- planifier les travaux
- affecter les equipes
- suivre l'avancement
- valider les taches
- gerer les incidents techniques
- consulter les rapports de chantier

#### Indicateurs cles

- taux d'avancement
- respect des delais
- qualite des travaux
- incidents techniques
- charge des equipes
- consommation de ressources par chantier

### 8.3 Directeur Administratif

#### Definition du role

Le Directeur Administratif pilote les aspects administratifs, documentaires et organisationnels de l'entreprise.

#### Missions principales

- gerer les documents administratifs
- suivre les contrats
- gerer les dossiers de marches
- assurer la conformite reglementaire
- coordonner l'archivage et les validations documentaires

#### Acces systeme

- documents
- marches publics
- personnel
- acces partiel a la comptabilite

#### Fonctionnalites specifiques

- gestion documentaire
- suivi des contrats
- validation administrative
- archivage
- gestion des dossiers DAO
- suivi des echeances documentaires

#### Indicateurs cles

- taux de dossiers complets
- echeances contractuelles a risque
- nombre de dossiers en attente
- taux de conformite administrative

### 8.4 Directeur Administratif et Financier (DAF)

#### Definition du role

Le DAF est responsable de la gestion financiere de l'entreprise et du controle economique global.

#### Missions principales

- superviser la comptabilite
- gerer les budgets
- controler les depenses
- assurer la rentabilite
- arbitrer les besoins de financement

#### Acces systeme

- module comptabilite en gestion complete
- module projets avec vue financiere
- module paiements
- module facturation

#### Fonctionnalites specifiques

- validation des depenses
- suivi de tresorerie
- analyse financiere
- generation de rapports
- gestion des paiements
- suivi des dettes et creances

#### Indicateurs cles

- cash-flow
- marge
- rentabilite
- dettes et creances
- taux de consommation budgetaire
- ecarts budget versus realise

### 8.5 Responsable Logistique

#### Definition du role

Le Responsable Logistique est charge de gerer les flux de materiel, organiser les approvisionnements, coordonner le transport et optimiser l'utilisation des ressources.

#### Missions principales

- assurer la disponibilite des materiaux
- organiser les livraisons
- gerer les stocks
- coordonner les equipements
- planifier les besoins logistiques des projets

#### Acces systeme

- module stock en gestion complete
- module projets pour les ressources
- module fournisseurs
- acces partiel a la comptabilite

#### Fonctionnalites specifiques

Gestion des stocks :

- suivi des entrees et sorties
- gestion des niveaux de stock
- alertes de rupture
- inventaire

Approvisionnement :

- demande d'achat
- suivi des commandes
- gestion des fournisseurs

Transport :

- planification des livraisons
- suivi des mouvements
- affectation des vehicules

Affectation aux projets :

- allocation des materiaux
- suivi de consommation

#### Indicateurs cles

- niveau de stock
- taux de rupture
- delais de livraison
- cout logistique
- consommation par projet

#### Evolutions ciblees

- optimisation automatique des stocks
- suggestions d'achat
- suivi GPS des livraisons
- gestion multi-depots
- alertes intelligentes

## 9. Affectation aux projets et coordination terrain

Le module doit permettre :

- d'affecter un collaborateur a une direction ou un service
- d'affecter un collaborateur a un ou plusieurs projets
- de distinguer un rattachement permanent d'une mission temporaire
- d'associer un responsable de projet, un chef de chantier et des membres d'equipe
- de tracer la date de debut et de fin d'affectation
- d'indiquer le taux de disponibilite d'un collaborateur

Regles de gestion :

- une affectation ne doit pas contourner les permissions applicatives
- les affectations terminees doivent rester historisees
- une affectation critique peut necessiter validation hierarchique

## 10. Workflows et circuits de validation

### 10.1 Creation et activation d'un collaborateur

Workflow recommande :

1. creation du dossier collaborateur
2. rattachement a un service ou une direction
3. attribution d'un ou plusieurs roles applicatifs
4. controle des documents et informations minimales
5. activation du compte

### 10.2 Validation budgetaire et operationnelle

Le module doit supporter les circuits suivants :

- DT initie un besoin technique ou une affectation chantier
- Responsable logistique confirme la disponibilite materielle
- DAF valide l'impact budgetaire
- DG arbitre si le seuil ou l'enjeu est strategique

### 10.3 Validation documentaire

Le Directeur Administratif doit pouvoir :

- verifier la completude du dossier
- approuver ou rejeter un document
- demander une correction
- archiver la version finale

### 10.4 Delegation et interim

Le systeme doit permettre :

- la delegation temporaire d'une validation
- la designation d'un remplacant
- la limitation dans le temps de cette delegation
- la tracabilite complete de l'auteur reel et du delegataire

## 11. Suivi des activites et indicateurs

Le module doit permettre de suivre :

- les collaborateurs actifs
- les affectations par projet
- les comptes inactifs ou a desactiver
- les collaborateurs sans role ou sans service
- les validations en attente
- les charges par direction
- les habilitations arrivant a expiration

Indicateurs transverses recommandes :

- effectif total
- effectif actif par direction
- taux d'affectation projet
- taux de comptes desactives
- delai moyen de validation d'un dossier
- nombre d'alertes critiques par periode

## 12. Relations entre les acteurs

### 12.1 DG <-> DAF

Echanges principaux :

- validation des budgets
- arbitrage des depenses majeures
- decisions financieres
- revue de rentabilite

### 12.2 DG <-> DT

Echanges principaux :

- validation des projets
- suivi des performances
- priorisation des chantiers
- arbitrage des risques techniques

### 12.3 DT <-> Responsable logistique

Echanges principaux :

- expression des besoins en materiaux
- planification chantier
- allocation des ressources
- gestion des incidents d'approvisionnement

### 12.4 DAF <-> Responsable logistique

Echanges principaux :

- validation des achats
- suivi des couts
- analyse des consommations
- controle des ecarts logistiques

### 12.5 Directeur Administratif <-> autres directions

Echanges principaux :

- validation documentaire
- suivi contractuel
- conformite des dossiers
- archivage et preuves administratives

## 13. Rapports et tableaux de bord

Le module doit produire au minimum :

- annuaire des collaborateurs
- organigramme par direction
- liste des comptes actifs et suspendus
- matrice roles / permissions / utilisateurs
- rapport d'affectation par projet
- rapport des validations en attente
- rapport des habilitations arrivant a expiration
- tableau de bord DG
- tableau de bord DT
- tableau de bord administratif
- tableau de bord DAF
- tableau de bord logistique

Formats d'export cibles :

- PDF
- Excel
- CSV

## 14. Securite, audit et controle interne

Le module doit garantir :

- journalisation des creations, modifications et suppressions logiques
- journalisation des attributions et retraits de roles
- historisation des validations et delegations
- protection des donnees RH sensibles
- conservation des traces d'acces aux informations critiques
- revue periodique des habilitations

Regles de controle :

- toute elevation de privilege doit etre tracable
- un compte inactif ou sorti doit etre desactive rapidement
- les roles trop larges doivent etre limites ou justifies
- les donnees salariales ne doivent pas etre visibles hors profils autorises

## 15. Integrations avec les autres modules

Le module doit s'integrer avec :

- **Auth / Users** : comptes, roles, permissions, activation et suspension
- **Projects** : affectations, equipes, responsables de projet et chefs de chantier
- **Inventory** : besoins logistiques, mouvements et responsabilites de validation
- **Finance** : budgets, salaires, couts, seuils de validation et rentabilite
- **Procurement** : marches publics, fournisseurs, dossiers administratifs et achats
- **Recruitment** : conversion d'un candidat recrute en collaborateur actif
- **Chat / Calls** : coordination inter-services et notifications temps reel

## 16. Evolutions avancees

Evolutions a prevoir apres stabilisation du MVP :

- gestion des presences
- conges et absences
- fiches de paie
- evaluation de performance
- workflow de sanction ou d'avertissement
- coffre-fort documentaire RH
- signature electronique de documents
- alertes intelligentes sur les habilitations et charges

## 17. User stories prioritaires

- En tant que DG, je veux consulter les KPI globaux du personnel et des projets afin de piloter l'entreprise.
- En tant que responsable RH, je veux creer un collaborateur, lui attribuer un service et un role afin de securiser son acces au systeme.
- En tant que DT, je veux affecter des equipes techniques a un chantier afin de suivre l'execution.
- En tant que DAF, je veux controler les validations de depenses liees aux projets afin de maitriser le budget.
- En tant que Directeur Administratif, je veux suivre les dossiers et contrats afin de garantir la conformite.
- En tant que Responsable logistique, je veux visualiser les besoins materiels par projet afin d'anticiper les approvisionnements.

## 18. Priorisation recommandee

### MVP

- creation et gestion des comptes collaborateurs
- roles et permissions par module
- rattachement a une direction ou un service
- affectation a un projet ou une equipe
- tableaux de bord directionnels de base
- journal d'audit sur les acces et roles

### Phase 2

- workflow de validation plus fin
- documents RH et administratifs
- delegation temporaire et interim
- rapports et exports avances
- droits sensibles et niveaux d'approbation specialises

### Phase 3

- gestion RH avancee complete
- paie
- conges et absences
- evaluation de performance
- analytics predictifs sur les charges et besoins humains
