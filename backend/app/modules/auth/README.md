# STEP 3 - Authentication and Authorization

Implemented in this module:

- JWT login (`POST /api/v1/auth/login`)
- JWT refresh (`POST /api/v1/auth/refresh`)
- Current user profile (`GET /api/v1/auth/me`)
- Development bootstrap for first platform admin (`POST /api/v1/auth/bootstrap-super-admin`)

Authorization:

- Permission middleware in `app/core/rbac.py`
- Tenant consistency validation in `app/core/multitenancy.py`
- Protected sample endpoints in companies and users modules

Token claims include:

- `company_id`
- `user_type`
- `preferred_language`
- `roles`
- `permissions`
