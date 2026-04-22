# T-ERP - Cahier des Charges Fonctionnel

Note de lecture :
ce document decrit la **cible produit**. Pour l'etat reel du socle implemente a la fin de l'etape 2 au `2026-04-08`, voir aussi [Reference du socle actuel](reference-socle-actuel.md).

## 1. Objet du document

Ce document formalise les besoins fonctionnels de **T-ERP**, plateforme ERP SaaS multi-entreprise orientee BTP et recrutement.
Il decrit les usages attendus pour trois profils principaux :

- le **Super Administrateur**
- l'**Entreprise**
- le **Chercheur d'emploi**

L'objectif est de disposer d'une base de travail exploitable pour :

- la conception produit
- la priorisation du backlog
- la modelisation de la base de donnees
- la definition des API
- la conception des ecrans et parcours utilisateurs

## 2. Perimetre fonctionnel

T-ERP couvre les domaines suivants :

- authentification et gestion des acces
- onboarding et validation des entreprises
- gestion des utilisateurs et des roles
- gestion des projets et equipes
- gestion des stocks et ressources
- gestion comptable et financiere
- recrutement et traitement des candidatures
- pilotage administratif de la plateforme

Certains modules sont deja amorces dans l'architecture actuelle, tandis que d'autres relevent des phases suivantes.

### Convention de statut

- **MVP** : fonctionnalite prioritaire a couvrir dans la premiere version exploitable
- **Phase 2** : fonctionnalite importante apres stabilisation du MVP
- **Phase 3** : fonctionnalite avancee ou strategique

---

## 3. Super Administrateur

### 3.1 Role

Le **Super Administrateur** est le pilote global de la plateforme. Il supervise l'activite, controle l'acces des entreprises, suit la croissance de l'ecosysteme et gere les mecanismes critiques de gouvernance.

### 3.2 Objectifs metier

- garantir la qualite et la fiabilite des entreprises inscrites
- assurer la securite et la conformite globale de la plateforme
- suivre les indicateurs de croissance et d'usage
- administrer les comptes sensibles et les situations litigieuses
- piloter les offres commerciales et abonnements

### 3.3 Authentification et acces

**Statut : MVP pour la connexion JWT, Phase 2 pour le renforcement de securite**

Fonctionnalites attendues :

- connexion securisee par email et mot de passe
- renouvellement de session via token de rafraichissement
- consultation du profil courant
- journalisation des connexions et tentatives echouees
- deconnexion de toutes les sessions actives
- reinitialisation de mot de passe par email
- double authentification optionnelle puis obligatoire pour les comptes sensibles

Regles de gestion :

- le compte initial de bootstrap peut etre cree par script en environnement de developpement
- les identifiants d'administration ne doivent pas etre exposes dans la documentation de production
- le mot de passe doit respecter une politique minimale de robustesse
- apres plusieurs echecs consecutifs, le compte peut etre temporairement verrouille

Donnees minimales :

- email
- mot de passe chiffre
- type d'utilisateur
- langue preferee
- statut actif ou suspendu
- historique de connexion

### 3.4 Tableau de bord global

**Statut : MVP partiel, enrichissement en Phase 2**

Objectif :
offrir une vue centralisee et decisionnelle de l'etat de la plateforme.

Indicateurs attendus :

- nombre total d'entreprises
- nombre d'entreprises en attente, validees, rejetees, suspendues
- nombre total d'utilisateurs actifs
- repartition par type d'utilisateur
- nombre d'offres d'emploi publiees
- nombre de candidatures recues
- nombre de projets actifs
- volume de stock declare
- revenus generes par abonnement
- incidents et alertes en cours

Filtres souhaites :

- periode
- pays ou zone geographique
- statut entreprise
- plan d'abonnement

Actions rapides depuis le tableau de bord :

- valider ou rejeter une entreprise
- suspendre un compte
- ouvrir le detail d'un utilisateur
- consulter les alertes critiques
- exporter un rapport

