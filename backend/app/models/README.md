# STEP 2 - SQLAlchemy Schema

This package contains the PostgreSQL schema for T-ERP.

## Design Goals

- strict multi-tenant isolation using `company_id` on tenant-scoped tables
- module-based model separation (projects, inventory, chat, recruitment, etc.)
- explicit status/type constraints via SQL checks
- RBAC-ready structure with roles and permissions
- user language preference support (`users.preferred_language`)

## Files

- `base.py`: common mixins for timestamps, tenant scoping, soft delete
- `company.py`: company and company settings
- `user.py`: users, roles, permissions, assignments
- `project.py`: projects, teams, tasks, reports
- `finance.py`: expenses, revenues, invoices, and payments
- `inventory.py`: item catalog, locations, stock movements, allocations
- `procurement.py`: public tenders, compliance checklists, and submissions
- `chat.py`: conversations, participants, messages, read states
- `calls.py`: audio/video call sessions and participants
- `recruitment.py`: job offers, candidate profiles, applications, matching
