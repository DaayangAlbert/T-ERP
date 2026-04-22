# T-ERP - Contrats API Stock et Finance

Documents lies :

- [Module Gestion de Stock](module-gestion-stock-btp.md)
- [Module Gestion Comptable et Financiere](module-gestion-comptable-financiere.md)
- [ERD cible Stock + Finance](erd-stock-finance.md)
- [ERD base de donnees actuel](erd-base-de-donnees.md)

## 1. Objet

Ce document definit les **contrats d'API REST** recommandes pour les modules :

- stock
- comptabilite et finance

Il s'aligne sur les conventions deja observees dans le backend Flask :

- prefixe `/api/v1`
- Blueprints par module
- JWT obligatoire sur les routes metier
- resolution du tenant via token ou `X-Tenant-ID`
- controle d'acces par permissions

## 2. Conventions transverses

### 2.1 Base URL

Base path :

- `/api/v1`

Modules cibles :

- `/api/v1/inventory`
- `/api/v1/finance`

### 2.2 Authentification

Toutes les routes metier sont protegees par JWT, sauf eventuels points publics futurs.

Header attendu :

```http
Authorization: Bearer <jwt>
```

### 2.3 Resolution du tenant

Le tenant est resolu :

- depuis `company_id` du token
- ou via `X-Tenant-ID`
- ou via `company_id` explicite pour le super admin

Header attendu lorsqu'il est pertinent :

```http
X-Tenant-ID: 12
```

### 2.4 Pagination

Pour les listes volumineuses, les endpoints doivent reutiliser le format deja present dans `backend/app/core/pagination.py`.

Parametres supportes :

- `page`
- `page_size`

Reponse standard :

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

Pour les petites listes de reference, un format simple reste acceptable :

```json
{
  "items": [],
  "count": 0
}
```

### 2.5 Format d'erreur

Format minimal recommande, compatible avec l'existant :

```json
{
  "message": "Human readable error"
}
```

Format enrichi recommande pour les nouveaux modules :

```json
{
  "message": "Validation failed",
  "code": "validation_error",
  "details": {
    "field": "amount"
  }
}
```

### 2.6 Decimaux et dates

Conventions recommandees :

- montants et quantites en decimal cote base
- serialisation JSON en nombre
- dates simples au format `YYYY-MM-DD`
- datetimes au format ISO 8601

## 3. Permissions cibles

### 3.1 Stock

Permissions minimales :

- `inventory.read`
- `inventory.manage`

Permissions recommandees pour l'extension :

- `inventory.approve`
- `inventory.audit`

### 3.2 Finance

Permissions minimales recommandees :

- `finance.read`
- `finance.manage`

Permissions avancees recommandees :

- `finance.approve`
- `finance.close`
- `finance.audit`

## 4. Contrats API - Stock

## 4.1 Compatibilite avec l'existant

Les endpoints deja presents dans le backend doivent etre conserves :

- `GET /inventory/status`
- `GET /inventory/locations`
- `POST /inventory/locations`
- `GET /inventory/items`
- `POST /inventory/items`
- `GET /inventory/items/{item_id}/stock`
- `GET /inventory/movements`
- `POST /inventory/movements`
- `GET /inventory/allocations`
- `POST /inventory/allocations`

Les contrats ci-dessous les completent pour couvrir le cahier des charges etendu.

## 4.2 Ressources principales

### Emplacements

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/locations` | `inventory.read` | Lister les emplacements |
| POST | `/inventory/locations` | `inventory.manage` | Creer un emplacement |
| GET | `/inventory/locations/{location_id}` | `inventory.read` | Consulter un emplacement |
| PATCH | `/inventory/locations/{location_id}` | `inventory.manage` | Modifier un emplacement |

### Articles

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/items` | `inventory.read` | Lister les articles |
| POST | `/inventory/items` | `inventory.manage` | Creer un article |
| GET | `/inventory/items/{item_id}` | `inventory.read` | Detail d'un article |
| PATCH | `/inventory/items/{item_id}` | `inventory.manage` | Modifier un article |
| GET | `/inventory/items/{item_id}/stock` | `inventory.read` | Consulter le stock global ou par emplacement |

