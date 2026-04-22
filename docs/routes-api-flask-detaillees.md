# T-ERP - Routes API Flask Detaillees

Note de lecture :
ce document decrit les routes API de facon descriptive. En cas d'ecart, l'arbitrage se fait avec les blueprints backend et la [Reference du socle actuel](reference-socle-actuel.md), consolidee au `2026-04-08`.

## 1. Objet

Ce document decrit les routes HTTP exposees par l'API Flask de **T-ERP** a partir des blueprints et services actuellement implementes dans le backend.

Il sert de reference pour :

- le frontend React
- les tests d'integration
- la normalisation future en OpenAPI

---

## 2. Conventions globales

### Base URL

- API metier : `/api/v1`
- Health check : `/health`

### Headers

- `Content-Type: application/json`
- `Authorization: Bearer <access_token>` pour les routes protegees
- `X-Tenant-ID: <company_id>` quand le contexte tenant doit etre explicite

### Multitenance

- les comptes d'entreprise portent en general leur `company_id` dans le JWT
- si `X-Tenant-ID` est envoye, il doit correspondre au tenant du token
- pour un super admin, le tenant peut etre resolu via `X-Tenant-ID`, ou parfois via `company_id` en query/body

### Pagination

Les endpoints pagines retournent :

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

### Erreurs

Formats observes :

```json
{ "message": "Invalid credentials" }
```

```json
{ "message": "Forbidden", "missing_permissions": ["projects.manage"] }
```

```json
{ "message": "Too many requests", "retry_after_seconds": 24 }
```

### Auth et droits

- permissions de module : `projects.read`, `inventory.manage`, etc.
- role global : `platform_super_admin`

Important :

- les routes `admin/*` sont protegees par `require_role()` meme sans decorateur `@jwt_required()`

---

## 3. Endpoints hors API v1

### `GET /health`

- Auth : aucune
- Role : verification applicative
- Reponse `200` :

```json
{ "status": "ok", "service": "T-ERP" }
```

---

## 4. Module Auth

Prefixe : `/api/v1/auth`

### `GET /api/v1/auth/status`

- Auth : aucune
- Reponse `200` : `{ "module": "auth", "status": "ready" }`

### `POST /api/v1/auth/login`

- Auth : aucune
- Rate limit : `12 / 60 s`
- Body :

```json
{
  "email": "admin@company.com",
  "password": "secret",
  "company_id": 4
}
```

