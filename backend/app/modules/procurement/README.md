# STEP 12 - Public Procurement Module

Implemented capabilities:

- public tender watch and registration
- DAO tracking through URLs and notes
- compliance checklist management
- submission lifecycle and won/lost archive

Endpoints:

- `GET /api/v1/procurement/status`
- `GET /api/v1/procurement/summary`
- `GET /api/v1/procurement/tenders`
- `POST /api/v1/procurement/tenders`
- `PATCH /api/v1/procurement/tenders/{tender_id}`
- `GET /api/v1/procurement/tenders/{tender_id}/checklist`
- `POST /api/v1/procurement/tenders/{tender_id}/checklist`
- `GET /api/v1/procurement/submissions`
- `POST /api/v1/procurement/tenders/{tender_id}/submissions`
- `PATCH /api/v1/procurement/submissions/{submission_id}`