### 3.5 Gestion des entreprises

**Statut : MVP pour l'onboarding et la revue, Phase 2 pour les actions avancees**

Fonctionnalites :

- afficher la liste complete des entreprises
- filtrer par statut, date d'inscription, pays, domaine d'activite, formule
- consulter la fiche detaillee d'une entreprise
- approuver ou rejeter une demande d'inscription
- suspendre, reactiver ou archiver une entreprise
- supprimer une entreprise dans un cadre strictement encadre
- forcer la mise a jour du profil
- changer le niveau d'abonnement ou le statut commercial

Donnees consultables :

- raison sociale
- nom commercial
- RCCM ou equivalent
- NIU ou equivalent
- email et telephone
- pays, ville, adresse
- date de creation du compte
- statut d'onboarding
- statut d'activation
- documents legaux
- historique des projets
- historique de publication d'offres
- journal des actions administratives

Workflow cible :

1. une entreprise soumet sa demande d'inscription
2. la plateforme la place en statut `pending`
3. le super admin verifie les informations et documents
4. il approuve, rejette ou demande une correction
5. l'entreprise est notifiee automatiquement

Regles de gestion :

- une entreprise approuvee peut acceder aux modules metier selon son abonnement
- une entreprise rejetee conserve un historique mais ne peut pas utiliser la plateforme
- la suspension bloque l'acces sans supprimer les donnees
- toute action de moderation doit etre tracee

### 3.6 Gestion des utilisateurs

**Statut : MVP pour la consultation et l'administration de base, Phase 2 pour la moderation avancee**

Types d'utilisateurs concernes :

- administrateurs d'entreprise
- employes
- controleurs externes
- chercheurs d'emploi

Fonctionnalites :

- consulter la liste des utilisateurs
- rechercher par nom, email, entreprise, type, statut
- consulter la fiche detaillee
- suspendre ou reactiver un utilisateur
- reinitialiser un acces
- modifier certains attributs de compte
- visualiser les roles et permissions
- suivre les langues, connexions et activites recentes

Regles de gestion :

- un utilisateur suspendu ne peut plus se connecter
- la suppression logique est preferee a la suppression physique
- l'historique des actions doit rester consultable

### 3.7 Gestion des offres et contenus

**Statut : Phase 2**

Fonctionnalites attendues :

- moderer les offres publiees par les entreprises
- detecter les annonces frauduleuses ou incompletes
- masquer une offre non conforme
- mettre en avant certaines offres sur la plateforme
- traiter les signalements emis par les candidats

Regles de gestion :

- toute offre publiee doit appartenir a une entreprise validee
- une offre signalee plusieurs fois passe automatiquement en revue
- les contenus supprimes doivent etre historises pour audit

### 3.8 Gestion des abonnements et de la facturation plateforme

**Statut : Phase 2 a Phase 3**

Fonctionnalites :

- definir des plans tarifaires `Gratuit`, `Standard`, `Premium`
- associer des quotas et droits par plan
- suivre les paiements, echeances et renouvellements
- suspendre les droits en cas d'impaye
- gerer les promotions et periodes d'essai

Moyens de paiement cibles :

- Mobile Money MTN
- Orange Money
- carte bancaire
- virement bancaire pour grands comptes

Regles de gestion :

- les limitations doivent etre appliquees par module et par volume
- toute transaction doit etre rapprochee d'une facture ou reference de paiement
- les relances d'echeance doivent etre automatiques

### 3.9 Reporting et statistiques

**Statut : MVP partiel pour les stats globales, Phase 2 pour les exports**

Rapports attendus :

- evolution des inscriptions entreprises
- activite par entreprise
- volumetrie des utilisateurs
- performance du recrutement
- activite des projets
- synthese des revenus et impayes

Formats d'export :

- PDF
- Excel
- CSV

Fonctionnalites complementaires :

- planification d'envoi par email
- filtres multicriteres
- sauvegarde de rapports favoris