### Documents de stock

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/documents` | `inventory.read` | Lister les documents de stock |
| POST | `/inventory/documents` | `inventory.manage` | Creer une entree, sortie, transfert ou ajustement |
| GET | `/inventory/documents/{document_id}` | `inventory.read` | Detail d'un document |
| PATCH | `/inventory/documents/{document_id}` | `inventory.manage` | Modifier un document brouillon |
| POST | `/inventory/documents/{document_id}/validate` | `inventory.approve` ou `inventory.manage` | Valider un document |
| POST | `/inventory/documents/{document_id}/cancel` | `inventory.approve` ou `inventory.manage` | Annuler un document |

### Mouvements, reservations et allocations

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/movements` | `inventory.read` | Historique des mouvements |
| POST | `/inventory/movements` | `inventory.manage` | Mouvement direct compatible MVP |
| GET | `/inventory/reservations` | `inventory.read` | Lister les reservations |
| POST | `/inventory/reservations` | `inventory.manage` | Reserver du stock pour un projet |
| GET | `/inventory/allocations` | `inventory.read` | Lister les allocations |
| POST | `/inventory/allocations` | `inventory.manage` | Allouer du stock a un projet |

### Inventaires

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/count-sessions` | `inventory.read` | Lister les campagnes d'inventaire |
| POST | `/inventory/count-sessions` | `inventory.manage` | Ouvrir une campagne d'inventaire |
| GET | `/inventory/count-sessions/{session_id}` | `inventory.read` | Detail d'une campagne |
| POST | `/inventory/count-sessions/{session_id}/lines` | `inventory.manage` | Saisir ou mettre a jour des comptages |
| POST | `/inventory/count-sessions/{session_id}/close` | `inventory.manage` | Clore la saisie |
| POST | `/inventory/count-sessions/{session_id}/approve` | `inventory.approve` | Valider les ecarts et generer les ajustements |

### Alertes et reporting

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/inventory/alerts` | `inventory.read` | Alertes de rupture, stock faible, surstock |
| GET | `/inventory/reports/stock-summary` | `inventory.read` | Etat global du stock |
| GET | `/inventory/reports/consumption-by-project` | `inventory.read` | Consommation par projet |
| GET | `/inventory/reports/inventory-valuation` | `inventory.read` | Valorisation du stock |
| GET | `/inventory/reports/movement-history` | `inventory.read` | Historique detaille des mouvements |

## 4.3 Payloads cibles - Stock

### POST `/inventory/documents`

Usage :
creation d'une entree, sortie, transfert ou ajustement.

Payload :

```json
{
  "document_type": "receipt",
  "document_date": "2026-03-27",
  "source_location_id": null,
  "destination_location_id": 3,
  "project_id": 14,
  "partner_id": 8,
  "reference": "RECEP-2026-0004",
  "external_reference": "BL-FOUR-9981",
  "reason_code": "supplier_purchase",
  "notes": "Approvisionnement chantier Akwa",
  "lines": [
    {
      "item_id": 11,
      "quantity": 250,
      "unit_cost": 6.5
    },
    {
      "item_id": 12,
      "quantity": 40,
      "unit_cost": 32
    }
  ]
}
```

Reponse :

```json
{
  "message": "Stock document created",
  "document": {
    "id": 57,
    "document_type": "receipt",
    "status": "draft",
    "reference": "RECEP-2026-0004"
  }
}
```

### POST `/inventory/documents/{document_id}/validate`

Payload :

```json
{
  "notes": "Validation magasin central"
}
```

Effet attendu :

- passage du statut a `validated`
- generation des `stock_movements`
- mise a jour des quantites disponibles

### POST `/inventory/reservations`

Payload :

```json
{
  "project_id": 14,
  "item_id": 11,
  "location_id": 3,
  "quantity_reserved": 120,
  "expires_at": "2026-04-03T18:00:00Z",
  "notes": "Reserve pour dalle zone B"
}
```

### POST `/inventory/count-sessions`

Payload :

```json
{
  "location_id": 3,
  "scope_type": "full_location",
  "planned_at": "2026-03-30",
  "notes": "Inventaire mensuel depot principal"
}
```

### GET `/inventory/items/{item_id}/stock`

Query params supportes :

- `location_id`

Reponse cible :

```json
{
  "item_id": 11,
  "sku": "CIMENT-42",
  "name": "Ciment 42.5",
  "unit": "sac",
  "quantity": 560,
  "reserved_quantity": 120,
  "available_quantity": 440,
  "location_id": 3,
  "min_threshold": 100,
  "max_threshold": 900,
  "below_threshold": false
}
```

## 5. Contrats API - Finance

## 5.1 Blueprint cible

Module backend recommande :

- `backend/app/modules/finance/`

Blueprint recommande :

- `finance_bp = Blueprint("finance", __name__, url_prefix="/finance")`

## 5.2 Ressources principales

