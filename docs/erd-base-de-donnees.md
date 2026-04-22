# T-ERP - ERD Base de Donnees

Note de lecture :
ce document decrit l'ERD general cible. Pour l'etat reel du socle implemente a la fin de l'etape 2 au `2026-04-08`, voir aussi [Reference du socle actuel](reference-socle-actuel.md).

## 1. Objet

Ce document decrit le schema relationnel cible de **T-ERP** a partir des modeles SQLAlchemy actuellement presents dans le backend.
Il sert de reference pour :

- la validation de la base PostgreSQL
- la definition des routes API Flask
- la preparation des maquettes UI
- la priorisation des evolutions metier

Pour le detail cible des modules **Personnel de l'entreprise**, **Gestion de Stock** et **Gestion Comptable et Financiere** issus des specifications metier etendus, voir aussi :

- [Module Personnel de l'entreprise](module-personnel-entreprise.md)
- [ERD cible Stock + Finance](erd-stock-finance.md)

Le perimetre couvre le noyau actuel du MVP :

- entreprises et parametrage
- utilisateurs, roles et permissions
- projets, equipes, taches et rapports
- stocks et allocations projet
- recrutement et candidatures
- chat et appels

---

## 2. Principes structurants

### 2.1 Multi-tenant

T-ERP est concu comme une plateforme multi-entreprise.
Toutes les tables metier multi-tenant portent un `company_id` afin d'assurer :

- l'isolation stricte des donnees
- le controle d'acces par entreprise
- la supervision ciblee par le super admin

### 2.2 Conventions transverses

Colonnes recurrentes :

- `id` : cle primaire
- `created_at` : horodatage de creation
- `updated_at` : horodatage de mise a jour
- `deleted_at` : suppression logique pour les entites qui la supportent

### 2.3 Familles d'entites

- **Tenant** : `companies`, `company_settings`
- **Identite** : `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- **Projet** : `projects`, `teams`, `team_members`, `project_tasks`, `project_reports`
- **Stock** : `stock_locations`, `inventory_items`, `stock_movements`, `project_stock_allocations`
- **Recrutement** : `job_offers`, `candidate_profiles`, `job_applications`, `candidate_matches`
- **Collaboration** : `chat_conversations`, `chat_participants`, `chat_messages`, `chat_message_reads`, `call_sessions`, `call_participants`

---

## 3. Diagramme ERD global

```mermaid
erDiagram
    COMPANY {
        int id PK
        string legal_name
        string trade_name
        string registration_number UK
        string tax_number UK
        string email
        string phone
        string country_code
        string city
        string address_line
        boolean is_active
        string onboarding_status
        datetime created_at
        datetime updated_at
    }

    COMPANY_SETTING {
        int id PK
        int company_id FK
        string currency
        string timezone
        string default_language
        string date_format
        datetime created_at
        datetime updated_at
    }

    USER {
        int id PK
        int company_id FK
        string email
        string password_hash
        string first_name
        string last_name
        string phone
        string preferred_language
        string user_type
        boolean is_active
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    ROLE {
        int id PK
        int company_id FK
        string name
        string code
        string description
        boolean is_system
        datetime created_at
        datetime updated_at
    }

    PERMISSION {
        int id PK
        string module
        string action
        string code UK
        string description
        datetime created_at
        datetime updated_at
    }

    ROLE_PERMISSION {
        int id PK
        int role_id FK
        int permission_id FK
        datetime created_at
        datetime updated_at
    }

    USER_ROLE {
        int id PK
        int user_id FK
        int role_id FK
        int company_id FK
        datetime created_at
        datetime updated_at
    }

    PROJECT {
        int id PK
        int company_id FK
        string code
        string name
        string description
        string location
        string client_name
        date start_date
        date end_date
        string status
        decimal budget_amount
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    TEAM {
        int id PK
        int company_id FK
        int project_id FK
        string name
        int supervisor_user_id FK
        datetime created_at
        datetime updated_at
    }

    TEAM_MEMBER {
        int id PK
        int company_id FK
        int team_id FK
        int user_id FK
        string role_on_team
        datetime created_at
        datetime updated_at
    }

    PROJECT_TASK {
        int id PK
        int company_id FK
        int project_id FK
        string title
        string description
        int assigned_to_user_id FK
        date due_date
        string priority
        string status
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    PROJECT_REPORT {
        int id PK
        int company_id FK
        int project_id FK
        int author_user_id FK
        date report_date
        string weather
        string summary
        string blockers
        datetime created_at
        datetime updated_at
    }

    STOCK_LOCATION {
        int id PK
        int company_id FK
        string code
        string name
        string location_type
        int project_id FK
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    INVENTORY_ITEM {
        int id PK
        int company_id FK
        string sku
        string name
        string unit
        string category
        decimal min_threshold
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    STOCK_MOVEMENT {
        int id PK
        int company_id FK
        int item_id FK
        int from_location_id FK
        int to_location_id FK
        string movement_type
        decimal quantity
        int performed_by_user_id FK
        string reference
        string notes
        datetime created_at
        datetime updated_at
    }

    PROJECT_STOCK_ALLOCATION {
        int id PK
        int company_id FK
        int project_id FK
        int item_id FK
        decimal quantity_allocated
        int allocated_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    JOB_OFFER {
        int id PK
        int company_id FK
        string title
        string description
        string contract_type
        string location
        decimal salary_min
        decimal salary_max
        string status
        int published_by_user_id FK
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    CANDIDATE_PROFILE {
        int id PK
        int user_id FK
        string email UK
        string first_name
        string last_name
        string phone
        string city
        int years_experience
        string desired_position
        string cv_url
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    JOB_APPLICATION {
        int id PK
        int company_id FK
        int job_offer_id FK
        int candidate_id FK
        string status
        decimal score
        string notes
        datetime created_at
        datetime updated_at
    }

    CANDIDATE_MATCH {
        int id PK
        int company_id FK
        int job_offer_id FK
        int candidate_id FK
        decimal match_score
        string rationale
        datetime created_at
        datetime updated_at
    }

    CHAT_CONVERSATION {
        int id PK
        int company_id FK
        string type
        string title
        int created_by_user_id FK
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    CHAT_PARTICIPANT {
        int id PK
        int company_id FK
        int conversation_id FK
        int user_id FK
        datetime joined_at
        datetime created_at
        datetime updated_at
    }

    CHAT_MESSAGE {
        int id PK
        int company_id FK
        int conversation_id FK
        int sender_user_id FK
        string message_type
        string content
        string attachment_url
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    CHAT_MESSAGE_READ {
        int id PK
        int company_id FK
        int message_id FK
        int user_id FK
        datetime read_at
        datetime created_at
        datetime updated_at
    }

    CALL_SESSION {
        int id PK
        int company_id FK
        int conversation_id FK
        int initiated_by_user_id FK
        string call_type
        string status
        datetime started_at
        datetime ended_at
        datetime created_at
        datetime updated_at
    }

    CALL_PARTICIPANT {
        int id PK
        int company_id FK
        int call_session_id FK
        int user_id FK
        datetime joined_at
        datetime left_at
        datetime created_at
        datetime updated_at
    }

    COMPANY ||--o| COMPANY_SETTING : has
    COMPANY ||--o{ USER : scopes
    COMPANY o|--o{ ROLE : scopes
    ROLE ||--o{ ROLE_PERMISSION : grants
    PERMISSION ||--o{ ROLE_PERMISSION : defines
    USER ||--o{ USER_ROLE : receives
    ROLE ||--o{ USER_ROLE : assigns
    COMPANY o|--o{ USER_ROLE : contextualizes

    COMPANY ||--o{ PROJECT : owns
    PROJECT ||--o{ TEAM : contains
    USER o|--o{ TEAM : supervises
    TEAM ||--o{ TEAM_MEMBER : contains
    USER ||--o{ TEAM_MEMBER : joins
    PROJECT ||--o{ PROJECT_TASK : contains
    USER o|--o{ PROJECT_TASK : assigned_to
    PROJECT ||--o{ PROJECT_REPORT : logs
    USER ||--o{ PROJECT_REPORT : authors

    COMPANY ||--o{ STOCK_LOCATION : owns
    PROJECT o|--o{ STOCK_LOCATION : may_link_to
    COMPANY ||--o{ INVENTORY_ITEM : owns
    INVENTORY_ITEM ||--o{ STOCK_MOVEMENT : moves
    STOCK_LOCATION o|--o{ STOCK_MOVEMENT : from
    STOCK_LOCATION o|--o{ STOCK_MOVEMENT : to
    USER ||--o{ STOCK_MOVEMENT : performs
    PROJECT ||--o{ PROJECT_STOCK_ALLOCATION : receives
    INVENTORY_ITEM ||--o{ PROJECT_STOCK_ALLOCATION : allocates
    USER ||--o{ PROJECT_STOCK_ALLOCATION : allocates_by

    COMPANY ||--o{ JOB_OFFER : publishes
    USER ||--o{ JOB_OFFER : publishes_by
    USER o|--o{ CANDIDATE_PROFILE : owns
    JOB_OFFER ||--o{ JOB_APPLICATION : receives
    CANDIDATE_PROFILE ||--o{ JOB_APPLICATION : submits
    JOB_OFFER ||--o{ CANDIDATE_MATCH : scores
    CANDIDATE_PROFILE ||--o{ CANDIDATE_MATCH : matches

    COMPANY ||--o{ CHAT_CONVERSATION : owns
    USER ||--o{ CHAT_CONVERSATION : creates
    CHAT_CONVERSATION ||--o{ CHAT_PARTICIPANT : has
    USER ||--o{ CHAT_PARTICIPANT : participates
    CHAT_CONVERSATION ||--o{ CHAT_MESSAGE : contains
    USER ||--o{ CHAT_MESSAGE : sends
    CHAT_MESSAGE ||--o{ CHAT_MESSAGE_READ : read_state
    USER ||--o{ CHAT_MESSAGE_READ : reads
    CHAT_CONVERSATION o|--o{ CALL_SESSION : may_spawn
    USER ||--o{ CALL_SESSION : initiates
    CALL_SESSION ||--o{ CALL_PARTICIPANT : has
    USER ||--o{ CALL_PARTICIPANT : joins
```

---

## 4. Dictionnaire des entites

### 4.1 Entreprises et parametrage

### `companies`

Role :
table racine du tenant.

Champs cles :

- `legal_name` : raison sociale
- `trade_name` : nom commercial
- `registration_number` : identifiant legal unique
- `tax_number` : identifiant fiscal unique
- `onboarding_status` : `pending`, `approved`, `rejected`
- `is_active` : activation du compte entreprise

Relations :

- 1 entreprise -> 1 parametrage
- 1 entreprise -> N utilisateurs
- 1 entreprise -> N projets
- 1 entreprise -> N emplacements de stock
- 1 entreprise -> N offres d'emploi

### `company_settings`

Role :
parametrage fonctionnel de l'entreprise.

Champs cles :

- `currency`
- `timezone`
- `default_language`
- `date_format`

Contrainte :

- unicite sur `company_id`

### 4.2 Utilisateurs, roles et permissions

### `users`

Role :
compte applicatif d'un super admin, admin entreprise, employe, controleur externe ou candidat.

Champs cles :

- `company_id` nullable pour supporter le super admin global
- `user_type`
- `preferred_language`
- `is_active`
- `deleted_at`

Contraintes :

- unicite composite sur `(company_id, email)`
- `user_type` borne par check constraint

### `roles`

Role :
catalogue des roles globaux ou specifiques a une entreprise.

Champs cles :

- `company_id` nullable pour les roles plateforme
- `code`
- `is_system`

Contrainte :

- unicite composite sur `(company_id, code)`

### `permissions`

Role :
catalogue atomique des permissions applicatives.

Exemples :

- `companies.read`
- `companies.manage`
- `projects.read`
- `inventory.manage`
- `recruitment.manage`

### `role_permissions`

Role :
table de jonction role -> permission.

Contrainte :

- unicite composite sur `(role_id, permission_id)`

### `user_roles`

Role :
affectation d'un role a un utilisateur dans un contexte d'entreprise ou global.

Contrainte :

- unicite composite sur `(user_id, role_id, company_id)`

### 4.3 Projets et execution terrain

### `projects`

Role :
table principale de pilotage des chantiers ou projets.

Champs cles :

- `code`
- `name`
- `location`
- `client_name`
- `status`
- `budget_amount`

Contraintes :

- unicite composite sur `(company_id, code)`
- statut borne par check constraint

### `teams`

Role :
equipes rattachees a un projet.

Champs cles :

- `project_id`
- `name`
- `supervisor_user_id`

Contrainte :

- unicite composite sur `(company_id, project_id, name)`

### `team_members`

Role :
association utilisateur -> equipe.

Contrainte :

- unicite composite sur `(company_id, team_id, user_id)`

### `project_tasks`

Role :
taches operationnelles a suivre dans un projet.

Champs cles :

- `assigned_to_user_id`
- `priority`
- `status`
- `due_date`

### `project_reports`

Role :
rapports journaliers ou periodiques de chantier.

Champs cles :

- `report_date`
- `author_user_id`
- `summary`
- `blockers`

Contrainte :

- unicite composite sur `(company_id, project_id, report_date)`

### 4.4 Stocks et logistique

### `stock_locations`

Role :
emplacements physiques ou logiques de stockage.

Champs cles :

- `code`
- `name`
- `location_type`
- `project_id` nullable

Contrainte :

- unicite composite sur `(company_id, code)`

### `inventory_items`

Role :
catalogue des articles, materiaux ou fournitures.

Champs cles :

- `sku`
- `name`
- `unit`
- `category`
- `min_threshold`

Contrainte :

- unicite composite sur `(company_id, sku)`

### `stock_movements`

Role :
historique des flux de stock.

Champs cles :

- `movement_type`
- `quantity`
- `performed_by_user_id`
- `reference`

Regles :

- `quantity > 0`
- les emplacements source et destination sont optionnels selon le type de mouvement

### `project_stock_allocations`

Role :
quantites reservees ou allouees a un projet.

Champs cles :

- `project_id`
- `item_id`
- `quantity_allocated`
- `allocated_by_user_id`

Regle :

- `quantity_allocated > 0`

### 4.5 Recrutement

### `job_offers`

Role :
offres d'emploi publiees par les entreprises.

Champs cles :

- `title`
- `description`
- `contract_type`
- `location`
- `salary_min`
- `salary_max`
- `status`
- `published_by_user_id`

### `candidate_profiles`

Role :
base candidat centralisee, liee ou non a un compte applicatif.

Champs cles :

- `user_id` nullable
- `email` unique
- `years_experience`
- `desired_position`
- `cv_url`

### `job_applications`

Role :
candidatures deposees sur une offre.

Champs cles :

- `company_id`
- `job_offer_id`
- `candidate_id`
- `status`
- `score`
- `notes`

Contrainte :

- unicite sur `(job_offer_id, candidate_id)`

Statuts :

- `submitted`
- `screening`
- `interview`
- `shortlisted`
- `rejected`
- `hired`

### `candidate_matches`

Role :
scores de matching genere entre une offre et un candidat.

Champs cles :

- `job_offer_id`
- `candidate_id`
- `match_score`
- `rationale`

Contraintes :

- unicite sur `(company_id, job_offer_id, candidate_id)`
- `match_score` borne entre `0` et `100`

### 4.6 Chat et appels

### `chat_conversations`

Role :
conversations privees ou de groupe a l'interieur d'une entreprise.

Champs cles :

- `type`
- `title`
- `created_by_user_id`

### `chat_participants`

Role :
participants rattaches a une conversation.

Contrainte :

- unicite sur `(company_id, conversation_id, user_id)`

### `chat_messages`

Role :
messages echanges dans une conversation.

Champs cles :

- `sender_user_id`
- `message_type`
- `content`
- `attachment_url`

### `chat_message_reads`

Role :
etat de lecture des messages.

Contrainte :

- unicite sur `(company_id, message_id, user_id)`

### `call_sessions`

Role :
session d'appel audio ou video.

Champs cles :

- `conversation_id` nullable
- `initiated_by_user_id`
- `call_type`
- `status`
- `started_at`
- `ended_at`

### `call_participants`

Role :
participants a un appel.

Contrainte :

- unicite sur `(company_id, call_session_id, user_id)`

---

## 5. Regles de modelisation importantes

### 5.1 Isolation par tenant

- toutes les tables metier liees a l'entreprise portent `company_id`
- les tables globales de reference peuvent garder `company_id` nullable
- toute requete applicative devra filtrer par tenant

### 5.2 Suppression logique

Les entites suivantes supportent la suppression logique dans les modeles actuels :

- `users`
- `projects`
- `project_tasks`
- `stock_locations`
- `inventory_items`
- `chat_conversations`
- `chat_messages`
- `job_offers`
- `candidate_profiles`

### 5.3 Integrite metier

Contraintes critiques deja prevues :

- unicite du code projet par entreprise
- unicite des articles par entreprise
- unicite d'une candidature par offre et candidat
- unicite d'un participant par conversation
- unicite d'un participant par appel
- coherence des statuts via check constraints

### 5.4 Comptes globaux plateforme

Le schema supporte deja un super admin global grace a :

- `users.company_id` nullable
- `roles.company_id` nullable
- `user_roles.company_id` nullable

---

## 6. Extensions recommandees pour les phases suivantes

Ces entites ne sont pas encore presentes dans les modeles actuels, mais elles sont recommandees pour couvrir completement le cahier des charges.

### 6.1 Finance et abonnements

Tables proposees :

- `subscription_plans`
- `company_subscriptions`
- `payment_transactions`
- `invoices`
- `project_expenses`
- `project_revenues`

### 6.2 RH avancee

Tables proposees :

- `employee_contracts`
- `attendance_policies`
- `attendance_records`
- `payroll_leave_requests`
- `employee_payroll_profiles`
- `payroll_runs`
- `payroll_slips`

Lecture synchronisee avec le socle actuel :

- `attendance_policies` et `attendance_records` existent dans le code pour le pointage journalier et les regles de retard / heures supplementaires
- `payroll_leave_requests` porte les demandes RH et leurs workflows d'approbation
- `employee_payroll_profiles` porte le dossier paie individuel
- la relation `attendance <-> payroll` existe deja dans le socle : les conges approuves peuvent synchroniser des absences dans `attendance`

### 6.3 Marches publics

Tables proposees :

- `tender_notices`
- `tender_documents`
- `tender_submissions`
- `submission_checklists`

### 6.4 Equipements et maintenance

Tables proposees :

- `equipment_assets`
- `equipment_maintenance_logs`
- `equipment_assignments`

---

## 7. Priorite d'implementation recommandee

### Etape 1

- stabiliser le schema des tables coeur
- valider les cardinalites
- produire les migrations Alembic

### Etape 2

- deriver les routes API par module
- standardiser les payloads
- poser les politiques d'autorisation par ressource

### Etape 3

- concevoir les maquettes UI a partir des ressources de l'ERD
- definir les formulaires liste/detail
- organiser les tableaux de bord par role

---

## 8. Conclusion

Cet ERD constitue la base technique du MVP T-ERP.
Une fois valide, on pourra enchainer proprement avec le prochain livrable :

- les routes API Flask detaillees
- [Contrats API Stock + Finance](contrats-api-stock-finance.md)