### 3.10 Notifications systeme

**Statut : Phase 2**

Types de notifications :

- nouvelle inscription entreprise
- document legal manquant ou invalide
- signalement de fraude
- depassement de seuil critique
- paiement en attente
- candidature ou offre suspecte

Canaux :

- centre de notifications interne
- email
- SMS pour alertes critiques

### 3.11 Securite, audit et conformite

**Statut : MVP pour les controles de base, Phase 2 pour l'audit et les alertes avancees**

Fonctionnalites :

- journal des actions administratives
- horodatage de toutes les operations sensibles
- sauvegardes automatiques
- detection d'activites suspectes
- controle des acces par roles et permissions
- tracabilite des changements de statut

Exigences :

- les donnees doivent etre isolees entre entreprises
- les actions critiques doivent etre non repudiables
- les sauvegardes doivent pouvoir etre restaurees rapidement

### 3.12 User stories prioritaires

- En tant que super administrateur, je veux valider une entreprise afin d'autoriser son acces aux modules metier.
- En tant que super administrateur, je veux consulter les statistiques globales afin de suivre l'adoption de la plateforme.
- En tant que super administrateur, je veux suspendre un utilisateur ou une entreprise afin de limiter un risque operationnel.
- En tant que super administrateur, je veux exporter un rapport afin de partager les indicateurs avec la direction.

---

## 4. Entreprise

### 4.1 Role

L'**Entreprise** est le client principal de T-ERP. Elle utilise la plateforme pour structurer ses operations, centraliser ses informations et piloter ses projets, ressources, recrutements et processus internes.

### 4.2 Objectifs metier

- digitaliser la gestion de l'entreprise BTP
- suivre les chantiers et les equipes
- securiser les informations administratives et RH
- mieux preparer les reponses aux marches
- recruter plus rapidement les bons profils

### 4.3 Creation, validation et gestion du profil entreprise

**Statut : MVP pour l'inscription et les parametres, Phase 2 pour le dossier complet**

Donnees de reference :

- raison sociale
- nom commercial
- RCCM ou numero d'immatriculation
- NIU ou identifiant fiscal
- email
- telephone
- pays
- ville
- adresse
- domaine d'activite
- taille de l'entreprise
- documents legaux

Fonctionnalites :

- soumettre une demande d'inscription
- creer automatiquement le compte administrateur de l'entreprise
- completer ou modifier le profil
- televerser les pieces justificatives
- configurer langue, devise, fuseau horaire et format de date
- suivre le statut de validation du compte

Distinction de parcours a conserver dans l'interface :

- **profil utilisateur admin** : informations personnelles du compte admin, preferences de notifications, piece d'identite et CV
- **profil entreprise** : donnees legales et administratives de l'entreprise, documents juridiques, statut d'onboarding et configuration societe
- les labels et ecrans doivent eviter l'ambiguite entre ces deux objets

Regles de gestion :

- l'entreprise reste en attente tant que la validation n'est pas accordee
- certains modules ne sont accessibles qu'apres approbation
- les modifications juridiques majeures peuvent necessiter une revalidation

### 4.4 Gestion des utilisateurs et du personnel

**Statut : MVP pour les utilisateurs, Phase 2 pour la gestion RH avancee**

Specification detaillee associee :