- Champs requis : `email`, `password`
- `company_id` est optionnel mais peut devenir obligatoire si plusieurs comptes partagent le meme email
- Reponse `200` :

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "first_name": "Ada",
    "last_name": "Martin",
    "user_type": "company_admin",
    "company_id": 4,
    "preferred_language": "fr",
    "roles": ["company_admin_default"],
    "permissions": ["projects.read", "projects.manage"]
  }
}
```

- Erreurs : `400`, `401`, `403`

### `POST /api/v1/auth/refresh`

- Auth : refresh token requis
- Rate limit : `30 / 60 s`
- Reponse `200` :

```json
{ "access_token": "jwt", "token_type": "Bearer" }
```

### `GET /api/v1/auth/me`

- Auth : access token requis
- Reponse `200` :

```json
{
  "id": 1,
  "email": "admin@company.com",
  "first_name": "Ada",
  "last_name": "Martin",
  "user_type": "company_admin",
  "preferred_language": "fr",
  "company_id": 4,
  "roles": ["company_admin_default"],
  "permissions": ["projects.read", "projects.manage"]
}
```

### `POST /api/v1/auth/bootstrap-super-admin`

- Auth : aucune
- Disponibilite : developpement uniquement
- Rate limit : `3 / 300 s`
- Body requis : `email`, `password`, `first_name`, `last_name`
- Reponse `201` : meme structure que `POST /auth/login`

---

## 5. Module Companies

Prefixe : `/api/v1/companies`

### `POST /api/v1/companies/register`

- Auth : aucune
- Role : inscription publique d'une entreprise
- Body minimal :

```json
{
  "legal_name": "Taiga BTP",
  "registration_number": "RCCM-2026-001",
  "email": "contact@taigabtp.cm",
  "country_code": "CM",
  "admin_first_name": "Albert",
  "admin_last_name": "Daayan",
  "admin_email": "admin@taigabtp.cm",
  "admin_password": "secret"
}
```

- Champs requis :
  `legal_name`, `registration_number`, `email`, `country_code`,
  `admin_first_name`, `admin_last_name`, `admin_email`, `admin_password`
- Champs optionnels :
  `trade_name`, `tax_number`, `phone`, `city`, `address_line`,
  `currency`, `timezone`, `default_language`, `date_format`, `admin_phone`
- Reponse `201` :

```json
{
  "message": "Company registration submitted",
  "company": {
    "id": 4,
    "legal_name": "Taiga BTP",
    "registration_number": "RCCM-2026-001",
    "email": "contact@taigabtp.cm",
    "onboarding_status": "pending",
    "is_active": false,
    "admin_user_id": 21
  }
}
```

### `GET /api/v1/companies/status`

- Auth : JWT requis
- Permission : `companies.read`
- Reponse `200` : `{ "module": "companies", "status": "ready", "tenant_id": 4 }`

### `GET /api/v1/companies/pending`

- Auth : JWT requis
- Role : `platform_super_admin`
- Reponse `200` :

```json
{
  "items": [
    {
      "id": 4,
      "legal_name": "Taiga BTP",
      "registration_number": "RCCM-2026-001",
      "email": "contact@taigabtp.cm",
      "country_code": "CM",
      "created_at": "2026-03-27T20:10:00+00:00"
    }
  ],
  "count": 1
}
```

### `PATCH /api/v1/companies/{company_id}/review`

- Auth : JWT requis
- Role : `platform_super_admin`
- Body :

```json
{ "decision": "approved" }
```

- Valeurs admises : `approved`, `rejected`
- Reponse `200` :

```json
{
  "message": "Company review updated",
  "company": {
    "id": 4,
    "legal_name": "Taiga BTP",
    "onboarding_status": "approved",
    "is_active": true
  }
}
```

### `GET /api/v1/companies/me`

- Auth : JWT requis
- Permission : `companies.read`
- Reponse `200` :

```json
{
  "company": {
    "id": 4,
    "legal_name": "Taiga BTP",
    "trade_name": "Taiga",
    "registration_number": "RCCM-2026-001",
    "tax_number": "NIU-01",
    "email": "contact@taigabtp.cm",
    "phone": "+237...",
    "country_code": "CM",
    "city": "Douala",
    "address_line": "Akwa",
    "onboarding_status": "approved",
    "is_active": true
  },
  "settings": {
    "currency": "EUR",
    "timezone": "Europe/Paris",
    "default_language": "fr",
    "date_format": "DD/MM/YYYY"
  }
}
```

### `GET /api/v1/companies/me/settings`

- Auth : JWT requis
- Permission : `companies.read`
- Reponse `200` :

```json
{
  "currency": "EUR",
  "timezone": "Europe/Paris",
  "default_language": "fr",
  "date_format": "DD/MM/YYYY"
}
```

### `PUT /api/v1/companies/me/settings`

- Auth : JWT requis
- Permission : `companies.manage`
- Body possible :

```json
{
  "email": "contact@taigabtp.cm",
  "phone": "+237600000000",
  "city": "Douala",
  "address_line": "Akwa",
  "trade_name": "Taiga",
  "currency": "XAF",
  "timezone": "Africa/Douala",
  "default_language": "fr",
  "date_format": "DD/MM/YYYY"
}
```

- Reponse `200` :

```json
{
  "message": "Company settings updated",
  "data": {
    "company": {},
    "settings": {}
  }
}
```

---

## 6. Module Users

Prefixe : `/api/v1/users`

### `GET /api/v1/users/status`

- Auth : JWT requis
- Permission : `users.read`

### `GET /api/v1/users`

- Auth : JWT requis
- Permission : `users.read`
- Rate limit : `80 / 60 s`
- Query : `include_inactive`, `page`, `page_size`, `company_id` si super admin
- Reponse `200` : pagination standard d'utilisateurs

Objet utilisateur :

```json
{
  "id": 21,
  "email": "hr@taigabtp.cm",
  "first_name": "Mira",
  "last_name": "Ngono",
  "phone": "+237...",
  "user_type": "employee",
  "preferred_language": "fr",
  "is_active": true,
  "created_at": "2026-03-27T20:10:00+00:00"
}
```

### `POST /api/v1/users`

- Auth : JWT requis
- Permission : `users.manage`
- Rate limit : `40 / 60 s`
- Body minimal :

```json
{
  "email": "employee@taigabtp.cm",
  "password": "secret",
  "first_name": "Jean",
  "last_name": "Mbianda",
  "user_type": "employee"
}
```

- Champs requis : `email`, `password`, `first_name`, `last_name`, `user_type`
- `user_type` admis :
  `company_admin`, `employee`, `external_controller`, `job_seeker`
- Champs optionnels : `phone`, `preferred_language`, `is_active`, `company_id`
- Reponse `201` : `{ "message": "User created", "user": { ... } }`

### `GET /api/v1/users/roles`

- Auth : JWT requis
- Permission : `users.read`
- Query : `company_id` si super admin
- Reponse `200` :

```json
{
  "items": [
    {
      "id": 3,
      "name": "Company Admin",
      "code": "company_admin_default",
      "description": "Default company administrator role",
      "is_system": true,
      "company_id": 4,
      "permissions": ["projects.read", "projects.manage"]
    }
  ],
  "count": 1
}
```

### `POST /api/v1/users/roles`

- Auth : JWT requis
- Permission : `users.manage`
- Body :

```json
{
  "name": "Chef projet",
  "code": "chef_projet",
  "description": "Role operationnel",
  "permissions": ["projects.read", "projects.manage", "inventory.read"]
}
```

- Champs requis : `name`, `code`, `permissions`
- `permissions` doit etre une liste non vide
- Reponse `201` : `{ "message": "Role created", "role": { ... } }`

### `PUT /api/v1/users/{user_id}/roles`

- Auth : JWT requis
- Permission : `users.manage`
- Body :

```json
{
  "role_ids": [3, 9],
  "replace": true
}
```

- `role_ids` est requis et non vide
- Reponse `200` :

```json
{
  "message": "User roles updated",
  "data": {
    "user_id": 22,
    "company_id": 4,
    "roles": ["chef_projet", "company_admin_default"]
  }
}
```

### `PATCH /api/v1/users/me/language`

- Auth : JWT requis
- Body : `{ "preferred_language": "fr" }`
- Reponse `200` : `{ "message": "Language updated", "data": { "id": 22, "preferred_language": "fr" } }`

### `PATCH /api/v1/users/{user_id}/language`

- Auth : JWT requis
- Permission : `users.manage`
- Body : `{ "preferred_language": "en" }`

---

## 7. Module Projects

Prefixe : `/api/v1/projects`

### `GET /api/v1/projects/status`

- Auth : JWT requis
- Permission : `projects.read`

### `GET /api/v1/projects`

- Auth : JWT requis
- Permission : `projects.read`
- Rate limit : `90 / 60 s`
- Query : `status`, `include_archived`, `page`, `page_size`, `company_id`
- Reponse `200` : pagination standard de projets

Objet projet :

```json
{
  "id": 12,
  "company_id": 4,
  "code": "PRJ-001",
  "name": "Immeuble Akwa",
  "description": "Gros oeuvre",
  "location": "Douala",
  "client_name": "Mairie",
  "start_date": "2026-04-01",
  "end_date": "2026-11-30",
  "status": "planned",
  "budget_amount": 125000000.0
}
```

### `POST /api/v1/projects`

- Auth : JWT requis
- Permission : `projects.manage`
- Rate limit : `40 / 60 s`
- Body minimal :

```json
{
  "code": "PRJ-001",
  "name": "Immeuble Akwa"
}
```

- Champs optionnels :
  `description`, `location`, `client_name`, `start_date`, `end_date`, `status`, `budget_amount`
- Statuts admis :
  `planned`, `in_progress`, `on_hold`, `completed`, `cancelled`

### `GET /api/v1/projects/{project_id}`

- Auth : JWT requis
- Permission : `projects.read`

### `PATCH /api/v1/projects/{project_id}`

- Auth : JWT requis
- Permission : `projects.manage`
- Body : sous-ensemble des champs projet

### `DELETE /api/v1/projects/{project_id}`

- Auth : JWT requis
- Permission : `projects.manage`
- Role : archivage logique
- Reponse `200` : `{ "message": "Project archived" }`

### `GET /api/v1/projects/{project_id}/teams`

- Auth : JWT requis
- Permission : `projects.read`

Objet team :

```json
{
  "id": 5,
  "company_id": 4,
  "project_id": 12,
  "name": "Equipe Coffrage",
  "supervisor_user_id": 22
}
```

### `POST /api/v1/projects/{project_id}/teams`

- Auth : JWT requis
- Permission : `projects.manage`
- Body :

```json
{
  "name": "Equipe Coffrage",
  "supervisor_user_id": 22
}
```

### `POST /api/v1/projects/teams/{team_id}/members`

- Auth : JWT requis
- Permission : `projects.manage`
- Body :

```json
{
  "user_id": 25,
  "role_on_team": "Chef d'equipe"
}
```

- Reponse `201` : `{ "message": "Team member added", "member": { ... } }`

### `GET /api/v1/projects/{project_id}/tasks`

- Auth : JWT requis
- Permission : `projects.read`
- Query : `status`

Objet task :

```json
{
  "id": 31,
  "company_id": 4,
  "project_id": 12,
  "title": "Couler dalle RDC",
  "description": "Zone A",
  "assigned_to_user_id": 25,
  "due_date": "2026-04-12",
  "priority": "high",
  "status": "todo"
}
```

### `POST /api/v1/projects/{project_id}/tasks`

- Auth : JWT requis
- Permission : `projects.manage`
- Body minimal : `{ "title": "Couler dalle RDC" }`
- Optionnels :
  `description`, `assigned_to_user_id`, `due_date`, `priority`, `status`

### `PATCH /api/v1/projects/tasks/{task_id}`

- Auth : JWT requis
- Permission : `projects.manage`

### `GET /api/v1/projects/{project_id}/reports`

- Auth : JWT requis
- Permission : `projects.read`

Objet report :

```json
{
  "id": 17,
  "company_id": 4,
  "project_id": 12,
  "author_user_id": 22,
  "report_date": "2026-04-10",
  "weather": "ensoleille",
  "summary": "Avancement de 70%",
  "blockers": "Livraison ciment"
}
```

### `POST /api/v1/projects/{project_id}/reports`

- Auth : JWT requis
- Permission : `projects.manage`
- Body minimal :

```json
{
  "report_date": "2026-04-10",
  "summary": "Avancement de 70%"
}
```

---

## 8. Module Inventory

Prefixe : `/api/v1/inventory`

### `GET /api/v1/inventory/status`

- Auth : JWT requis
- Permission : `inventory.read`

### `GET /api/v1/inventory/locations`

- Auth : JWT requis
- Permission : `inventory.read`

Objet location :

```json
{
  "id": 3,
  "company_id": 4,
  "code": "MAG-CENTRAL",
  "name": "Magasin central",
  "location_type": "warehouse",
  "project_id": null
}
```

### `POST /api/v1/inventory/locations`

- Auth : JWT requis
- Permission : `inventory.manage`
- Body :

```json
{
  "code": "SITE-AKWA",
  "name": "Depot chantier Akwa",
  "location_type": "site",
  "project_id": 12
}
```

- `code` et `name` requis
- `location_type` dans `warehouse | site`
- `project_id` requis pour `site`

### `GET /api/v1/inventory/items`

- Auth : JWT requis
- Permission : `inventory.read`
- Rate limit : `100 / 60 s`
- Query : `page`, `page_size`

Objet item :

```json
{
  "id": 10,
  "company_id": 4,
  "sku": "CIMENT-42",
  "name": "Ciment 42.5",
  "unit": "sac",
  "category": "Ciment",
  "min_threshold": 100.0
}
```

### `POST /api/v1/inventory/items`

- Auth : JWT requis
- Permission : `inventory.manage`
- Rate limit : `40 / 60 s`
- Body :

```json
{
  "sku": "CIMENT-42",
  "name": "Ciment 42.5",
  "unit": "sac",
  "category": "Ciment",
  "min_threshold": 100
}
```

### `GET /api/v1/inventory/items/{item_id}/stock`

- Auth : JWT requis
- Permission : `inventory.read`
- Query : `location_id` optionnel
- Reponse :

```json
{
  "item_id": 10,
  "sku": "CIMENT-42",
  "name": "Ciment 42.5",
  "unit": "sac",
  "quantity": 250.0,
  "location_id": 3,
  "min_threshold": 100.0,
  "below_threshold": false
}
```

### `GET /api/v1/inventory/movements`

- Auth : JWT requis
- Permission : `inventory.read`
- Query : `item_id`

Objet movement :

```json
{
  "id": 101,
  "company_id": 4,
  "item_id": 10,
  "from_location_id": 3,
  "to_location_id": 5,
  "movement_type": "transfer",
  "quantity": 40.0,
  "performed_by_user_id": 22,
  "reference": "BL-001",
  "notes": "Transfert chantier",
  "created_at": "2026-03-27T20:10:00+00:00"
}
```

### `POST /api/v1/inventory/movements`

- Auth : JWT requis
- Permission : `inventory.manage`
- Body :

```json
{
  "item_id": 10,
  "movement_type": "transfer",
  "quantity": 40,
  "from_location_id": 3,
  "to_location_id": 5,
  "reference": "BL-001",
  "notes": "Transfert chantier"
}
```

- `movement_type` admis :
  `in`, `out`, `transfer`, `adjustment`, `allocation`
- Regles critiques :
  `quantity > 0`, controle des emplacements requis, controle du stock disponible

### `GET /api/v1/inventory/allocations`

- Auth : JWT requis
- Permission : `inventory.read`
- Query : `project_id`

### `POST /api/v1/inventory/allocations`

- Auth : JWT requis
- Permission : `inventory.manage`
- Body :

```json
{
  "item_id": 10,
  "project_id": 12,
  "from_location_id": 3,
  "to_location_id": 5,
  "quantity_allocated": 25,
  "reference": "ALLOC-001",
  "notes": "Affectation chantier Akwa"
}
```

- Champs requis : `item_id`, `project_id`, `from_location_id`, `quantity_allocated`

---

## 9. Module Recruitment

Prefixe : `/api/v1/recruitment`

### `GET /api/v1/recruitment/status`

- Auth : JWT requis
- Permission : `recruitment.read`

### `GET /api/v1/recruitment/job-offers`

- Auth : JWT requis
- Permission : `recruitment.read`
- Rate limit : `90 / 60 s`
- Query : `status`, `include_archived`, `page`, `page_size`

Objet offer :

```json
{
  "id": 7,
  "company_id": 4,
  "title": "Chef de chantier",
  "description": "Gestion de site",
  "contract_type": "CDI",
  "location": "Douala",
  "salary_min": 250000.0,
  "salary_max": 450000.0,
  "status": "published",
  "published_by_user_id": 22,
  "created_at": "2026-03-27T20:10:00+00:00"
}
```

### `POST /api/v1/recruitment/job-offers`

- Auth : JWT requis
- Permission : `recruitment.manage`
- Body minimal :

```json
{
  "title": "Chef de chantier",
  "description": "Gestion de site",
  "contract_type": "CDI"
}
```

- Optionnels : `location`, `salary_min`, `salary_max`, `status`
- `status` admis : `draft`, `published`, `closed`

### `PATCH /api/v1/recruitment/job-offers/{offer_id}`

- Auth : JWT requis
- Permission : `recruitment.manage`

### `GET /api/v1/recruitment/candidate-profiles`

- Auth : JWT requis
- Permission : `recruitment.read`
- Query : `search`

Objet candidate :

```json
{
  "id": 13,
  "user_id": 44,
  "email": "candidate@mail.com",
  "first_name": "Merveille",
  "last_name": "Simo",
  "phone": "+237...",
  "city": "Douala",
  "years_experience": 5,
  "desired_position": "Chef de chantier",
  "cv_url": "https://..."
}
```

### `POST /api/v1/recruitment/candidate-profiles`

- Auth : JWT requis
- Permission : `recruitment.manage`
- Champs requis : `email`, `first_name`, `last_name`
- Optionnels : `user_id`, `phone`, `city`, `years_experience`, `desired_position`, `cv_url`

### `PUT /api/v1/recruitment/candidate-profiles/me`

- Auth : JWT requis
- Permission supplementaire : aucune
- Role : creer ou mettre a jour le profil candidat de l'utilisateur courant

### `POST /api/v1/recruitment/job-offers/{offer_id}/apply`

- Auth : JWT requis
- Permission supplementaire : aucune
- Body possible :

```json
{
  "candidate_id": 13,
  "notes": "Disponible immediatement"
}
```

- Regles :
  l'offre doit etre `published`, une seule candidature par offre/candidat
- Reponse `201` : `{ "message": "Application submitted", "application": { ... } }`

### `GET /api/v1/recruitment/applications`

- Auth : JWT requis
- Permission : `recruitment.read`
- Rate limit : `90 / 60 s`
- Query : `job_offer_id`, `status`, `page`, `page_size`

### `PATCH /api/v1/recruitment/applications/{application_id}`

- Auth : JWT requis
- Permission : `recruitment.manage`
- Body :

```json
{
  "status": "interview",
  "notes": "Entretien lundi",
  "score": 85
}
```

- Statuts admis :
  `submitted`, `screening`, `interview`, `shortlisted`, `rejected`, `hired`

### `POST /api/v1/recruitment/job-offers/{offer_id}/matches/generate`

- Auth : JWT requis
- Permission : `recruitment.manage`
- Body ou query : `limit` optionnel, defaut `20`
- Reponse `200` : `{ "items": [ ... ], "count": 1 }`

### `GET /api/v1/recruitment/matches`

- Auth : JWT requis
- Permission : `recruitment.read`
- Rate limit : `90 / 60 s`
- Query : `offer_id`, `page`, `page_size`

---

## 10. Module Chat

Prefixe : `/api/v1/chat`

### `GET /api/v1/chat/status`

- Auth : JWT requis
- Permission : `chat.read`

### `GET /api/v1/chat/conversations`

- Auth : JWT requis
- Permission : `chat.read`
- Rate limit : `120 / 60 s`
- Query : `page`, `page_size`

Objet conversation :

```json
{
  "id": 3,
  "company_id": 4,
  "type": "private",
  "title": null,
  "created_by_user_id": 22,
  "unread_count": 2,
  "last_message": {
    "id": 18,
    "company_id": 4,
    "conversation_id": 3,
    "sender_user_id": 25,
    "message_type": "text",
    "content": "On se retrouve au chantier",
    "attachment_url": null,
    "created_at": "2026-03-27T20:10:00+00:00"
  },
  "is_participant": true
}
```

### `POST /api/v1/chat/conversations`

- Auth : JWT requis
- Permission : `chat.manage`
- Body :

```json
{
  "type": "group",
  "title": "Equipe Coffrage",
  "participant_ids": [25, 26, 27]
}
```

- `type` admis : `private`, `group`
- une conversation `private` impose exactement 2 participants au total
- si une conversation `private` equivalente existe deja, elle peut etre retournee au lieu d'etre recreee

### `GET /api/v1/chat/conversations/{conversation_id}/messages`

- Auth : JWT requis
- Permission : `chat.read`
- Query : `limit`, defaut `50`, max `200`

Objet message :

```json
{
  "id": 18,
  "company_id": 4,
  "conversation_id": 3,
  "sender_user_id": 25,
  "message_type": "text",
  "content": "On se retrouve au chantier",
  "attachment_url": null,
  "created_at": "2026-03-27T20:10:00+00:00"
}
```

### `POST /api/v1/chat/conversations/{conversation_id}/messages`

- Auth : JWT requis
- Permission : `chat.manage`
- Rate limit : `120 / 60 s`
- Body texte :

```json
{
  "message_type": "text",
  "content": "On se retrouve au chantier"
}
```

- Body fichier :

```json
{
  "message_type": "file",
  "attachment_url": "https://..."
}
```

- `message_type` admis : `text`, `image`, `file`, `system`
- `content` requis pour `text`
- `attachment_url` requis pour `image` et `file`

### `POST /api/v1/chat/conversations/{conversation_id}/read`

- Auth : JWT requis
- Permission : `chat.read`
- Body :

```json
{
  "until_message_id": 18
}
```

- Reponse `200` :

```json
{
  "message": "Messages marked as read",
  "data": {
    "conversation_id": 3,
    "marked_count": 6,
    "unread_count": 0
  }
}
```

### `GET /api/v1/chat/unread`

- Auth : JWT requis
- Permission : `chat.read`
- Reponse `200` :

```json
{
  "total_unread": 4,
  "items": [
    {
      "conversation_id": 3,
      "unread_count": 2
    }
  ]
}
```

---

## 11. Module Calls

Prefixe : `/api/v1/calls`

### `GET /api/v1/calls/status`

- Auth : JWT requis
- Permission : `calls.read`

### `GET /api/v1/calls`

- Auth : JWT requis
- Permission : `calls.read`
- Rate limit : `90 / 60 s`
- Query : `status`, `page`, `page_size`

Objet call :

```json
{
  "id": 12,
  "company_id": 4,
  "conversation_id": 3,
  "initiated_by_user_id": 22,
  "call_type": "audio",
  "status": "ringing",
  "started_at": null,
  "ended_at": null,
  "participants": [
    {
      "id": 41,
      "user_id": 22,
      "joined_at": "2026-03-27T20:10:00+00:00",
      "left_at": null
    }
  ]
}
```

### `POST /api/v1/calls`

- Auth : JWT requis
- Permission : `calls.manage`
- Rate limit : `40 / 60 s`
- Body :

```json
{
  "call_type": "video",
  "conversation_id": 3,
  "participant_ids": [25, 26]
}
```

- `call_type` admis : `audio`, `video`
- `participant_ids` doit etre une liste non vide
- tous les participants doivent appartenir a la conversation si `conversation_id` est fourni

### `GET /api/v1/calls/{call_session_id}`

- Auth : JWT requis
- Permission : `calls.read`

### `POST /api/v1/calls/{call_session_id}/join`

- Auth : JWT requis
- Permission : `calls.manage`

### `POST /api/v1/calls/{call_session_id}/leave`

- Auth : JWT requis
- Permission : `calls.manage`

### `POST /api/v1/calls/{call_session_id}/reject`

- Auth : JWT requis
- Permission : `calls.manage`

### `POST /api/v1/calls/{call_session_id}/end`

- Auth : JWT requis
- Permission : `calls.manage`
- Reponse standard pour les actions call :
  `{ "message": "...", "call": { ... } }`

---

## 12. Module Admin

Prefixe : `/api/v1/admin`

Toutes les routes admin :

- exigent un JWT valide
- exigent le role `platform_super_admin`

### `GET /api/v1/admin/stats`

- Role : statistiques globales plateforme
- Reponse `200` :

```json
{
  "companies": {
    "total": 12,
    "pending": 2,
    "approved": 9,
    "rejected": 1
  },
  "users": {
    "total": 143,
    "active": 131,
    "by_type": {
      "company_admin": 10,
      "employee": 96,
      "job_seeker": 30,
      "external_controller": 7
    }
  }
}
```

### `GET /api/v1/admin/companies`

- Role : liste globale des entreprises
- Reponse `200` : tableau d'entreprises avec
  `id`, `legal_name`, `registration_number`, `email`, `onboarding_status`, `is_active`, `created_at`

### `PATCH /api/v1/admin/companies/{company_id}/review`

- Body :

```json
{ "action": "approve" }
```

- Valeurs admises : `approve`, `reject`

### `GET /api/v1/admin/users`

- Query : `page`, `per_page` avec max `100`
- Reponse `200` :

```json
{
  "items": [
    {
      "id": 22,
      "email": "employee@taigabtp.cm",
      "first_name": "Jean",
      "last_name": "Mbianda",
      "user_type": "employee",
      "is_active": true,
      "company_id": 4,
      "preferred_language": "fr",
      "created_at": "2026-03-27T20:10:00+00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 143,
    "pages": 6
  }
}
```

---

## 13. Temps reel

Les modules `chat` et `calls` emettent aussi des evenements Socket.IO :

- `chat:message`
- `chat:notification`
- `chat:read`
- `call:incoming`
- `call:participant-joined`
- `call:participant-left`
- `call:rejected`
- `call:ended`

---

## 14. Normalisations recommandees

Pour la suite du projet, il serait utile d'uniformiser :

- `message` versus `error` pour les erreurs
- `count` versus `pagination` pour les listes
- `decision` versus `action` pour la validation entreprise
- les schemas de payload via Marshmallow ou Pydantic

---

## 15. Suite logique

Cette documentation permet maintenant d'enchainer avec :

- les maquettes UI par role
- ou une spec OpenAPI / Swagger

---

## 16. Addendum RH operationnel synchronise au 2026-04-09

Cet addendum arbitre la lecture RH par rapport au backend reel de l'etape 3.

### 16.1 Attendance

Endpoints reels exposes :

- `GET /api/v1/attendance/status`
- `GET /api/v1/attendance/support-data`
- `GET /api/v1/attendance/summary`
- `GET /api/v1/attendance`
- `POST /api/v1/attendance`
- `PATCH /api/v1/attendance/{record_id}`
- `GET /api/v1/attendance/policy`
- `PATCH /api/v1/attendance/policy`

Controles d'acces :

- lecture : `attendance.read`
- ecriture : `attendance.manage`

Lecture fonctionnelle :

- `attendance` porte le **realise terrain** : presence, retard, absence constatee, heures supplementaires, rattachement projet optionnel
- ce module ne remplace pas `payroll`, il lui est maintenant connecte

### 16.2 Payroll RH

Endpoints reels a lire ensemble :

- `GET /api/v1/payroll/me/summary`
- `GET /api/v1/payroll/me/leave-requests`
- `POST /api/v1/payroll/me/leave-requests`
- `POST /api/v1/payroll/me/leave-requests/upload-proof`
- `GET /api/v1/payroll/leave-requests`
- `GET /api/v1/payroll/leave-requests/{leave_request_id}/attachment`
- `PATCH /api/v1/payroll/leave-requests/{leave_request_id}`
- `GET /api/v1/payroll/employees/{user_id}/profile`
- `PATCH /api/v1/payroll/employees/{user_id}/profile`

Lecture fonctionnelle :

- `payroll` porte les demandes RH et le cycle de paie
- les demandes de conge approuvees peuvent synchroniser `attendance`
- le workflow d'approbation est maintenant multi-etapes selon le type et la duree

### 16.3 Users RH

Endpoints reels utilises par le cockpit RH :

- `GET /api/v1/users/dashboard`
- `GET /api/v1/users/activity-logs`
- `POST /api/v1/users/{user_id}/profile-assets/{asset_kind}`
- `GET /api/v1/users/{user_id}/profile-assets/{asset_kind}`

Lecture fonctionnelle :

- `users/dashboard` agrège maintenant personnel, projets, finances, stock, `attendance` et file RH
- `users/activity-logs` alimente le suivi recent du dossier collaborateur
- les `profile-assets` permettent le televersement et le telechargement admin/RH des pieces sensibles du dossier salarie

Clarification de parcours :

- les endpoints `users/me/profile` couvrent le **profil utilisateur** (compte courant)
- le **profil entreprise** reste porte par les endpoints du module `companies`
- pour un `company_admin`, l'interface doit presenter ces deux espaces comme des objets distincts

### 16.4 Frontiere officielle RH

Interpretation a retenir :

- `users` = noyau personnel + cockpit RH + dossier sensible
- `attendance` = verite du realise terrain
- `payroll` = demandes RH + calcul paie + self-service paie
- `planning` = agenda et planification, sans reprendre la source de verite presence
