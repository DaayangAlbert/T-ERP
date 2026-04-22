# STEP 13 - Security and Optimization

This folder now includes cross-cutting production hardening utilities:

- `security.py`
  - lightweight per-route in-memory rate limiting
  - request context headers (`X-Request-ID`, `X-Response-Time-Ms`)
  - secure response headers (`CSP`, `X-Frame-Options`, `nosniff`, `no-store`)

- `pagination.py`
  - validated page/page_size parsing
  - consistent paginated response shape with metadata

Applied in API modules:

- auth, users, projects, inventory, chat, calls, recruitment
