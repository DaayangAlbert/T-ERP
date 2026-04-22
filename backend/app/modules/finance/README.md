# STEP 11 - Finance Module

Implemented capabilities:

- expense and revenue tracking
- invoicing workflow
- payment recording per invoice
- financial summary by company and optional project

Endpoints:

- `GET /api/v1/finance/status`
- `GET /api/v1/finance/summary`
- `GET /api/v1/finance/entries`
- `POST /api/v1/finance/entries`
- `GET /api/v1/finance/invoices`
- `POST /api/v1/finance/invoices`
- `GET /api/v1/finance/payments`
- `POST /api/v1/finance/invoices/{invoice_id}/payments`