### Referentiels comptables

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/accounts` | `finance.read` | Lister le plan comptable |
| POST | `/finance/accounts` | `finance.manage` | Creer un compte comptable |
| PATCH | `/finance/accounts/{account_id}` | `finance.manage` | Modifier un compte |
| GET | `/finance/journals` | `finance.read` | Lister les journaux |
| POST | `/finance/journals` | `finance.manage` | Creer un journal |
| GET | `/finance/periods` | `finance.read` | Lister les periodes |
| POST | `/finance/periods` | `finance.manage` | Ouvrir une periode |
| POST | `/finance/periods/{period_id}/close` | `finance.close` | Clore une periode |

### Tiers et tresorerie

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/partners` | `finance.read` | Lister clients et fournisseurs |
| POST | `/finance/partners` | `finance.manage` | Creer un tiers |
| PATCH | `/finance/partners/{partner_id}` | `finance.manage` | Modifier un tiers |
| GET | `/finance/treasury-accounts` | `finance.read` | Lister les comptes de tresorerie |
| POST | `/finance/treasury-accounts` | `finance.manage` | Creer caisse, banque ou mobile money |
| GET | `/finance/treasury-movements` | `finance.read` | Consulter les flux de tresorerie |

### Budgets projet

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/budgets` | `finance.read` | Lister les budgets projet |
| POST | `/finance/budgets` | `finance.manage` | Creer un budget |
| GET | `/finance/budgets/{budget_id}` | `finance.read` | Detail d'un budget |
| PATCH | `/finance/budgets/{budget_id}` | `finance.manage` | Modifier un budget brouillon |
| POST | `/finance/budgets/{budget_id}/approve` | `finance.approve` | Valider un budget |

### Depenses et recettes

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/expenses` | `finance.read` | Lister les depenses |
| POST | `/finance/expenses` | `finance.manage` | Enregistrer une depense |
| GET | `/finance/expenses/{expense_id}` | `finance.read` | Detail d'une depense |
| PATCH | `/finance/expenses/{expense_id}` | `finance.manage` | Modifier une depense brouillon |
| POST | `/finance/expenses/{expense_id}/approve` | `finance.approve` | Approuver une depense |
| POST | `/finance/expenses/{expense_id}/pay` | `finance.manage` ou `finance.approve` | Enregistrer le paiement |
| GET | `/finance/revenues` | `finance.read` | Lister les recettes |
| POST | `/finance/revenues` | `finance.manage` | Enregistrer une recette |
| GET | `/finance/revenues/{revenue_id}` | `finance.read` | Detail d'une recette |

### Facturation et paiements

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/invoices` | `finance.read` | Lister les factures |
| POST | `/finance/invoices` | `finance.manage` | Creer une facture |
| GET | `/finance/invoices/{invoice_id}` | `finance.read` | Detail d'une facture |
| PATCH | `/finance/invoices/{invoice_id}` | `finance.manage` | Modifier une facture brouillon |
| POST | `/finance/invoices/{invoice_id}/send` | `finance.manage` | Marquer une facture envoyee |
| POST | `/finance/invoices/{invoice_id}/record-payment` | `finance.manage` | Imputer un paiement sur facture |
| GET | `/finance/payments` | `finance.read` | Lister les paiements |
| POST | `/finance/payments` | `finance.manage` | Enregistrer un paiement |
| GET | `/finance/payments/{payment_id}` | `finance.read` | Detail d'un paiement |

### Comptabilite generale

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/journal-entries` | `finance.read` | Lister les ecritures |
| POST | `/finance/journal-entries` | `finance.manage` | Saisir une ecriture diverse |
| GET | `/finance/journal-entries/{entry_id}` | `finance.read` | Detail d'une ecriture |
| POST | `/finance/journal-entries/{entry_id}/post` | `finance.approve` | Poster l'ecriture |

### Reporting

| Methode | Route | Permission | Objet |
| --- | --- | --- | --- |
| GET | `/finance/reports/dashboard` | `finance.read` | Tableau de bord financier |
| GET | `/finance/reports/project-profitability` | `finance.read` | Rentabilite par projet |
| GET | `/finance/reports/cash-flow` | `finance.read` | Flux de tresorerie |
| GET | `/finance/reports/income-statement` | `finance.read` | Compte de resultat |
| GET | `/finance/reports/balance-sheet` | `finance.read` | Bilan |
| GET | `/finance/reports/overdue-invoices` | `finance.read` | Factures en retard |

## 5.3 Payloads cibles - Finance

### POST `/finance/expenses`

Payload :

```json
{
  "expense_date": "2026-03-27",
  "category": "materials",
  "amount": 250000,
  "currency": "XAF",
  "partner_id": 8,
  "project_id": 14,
  "treasury_account_id": 2,
  "payment_method": "bank_transfer",
  "description": "Achat ciment et fer",
  "document_reference": "FAC-FOUR-2026-119",
  "attachment_urls": [
    "/uploads/finance/fac-four-2026-119.pdf"
  ]
}
```

