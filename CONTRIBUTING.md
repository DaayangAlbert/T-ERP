# Contributing to T-ERP

This repository is shared by multiple developers working on the same product foundation.
The goal of this guide is to keep onboarding lightweight while making local setup, code review, and releases predictable.

## Start Here

1. Read [docs/developer-onboarding.md](docs/developer-onboarding.md).
2. Create your local env files from the examples in `backend/.env.example` and `frontend/.env.example`.
3. Run the backend and frontend test commands before opening a pull request.

## Branch Strategy

- `main` is the shared integration branch.
- Create short-lived branches from `main`.
- Prefer branch names such as:
  - `feat/<short-topic>`
  - `fix/<short-topic>`
  - `docs/<short-topic>`
  - `chore/<short-topic>`

Examples:

- `feat/projects-workspace-filters`
- `fix/chat-message-read-state`
- `docs/backend-bootstrap`

## Commit Messages

Use short imperative commit messages that describe the change clearly.

Good examples:

- `Add finance invoice review transitions`
- `Fix tenant scoping in user profile query`
- `Document local demo company bootstrap`

## Pull Request Expectations

Each pull request should stay focused on one change area when possible.

Before opening a PR:

1. Rebase or merge the latest `main` into your branch.
2. Run the relevant test suite locally.
3. Update docs or env examples when the setup changes.
4. Check that no secrets, uploads, generated PDFs, local databases, or logs are included.

Minimum local verification:

- Backend tests: `python -m pytest backend/tests`
- Backend smoke flow: `python backend/scripts/smoke_test_sprint_1.py`
- Frontend tests: `npm run test` from `frontend/`
- Frontend build: `npm run build` from `frontend/`

If a change affects only one side of the stack, still run the relevant checks for that side before requesting review.

## Coding Expectations

### Backend

- Keep tenant-sensitive logic explicit and scoped correctly.
- Avoid introducing routes or services that bypass auth, role checks, or tenant filters.
- When a schema change is required, include the Alembic migration and the local bootstrap impact.
- Prefer extending existing module boundaries instead of creating cross-module shortcuts.

### Frontend

- Keep UI strings in translation files instead of hardcoding text in components.
- Respect the current V1 scope and avoid exposing out-of-scope modules in default navigation unless the change explicitly targets product scope.
- Preserve the existing feature-based folder structure.

### Shared

- Keep comments concise and useful.
- Favor small, reviewable changes over broad refactors without a documented reason.
- Update product or technical docs when behavior changes in a way that affects the next developer.

## Secrets and Local Data

Never commit:

- `backend/.env`
- `frontend/.env` or `frontend/.env.local`
- files from `backend/uploads/`
- generated payroll bulletins from `backend/app/modules/payroll/output/**`
- local databases, caches, coverage reports, or logs

The repository already ignores most of these paths, but contributors should still verify staged files before every commit.

## Review Checklist

Use this checklist before requesting review:

- The branch is based on current `main`.
- Local env examples still match the real configuration needs.
- Tests and build commands relevant to the change have passed.
- New UI copy is translated.
- New database behavior is covered by migrations and test updates when needed.
- Docs were updated when local setup, architecture, or workflows changed.

## When in Doubt

- Put local setup guidance in [docs/developer-onboarding.md](docs/developer-onboarding.md).
- Put architectural or workflow clarifications in `README.md` when they help everyone discover the project faster.
- Prefer asking for a small review early rather than letting a large branch drift.
