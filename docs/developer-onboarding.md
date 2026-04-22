# Developer Onboarding

This guide is the fastest path from clone to productive local development on T-ERP.

## Recommended Versions

- Git `2.47+`
- Python `3.12`
- Node.js `20`
- npm `10+`
- PostgreSQL `15+`

The CI workflow currently validates the repository with Python `3.12` and Node.js `20`, so matching those versions locally will reduce surprises.

## Repository Layout

- `backend/`: Flask API, business modules, migrations, seeds, tests
- `frontend/`: Vite + React application, UI tests, shared client utilities
- `docs/`: product specifications, API contracts, functional references
- `.github/workflows/ci.yml`: CI checks for backend and frontend

## First Local Setup

### 1. Clone and enter the repository

```bash
git clone https://github.com/DaayangAlbert/T-ERP.git
cd T-ERP
```

### 2. Configure backend env

Create `backend/.env` from `backend/.env.example`.

Required values for local work:

- `DATABASE_URL`
- `JWT_SECRET_KEY`

Example PostgreSQL URL:

```text
postgresql+psycopg://postgres:change-me@localhost:5432/terp_dev
```

### 3. Install backend dependencies

```bash
python -m venv .venv
```

Activate the environment, then install dev dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install -r backend/requirements-dev.txt
```

### 4. Prepare the database

```bash
python backend/bootstrap_schema.py
python backend/seed_default_profiles.py
```

Optional local seed commands:

```bash
python backend/seed_super_admin.py
python backend/scripts/seed_platform.py
python backend/scripts/seed_demo_company.py
```

### 5. Configure frontend env

Create `frontend/.env.local` from `frontend/.env.example` only if you need to override the default local proxy behavior.

For most local development, the Vite proxy is enough and no override is required.

### 6. Install frontend dependencies

```bash
cd frontend
npm ci
cd ..
```

## Daily Run Commands

### Backend

```bash
python backend/run.py
```

Default local API URL:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm run dev
```

Default local frontend URL:

```text
http://localhost:5173
```

## Verification Commands

Run these before opening a pull request:

### Backend tests

```bash
python -m pytest backend/tests
```

### Backend smoke scenario

```bash
python backend/scripts/smoke_test_sprint_1.py
```

### Frontend tests

```bash
cd frontend
npm run test
```

### Frontend production build

```bash
cd frontend
npm run build
```

## Collaboration Conventions

- Read [../CONTRIBUTING.md](../CONTRIBUTING.md) before opening your first PR.
- Keep secrets and local data out of the repository.
- Use translation files for UI copy.
- Respect tenant boundaries in backend queries and services.
- Keep changes scoped and reviewable.

## Local Files That Must Stay Local

Do not commit these categories:

- backend env files
- frontend local env files
- uploads under `backend/uploads/`
- generated payroll PDFs under `backend/app/modules/payroll/output/**`
- local caches, coverage output, logs, and build artifacts

Most of these are already ignored, but every contributor should still verify staged changes manually.

## Useful Starting Points

- Technical overview: [../README.md](../README.md)
- Contribution workflow: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- Functional specification: [cahier-des-charges-fonctionnel.md](cahier-des-charges-fonctionnel.md)
- API route detail: [routes-api-flask-detaillees.md](routes-api-flask-detaillees.md)
- Sprint smoke checklist: [smoke-test-sprint-1.md](smoke-test-sprint-1.md)

## Common Pitfalls

- Missing `JWT_SECRET_KEY` or `DATABASE_URL` will block backend startup.
- Production-style CORS values are stricter than development defaults.
- The frontend defaults to the Vite proxy; avoid setting a custom API URL unless you need it.
- Generated files from uploads or payroll output should never be treated as source files.