Reponse :

```json
{
  "message": "Expense recorded",
  "expense": {
    "id": 91,
    "expense_number": "EXP-2026-0091",
    "approval_status": "draft",
    "payment_status": "unpaid",
    "amount": 250000
  }
}
```

### POST `/finance/invoices`

Payload :

```json
{
  "project_id": 14,
  "customer_id": 21,
  "issue_date": "2026-03-27",
  "due_date": "2026-04-10",
  "currency": "XAF",
  "notes": "Facture situation de travaux lot gros oeuvre",
  "lines": [
    {
      "description": "Travaux gros oeuvre - situation 3",
      "quantity": 1,
      "unit_price": 7500000,
      "revenue_account_id": 41
    }
  ]
}
```

Reponse :

```json
{
  "message": "Invoice created",
  "invoice": {
    "id": 44,
    "invoice_number": "FAC-2026-0044",
    "status": "draft",
    "total_amount": 7500000,
    "paid_amount": 0
  }
}
```

### POST `/finance/invoices/{invoice_id}/record-payment`

Payload :

```json
{
  "payment_date": "2026-03-29",
  "amount": 3000000,
  "currency": "XAF",
  "payment_method": "mobile_money",
  "treasury_account_id": 5,
  "external_reference": "MOMO-TRX-998122"
}
```

Effets attendus :

- creation d'un `payment`
- creation d'un `treasury_movement`
- mise a jour du `paid_amount`
- recalcul du statut `partial` ou `paid`

### POST `/finance/journal-entries`

Payload :

```json
{
  "period_id": 3,
  "journal_id": 4,
  "entry_date": "2026-03-27",
  "reference": "OD-2026-0031",
  "source_module": "finance",
  "source_type": "manual_adjustment",
  "lines": [
    {
      "account_id": 101,
      "line_label": "Charge exceptionnelle",
      "debit_amount": 150000,
      "credit_amount": 0
    },
    {
      "account_id": 512,
      "line_label": "Banque",
      "debit_amount": 0,
      "credit_amount": 150000
    }
  ]
}
```

Regle forte :

- somme des debits = somme des credits

## 6. Filtres et parametres de requete recommandes

### 6.1 Stock

Filtres typiques :

- `location_id`
- `project_id`
- `item_id`
- `movement_type`
- `document_type`
- `status`
- `date_from`
- `date_to`

### 6.2 Finance

Filtres typiques :

- `project_id`
- `partner_id`
- `status`
- `approval_status`
- `payment_status`
- `period_id`
- `journal_id`
- `account_id`
- `date_from`
- `date_to`

## 7. Reponses de reporting recommandees

### 7.1 GET `/finance/reports/dashboard`

Exemple :

```json
{
  "currency": "XAF",
  "period": {
    "date_from": "2026-03-01",
    "date_to": "2026-03-31"
  },
  "kpis": {
    "revenue": 12500000,
    "expenses": 9100000,
    "profit": 3400000,
    "cash_balance": 2800000,
    "overdue_receivables": 1500000
  }
}
```

### 7.2 GET `/inventory/reports/consumption-by-project`

Exemple :

```json
{
  "items": [
    {
      "project_id": 14,
      "project_name": "Chantier Akwa",
      "consumed_value": 1250000,
      "top_items": [
        {
          "item_id": 11,
          "item_name": "Ciment 42.5",
          "quantity": 250,
          "value": 162500
        }
      ]
    }
  ],
  "count": 1
}
```

## 8. Sequencement d'implementation recommande

### 8.1 Lot 1 - Stock compatible MVP

- conserver les endpoints actuels `inventory`
- ajouter `documents`, `count-sessions`, `alerts`, `reports`
- faire transiter les nouveaux flux par `stock_documents`

### 8.2 Lot 2 - Finance operationnelle

- creer le module `finance`
- livrer `partners`, `treasury-accounts`, `budgets`, `expenses`, `invoices`, `payments`
- brancher les rapports financiers de base

### 8.3 Lot 3 - Comptabilite generale

- ajouter `journal-entries`
- gerer les clotures de periode
- automatiser les ecritures depuis les pieces metier

## 9. Conclusion

Ces contrats donnent une base directement exploitable pour :

- creer les Blueprints Flask
- definir les schemas de validation
- implementer les services metier
- construire les ecrans React et leurs appels API

L'etape suivante la plus productive est d'implementer les modeles SQLAlchemy et les migrations pour le lot 1 stock puis le lot 2 finance.
