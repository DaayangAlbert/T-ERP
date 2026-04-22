# STEP 5 - User Management Module

Implemented capabilities:

- Create company users
- List company users
- Create custom roles
- List effective roles (global + company)
- Assign roles to users
- Update preferred language (self and managed users)

Endpoints:

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/roles`
- `POST /api/v1/users/roles`
- `PUT /api/v1/users/{user_id}/roles`
- `PATCH /api/v1/users/me/language`
- `PATCH /api/v1/users/{user_id}/language`

Security:

- read operations require `users.read`
- management operations require `users.manage`
- tenant context is resolved from token/header and can be provided explicitly by super admin
