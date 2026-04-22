# T-ERP (Taiga ERP)

T-ERP is currently a structured MVP foundation for a multi-tenant ERP focused on construction businesses.
At this stage, the repository is not yet production-ready: the core modules exist, the architecture is in place, Sprint 1 hardened the repo and auth flow, and Sprint 2 is now introducing database migrations, repeatable seeding, and backend cleanup for the V1 modules.

## Developer Onboarding

If you are joining the project as a contributor, start with these files:

- [docs/developer-onboarding.md](docs/developer-onboarding.md): quickest path from clone to local run
- [CONTRIBUTING.md](CONTRIBUTING.md): branch, PR, testing, and review expectations
- [.github/workflows/ci.yml](.github/workflows/ci.yml): backend and frontend checks enforced in CI

Fast contributor checklist:

1. Create `backend/.env` from `backend/.env.example`.
2. Create `frontend/.env.local` from `frontend/.env.example` only if you need to override the default local proxy.
3. Install backend dev dependencies with `python -m pip install -r backend/requirements-dev.txt`.
4. Install frontend dependencies with `npm ci` inside `frontend/`.
5. Apply migrations with `python backend/bootstrap_schema.py`.
6. Run the backend with `python backend/run.py`.
7. Run the frontend with `npm run dev` inside `frontend/`.

## Architecture Overview

- Backend: Flask API using modular Blueprints (domain-driven modules).
- Frontend: React (Vite) with feature-based folders and centralized routing.
- Realtime: Flask-SocketIO backend and Socket.IO frontend client.
- I18n: French default with English support, no UI hardcoded outside translation files.

## Product Documentation

- Functional specification by user profile: [docs/cahier-des-charges-fonctionnel.md](docs/cahier-des-charges-fonctionnel.md)
- Database ERD: [docs/erd-base-de-donnees.md](docs/erd-base-de-donnees.md)
- Detailed Flask API routes: [docs/routes-api-flask-detaillees.md](docs/routes-api-flask-detaillees.md)
- Detailed personnel module specification: [docs/module-personnel-entreprise.md](docs/module-personnel-entreprise.md)
- Target ERD for stock and finance modules: [docs/erd-stock-finance.md](docs/erd-stock-finance.md)
- Detailed stock specification: [docs/module-gestion-stock-btp.md](docs/module-gestion-stock-btp.md)
- Detailed accounting and financial specification: [docs/module-gestion-comptable-financiere.md](docs/module-gestion-comptable-financiere.md)
- API contracts for stock and finance modules: [docs/contrats-api-stock-finance.md](docs/contrats-api-stock-finance.md)
- Target specification for company admin profile: [docs/spec-profil-admin-entreprise.md](docs/spec-profil-admin-entreprise.md)
- Incremental implementation plan for company admin profile: [docs/plan-implementation-profil-admin-entreprise.md](docs/plan-implementation-profil-admin-entreprise.md)
- Incremental workspace refactor blueprint for projects module: [docs/blueprint-refonte-module-projets-workspace.md](docs/blueprint-refonte-module-projets-workspace.md)
- Sprint 1 smoke test checklist and command: [docs/smoke-test-sprint-1.md](docs/smoke-test-sprint-1.md)
- This `README.md` remains focused on technical architecture and implementation structure.

## Current Product Status

- Current state: structured MVP / pre-V1
- Backend status: modular Flask API with working business modules and bootstrap scripts
- Frontend status: Vite + React shell with V1-focused navigation and feature pages
- Security status: improved in Sprint 1, but still not at full production hardening
- Database status: initial Alembic migration is now present and the bootstrap path upgrades to the latest migration

## Current V1 Scope

The default frontend shell and current V1 scope focus on:

- `companies`
- `users`
- `projects`
- `finance`
- `inventory`
- `admin`

The following modules remain in the codebase but are intentionally out of the default V1 navigation and smoke scope:

- `procurement`
- `chat`
- `calls`
- `recruitment`

## Monorepo Structure

```text
T-ERP/
  backend/
    app/
      api/
      core/
      modules/
        auth/
        companies/
        users/
        projects/
        finance/
        inventory/
        procurement/
        chat/
        calls/
        recruitment/
      realtime/
      config.py
      extensions.py
      __init__.py
    requirements.txt
    run.py
  frontend/
    src/
      app/
        i18n/
      components/
      features/
      shared/
      App.jsx
      main.jsx
    package.json
    vite.config.js
```

## Module Separation Strategy

