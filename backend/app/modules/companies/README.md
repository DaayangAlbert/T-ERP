# STEP 4 - Company Module

Implemented capabilities:

- Public company registration with pending onboarding status
- Automatic company admin user creation
- Super admin validation workflow (approve/reject)
- Tenant company profile and configuration endpoints

Main endpoints:

- `POST /api/v1/companies/register`
- `GET /api/v1/companies/pending`
- `PATCH /api/v1/companies/{company_id}/review`
- `GET /api/v1/companies/me`
- `GET /api/v1/companies/me/settings`
- `PUT /api/v1/companies/me/settings`

Security:

- Super admin-only review endpoints protected by role guard
- Tenant settings endpoints protected by JWT + permission checks
- Tenant context resolved from token/header consistency rules
