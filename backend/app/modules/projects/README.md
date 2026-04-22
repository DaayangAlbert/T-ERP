# STEP 6+ - Projects / Public Works Module

Implemented capabilities:

- enriched project / contract lifecycle for BTP and public procurement contexts
- public/private/internal/preparation project typology
- project cockpit with KPIs, alerts, gantt-ready task data, finance and resources summary
- direct personnel assignments to projects
- hierarchical planning with phases, tasks, subtasks and progress tracking
- site journal and operational reporting
- project risk register
- contract change orders / avenants
- document registry by category
- project budget versions and budget lines
- legacy team management endpoints preserved for compatibility

Endpoints:

- `GET /api/v1/projects/status`
- `GET /api/v1/projects/dashboard`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/workspace`
- `PATCH /api/v1/projects/{project_id}`
- `DELETE /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/teams`
- `POST /api/v1/projects/{project_id}/teams`
- `POST /api/v1/projects/teams/{team_id}/members`
- `GET /api/v1/projects/{project_id}/assignments`
- `POST /api/v1/projects/{project_id}/assignments`
- `GET /api/v1/projects/{project_id}/tasks`
- `POST /api/v1/projects/{project_id}/tasks`
- `PATCH /api/v1/projects/tasks/{task_id}`
- `GET /api/v1/projects/{project_id}/reports`
- `POST /api/v1/projects/{project_id}/reports`
- `GET /api/v1/projects/{project_id}/documents`
- `POST /api/v1/projects/{project_id}/documents`
- `GET /api/v1/projects/{project_id}/risks`
- `POST /api/v1/projects/{project_id}/risks`
- `PATCH /api/v1/projects/risks/{risk_id}`
- `GET /api/v1/projects/{project_id}/change-orders`
- `POST /api/v1/projects/{project_id}/change-orders`
- `GET /api/v1/projects/{project_id}/budgets`
- `POST /api/v1/projects/{project_id}/budgets`
- `POST /api/v1/projects/budgets/{budget_id}/lines`

Security:

- read endpoints require `projects.read`
- write endpoints require `projects.manage`
- tenant context is enforced via JWT/header resolution