- `modules/auth`: authentication and token lifecycle.
- `modules/companies`: tenant onboarding and company settings.
- `modules/users`: user lifecycle and role assignment.
- `modules/projects`: sites, teams, tasks, reports.
- `modules/finance`: expenses, revenues, invoices, and payments.
- `modules/inventory`: stock catalog and movement logs.
- `modules/procurement`: tender watch, checklists, and submissions.
- `modules/chat`: direct/group messaging and message state.
- `modules/calls`: WebRTC signaling and call sessions.
- `modules/recruitment`: offers, candidates, and applications.

## Local Bootstrap

- Backend environment: create `backend/.env` from `backend/.env.example` and set at least `DATABASE_URL` and `JWT_SECRET_KEY`.
- Frontend environment: create `frontend/.env` from `frontend/.env.example` when you need to override the default Vite proxy or enabled modules.
- Create or activate a Python virtual environment, then install backend dependencies from `backend/requirements.txt`.
- Install backend test dependencies when you want to run the automated suite: `python -m pip install -r backend/requirements-dev.txt`
- Install frontend dependencies from `frontend/package.json` with `npm install` inside `frontend/`.
- Run the backend with `python backend/run.py`.
- Run the frontend with `npm run dev` inside `frontend/`.
- Apply the latest database migration: `python backend/bootstrap_schema.py`
- Seed the platform permissions and roles catalog: `python backend/seed_default_profiles.py`
- Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` before seeding a platform admin, then run: `python backend/seed_super_admin.py`
- Or run the combined platform seed flow: `python backend/scripts/seed_platform.py`
- Seed a reusable local demo company: `python backend/scripts/seed_demo_company.py`
- Run the Sprint 1 backend smoke scenario on a temporary SQLite database: `python backend/scripts/smoke_test_sprint_1.py`
- Run the backend pytest suite: `python -m pytest backend/tests`
- Run the frontend UI critical-flow suite: `npm run test` inside `frontend/`

## Environment Variables

### Backend

- `FLASK_ENV`: Flask environment name. Default expected value in local development is `development`.
- `DATABASE_URL`: PostgreSQL connection string used by the Flask app.
- `JWT_SECRET_KEY`: secret used to sign access and refresh tokens.
- `CORS_ALLOWED_ORIGINS`: comma-separated HTTP origins allowed to call the API from a browser.
- `SOCKETIO_CORS_ALLOWED_ORIGINS`: comma-separated origins allowed to open Socket.IO connections.
- `SUPER_ADMIN_EMAIL`: seed value required by `backend/seed_super_admin.py`.
- `SUPER_ADMIN_PASSWORD`: seed value required by `backend/seed_super_admin.py`.
- `SUPER_ADMIN_FIRST_NAME`: optional seed value used by `backend/seed_super_admin.py`.
- `SUPER_ADMIN_LAST_NAME`: optional seed value used by `backend/seed_super_admin.py`.
- `SUPER_ADMIN_LANG`: optional seed value used by `backend/seed_super_admin.py`.
- `DEMO_*`: optional values used by `backend/scripts/seed_demo_company.py` for local demo bootstrap.

### Frontend

- `VITE_API_BASE_URL`: API base URL. If omitted, the frontend uses `/api/v1` and the Vite development proxy.
- `VITE_SOCKET_URL`: Socket.IO server URL. If omitted, the frontend uses the API origin.
- `VITE_ENABLED_BACKEND_MODULES`: comma-separated list of modules exposed in the shell navigation.

## Collaboration Notes

- CI runs on every push and pull request for both backend and frontend.
- Repository line endings and editor defaults are normalized through `.gitattributes` and `.editorconfig`.
- Local secrets, uploads, generated payroll bulletins, caches, and build output must stay out of commits.
- New contributors should use [CONTRIBUTING.md](CONTRIBUTING.md) as the review and PR baseline.

## Multi-Tenant Principles

- Tenant context represented by `X-Tenant-ID` header.
- Every business query in future steps must include tenant filters.
- JWT identity + tenant membership validation is prepared in core layer.

## i18n Principles

- Default language is French.
- User language preference stored client-side now; DB persistence will be added in Step 5.
- Translation keys are used across UI components.

## Current Focus

- keep the repository aligned with a realistic V1 scope
- stabilize automated quality gates across backend and frontend
- continue hardening the V1 business paths before broader feature expansion

## Known Limits

- The project now has an initial migration, but production rollout still needs backup/restore discipline and future migration coverage.
- The frontend currently uses a tab-scoped session model, not a hardened cookie-based session flow.
- The repo includes code for non-V1 modules that are not part of the default product path.
- Automated backend and frontend suites now exist, but coverage is still concentrated on the V1 critical flows.
