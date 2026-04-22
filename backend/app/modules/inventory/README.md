# STEP 7 - Stock Management Module

Implemented capabilities:

- stock location management
- inventory item catalog management
- stock movement recording with quantity validation
- stock level querying (global and per location)
- project stock allocation tracking

Endpoints:

- `GET /api/v1/inventory/locations`
- `POST /api/v1/inventory/locations`
- `GET /api/v1/inventory/items`
- `POST /api/v1/inventory/items`
- `GET /api/v1/inventory/items/{item_id}/stock`
- `GET /api/v1/inventory/movements`
- `POST /api/v1/inventory/movements`
- `GET /api/v1/inventory/allocations`
- `POST /api/v1/inventory/allocations`

Security:

- read endpoints require `inventory.read`
- write endpoints require `inventory.manage`
- tenant context is resolved from JWT/header and supports explicit super-admin company targeting