- [Module detaille Personnel de l'entreprise](module-personnel-entreprise.md)

Objectifs metier :

- structurer l'organisation interne et les lignes hierarchiques
- definir les roles et responsabilites par direction
- gerer les acces au systeme selon les fonctions reelles
- suivre les affectations des collaborateurs aux services et projets
- fluidifier la coordination entre direction, technique, administratif, finance et logistique

Profils de pilotage cibles :

- Directeur General
- Directeur Technique
- Directeur Administratif
- Directeur Administratif et Financier
- Responsable Logistique
- Responsable RH / Administrateur d'entreprise

Fonctionnalites :

- creer des comptes employes
- structurer directions, services et postes
- definir des roles internes
- attribuer des permissions
- activer ou desactiver un compte
- modifier la langue preferee
- suivre l'affectation des collaborateurs aux equipes
- gerer les workflows de validation entre directions
- produire des tableaux de bord et alertes par profil de responsabilite

Donnees collaborateurs attendues :

- matricule
- nom et prenom
- email et telephone
- fonction
- direction ou service
- type de contrat
- date d'embauche
- salaire ou fourchette salariale
- competences
- documents RH
- statut actif ou inactif

Extensions RH prevues :

- gestion des presences
- conges et absences
- fiches de paie
- historique disciplinaire
- evaluations de performance

Regles de gestion :

- un employe ne doit voir que les modules autorises
- les roles peuvent etre systeme ou personnalises
- les directions doivent pouvoir disposer d'acces differencies selon leur responsabilite
- les validations critiques doivent etre historisees
- les donnees RH sensibles doivent etre reservees aux profils habilites

### 4.5 Gestion des projets

**Statut : MVP**

Donnees projet :

- code projet
- nom
- description
- client
- localisation
- date de debut
- date de fin
- statut
- budget

Fonctionnalites :

- creer un projet
- modifier ou archiver un projet
- creer des equipes par projet
- affecter des membres aux equipes
- nommer un superviseur
- creer et suivre des taches
- definir priorite, echeance et responsable
- saisir des rapports journaliers

Statuts a couvrir :

- planifie
- en cours
- en pause
- termine
- annule

Modules avances souhaites :

- diagramme de Gantt
- journal de chantier
- suivi photo
- comptes rendus avec validation
- suivi des blocages et risques

Regles de gestion :

- chaque projet appartient a une seule entreprise
- les equipes et taches sont rattachees au projet
- l'historique des rapports journaliers doit etre conserve

### 4.6 Gestion des ressources et des stocks

**Statut : MVP pour les stocks, Phase 2 pour l'inventaire avance, l'equipement et la maintenance**

Specification detaillee associee :

- [Module detaille Gestion de Stock](module-gestion-stock-btp.md)

Objectifs metier :

- suivre les entrees et sorties de materiaux, consommables et equipements
- piloter les stocks par magasin, depot ou chantier
- relier les consommations de stock aux projets et taches
- reduire les ruptures, pertes, vols et surstocks
- fiabiliser les besoins d'approvisionnement

Perimetre de gestion :

- materiaux de construction
- consommables de chantier
- outillage et petits equipements
- engins et machines dans une phase avancee
- stock principal, stock secondaire et stock chantier
- transferts inter-depots et retours chantier
- inventaires et ajustements
- reporting et alertes

Fonctionnalites prioritaires :

- creer des emplacements de stock
- gerer les articles et references
- suivre les entrees, sorties, transferts et ajustements
- connaitre le stock global et par emplacement
- allouer des quantites a un projet
- definir des seuils d'alerte
- suivre le stock disponible, reserve, en commande et en transit
- historiser tous les mouvements avec auteur, date et justification
- produire des etats de stock et historiques de consommation
- gerer les inventaires periodiques et tournants

Donnees de base :

- code article ou SKU
- designation
- type d'article
- categorie
- unite
- seuil minimal
- seuil maximal optionnel
- emplacement
- quantite
- reference de mouvement
- prix moyen ou prix d'achat de reference
- fournisseur principal
- projet et responsable de mouvement si applicable

Flux de mouvements a couvrir :

- entree par achat fournisseur
- entree par retour chantier
- transfert entre emplacements
- sortie vers chantier ou service interne
- sortie pour perte, casse ou vol
- ajustement d'inventaire
- allocation a un projet

Extensions prevues :

- gestion des machines et engins
- calendrier de maintenance
- etat de disponibilite
- amortissement et cout d'utilisation
- scan code-barres ou QR code
- suggestions d'approvisionnement
- prevision de consommation par chantier

Regles de gestion :

- un mouvement doit avoir un type valide
- la quantite doit etre strictement positive
- toute allocation a un projet doit etre historisee
- une sortie ne doit pas rendre le stock negatif sauf derogation explicite
- un transfert doit conserver la tracabilite source et destination
- les inventaires et ajustements doivent exiger une justification
- les sorties sensibles peuvent necessiter validation par un responsable

Indicateurs et rapports attendus :

- etat du stock global et par emplacement
- fiche de stock par article
- historique des mouvements
- consommation par projet
- valorisation du stock
- ecarts d'inventaire
- alertes de rupture, stock faible et surstock

### 4.7 Gestion financiere

**Statut : Phase 2**

Specification detaillee associee :

- [Module detaille Gestion Comptable et Financiere](module-gestion-comptable-financiere.md)

Objectifs metier :

- suivre toutes les operations financieres de l'entreprise
- structurer la comptabilite generale et analytique
- piloter la tresorerie et les paiements
- mesurer la rentabilite des projets
- produire les documents et rapports financiers attendus

Perimetre de gestion :

- plan comptable
- journaux comptables
- depenses et engagements
- recettes et encaissements
- facturation client
- tresorerie caisse, banque et mobile money
- suivi budgetaire et financier des projets
- reporting financier et exports

Fonctionnalites attendues :

- budget global et budget par projet
- saisie des depenses
- suivi des recettes
- gestion de la facturation
- suivi des paiements clients
- suivi des paiements fournisseurs
- gestion des comptes de tresorerie
- rapprochement entre projet, stock, RH et finance
- production des etats comptables et financiers

Donnees et referentiels de base :

- comptes actifs, passifs, charges et produits
- journaux des ventes, achats, caisse et banque
- centres de cout ou axes analytiques
- modes de paiement
- devise de reference et multi-devises en phase avancee
- periodes comptables
- categories de depenses et recettes

Flux principaux :

- enregistrement d'une depense avec piece justificative
- enregistrement d'une recette ou d'un encaissement client
- emission d'une facture liee ou non a un projet
- suivi des echeances, paiements partiels et impayes
- suivi des mouvements de caisse, banque et mobile money
- ventilation des ecritures par projet ou centre de cout
- consolidation des soldes et indicateurs de resultat

Indicateurs attendus :

- taux de consommation budgetaire
- marge par projet
- retards de paiement
- ecarts previsionnel versus realise
- chiffre d'affaires
- charges par categorie
- tresorerie nette
- cash-flow

Alertes :

- depassement de budget
- facture echeance proche
- depense inhabituelle
- solde de tresorerie critique
- paiement client en retard
- ecart important entre budget et realise

Sorties documentaires attendues :

- factures
- recus
- bons de paiement
- bons de commande
- bilan financier
- compte de resultat
- flux de tresorerie

### 4.8 Gestion des marches publics

**Statut : Phase 3**

Fonctionnalites attendues :

- consultation des appels d'offres
- veille sur les publications pertinentes
- creation d'une bibliotheque de dossiers
- preparation assistee des DAO
- checklist de conformite
- soumission et suivi des resultats
- archivage des marches gagnes ou perdus

Innovations cibles :

- generateur de dossier type
- controle automatique des pieces manquantes
- base documentaire reutilisable
- suivi des echeances et renouvellements de documents

### 4.9 Recrutement

**Statut : MVP pour les offres et candidatures, Phase 2 pour l'ATS avance**

Fonctionnalites :

- creer une offre d'emploi
- sauvegarder une offre en brouillon
- publier ou cloturer une offre
- recevoir des candidatures
- consulter les profils candidats
- faire avancer un candidat dans le pipeline
- attribuer un score ou note
- generer des correspondances de profils

Etapes du pipeline candidat :

- soumis
- preselection
- entretien
- shortlist
- rejete
- recrute

Donnees d'offre attendues :

- intitule du poste
- description
- type de contrat
- lieu
- fourchette salariale
- competences requises
- date limite
- statut

Regles de gestion :

- une candidature par candidat et par offre
- une offre fermee n'accepte plus de nouvelles candidatures
- les matchs candidats doivent etre explicables par des criteres lisibles

### 4.10 Tableau de bord entreprise

**Statut : MVP evolutif**

Indicateurs attendus :

- nombre de projets actifs
- nombre de taches en retard
- effectif total
- offres d'emploi actives
- candidatures recues
- niveau de stock critique
- depenses du mois
- alertes prioritaires

Vues recommandees :

- vue direction generale
- vue RH
- vue chef de projet
- vue stock ou logistique

### 4.11 Notifications

**Statut : Phase 2**

Notifications attendues :

- nouvelle candidature
- projet en retard
- tache echeance proche
- seuil de stock atteint
- entreprise approuvee ou rejetee
- document a renouveler
- paiement recu ou en attente

Canaux :

- interface web
- email
- notification mobile dans une phase ulterieure

### 4.12 Securite et regles transverses

Exigences :

- isolation stricte des donnees par entreprise
- gestion des droits par role
- conservation des historiques critiques
- compatibilite mobile et bureau
- multilingue francais et anglais

### 4.13 User stories prioritaires

- En tant qu'administrateur d'entreprise, je veux enregistrer ma societe afin d'acceder a la plateforme apres validation.
- En tant que responsable RH, je veux creer des comptes employes et leur attribuer des roles afin de controler l'acces aux modules.
- En tant que chef de projet, je veux suivre les taches et rapports d'un chantier afin de piloter l'avancement.
- En tant que responsable logistique, je veux suivre les mouvements de stock afin d'eviter les ruptures.
- En tant que recruteur, je veux publier une offre et traiter les candidatures afin de recruter plus vite.

---

## 5. Chercheur d'emploi

### 5.1 Role

Le **Chercheur d'emploi** utilise T-ERP pour se rendre visible, rechercher des opportunites dans le BTP et suivre l'avancement de ses candidatures.

### 5.2 Objectifs metier

- trouver des offres pertinentes
- postuler simplement
- valoriser son experience et ses competences
- suivre ses candidatures sans opacite

### 5.3 Creation de compte et profil candidat

**Statut : MVP pour le profil candidat, Phase 2 pour l'enrichissement**

Donnees du profil :

- nom
- prenom
- email
- telephone
- ville
- CV
- annees d'experience
- poste recherche
- competences
- disponibilite
- pretention salariale
- mobilite geographique

Fonctionnalites :

- creer ou completer son profil
- importer un CV
- mettre a jour ses informations
- declarer ses competences et experiences
- indiquer sa disponibilite immediate ou differee
- rendre le profil visible aux recruteurs

Regles de gestion :

- l'email candidat doit etre unique
- le profil incomplet reste utilisable mais perd en visibilite
- la suppression du compte doit respecter la politique de conservation des candidatures

### 5.4 Recherche d'emploi

**Statut : MVP pour la consultation de base, Phase 2 pour la recherche avancee**

Fonctionnalites :

- consulter les offres disponibles
- rechercher par metier
- filtrer par localisation
- filtrer par type de contrat
- filtrer par niveau d'experience
- enregistrer des offres favorites
- recevoir des recommandations personnalisees

Filtres cibles :

- ville ou region
- contrat CDI, CDD, stage, mission
- domaine ou specialite
- niveau d'experience
- fourchette salariale

### 5.5 Candidature et suivi

**Statut : MVP**

Fonctionnalites :

- postuler a une offre
- joindre ou selectionner son CV
- ajouter un message de motivation
- suivre le statut de chaque candidature
- consulter les retours de l'entreprise lorsque disponibles

Statuts visibles candidat :

- en attente
- en cours d'etude
- entretien
- retenu
- rejete

Regles de gestion :

- une meme offre ne peut etre candidatee qu'une seule fois par profil
- un candidat doit pouvoir retrouver l'historique de ses candidatures
- les changements de statut doivent generer une notification

### 5.6 Tableau de bord candidat

**Statut : Phase 2**

Contenus attendus :

- nombre total de candidatures
- repartition par statut
- taux de reponse
- offres recommandees
- niveau de completion du profil
- actions conseillees pour ameliorer la visibilite

### 5.7 Notifications

**Statut : Phase 2**

Notifications attendues :

- nouvelle offre correspondant au profil
- changement de statut d'une candidature
- demande d'entretien
- message de l'entreprise
- profil incomplet

Canaux :

- centre de notifications
- email
- SMS pour convocations importantes selon parametrage

### 5.8 Matching intelligent et aide a la candidature

**Statut : Phase 2 a Phase 3**

Fonctionnalites proposees :

- score de compatibilite avec une offre
- recommandations automatiques basees sur competences et experience
- suggestions pour completer le profil
- classement des offres les plus pertinentes

Principes attendus :

- score lisible et justifiable
- pas de boite noire incomprehensible
- prise en compte du lieu, de l'experience, des competences et du niveau de completion du profil

### 5.9 Securite et respect des donnees personnelles

Exigences :

- consentement clair sur l'usage des donnees
- possibilite de mettre le profil en prive
- acces limite aux entreprises habilitees
- suppression logique et tracabilite des changements critiques

### 5.10 User stories prioritaires

- En tant que chercheur d'emploi, je veux creer mon profil afin d'etre visible par les recruteurs.
- En tant que chercheur d'emploi, je veux rechercher des offres par metier et localisation afin de gagner du temps.
- En tant que chercheur d'emploi, je veux postuler en quelques clics afin de multiplier mes opportunites.
- En tant que chercheur d'emploi, je veux suivre le statut de mes candidatures afin de savoir ou j'en suis.

---

## 6. Exigences transverses

### 6.1 Exigences fonctionnelles globales

- gestion multi-entreprise avec isolation stricte des donnees
- gestion des roles et permissions par module
- interface responsive desktop et mobile
- support multilingue francais et anglais
- historisation des actions critiques
- capacite d'export des donnees et rapports

### 6.2 Exigences non fonctionnelles

- performance acceptable sur connexion mobile
- architecture modulaire pour ajout de nouveaux domaines
- securite des mots de passe et des tokens
- journaux exploitables pour audit
- sauvegardes automatiques
- disponibilite cible adaptee a un usage professionnel

### 6.3 Interoperabilite et evolutivite

Le systeme doit etre concu pour permettre a terme :

- une API publique ou partenaire
- l'integration de passerelles de paiement
- l'ajout de connecteurs comptables
- l'ajout de moteurs de signature et de verification documentaire
- la publication mobile ou PWA

---

## 7. Priorisation recommandee

### Phase 1 - MVP exploitable

- authentification et gestion des acces
- onboarding et validation des entreprises
- gestion des utilisateurs et roles
- gestion des projets, equipes, taches et rapports
- gestion des stocks et allocations projet
- publication d'offres, candidatures et matching de base
- statistiques globales d'administration

### Phase 2 - Consolidation metier

- tableau de bord avance par profil
- notifications multicanales
- moderation des contenus
- export PDF et Excel
- gestion comptable et financiere
- score de profil et recommandations candidat
- renforcement securite avec MFA et logs avances

### Phase 3 - Differenciation strategique

- gestion complete des abonnements et paiements
- gestion des marches publics
- maintenance des equipements
- automatisation documentaire avancee
- intelligence de matching et assistance a la decision

---

## 8. Conclusion

Le present cahier des charges positionne **T-ERP** comme une plateforme :

- orientee terrain et gestion d'entreprise BTP
- capable de couvrir a la fois l'operationnel et le recrutement
- evolutive vers des usages plus strategiques comme la finance, les abonnements et les marches publics

Ce document peut servir de base immediate pour la suite du projet :

- diagramme de base de donnees
- contrats d'API
- maquettes UI
- backlog de developpement par sprint
