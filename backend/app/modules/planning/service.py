from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import or_

from app.extensions import db
from app.models.planning import AgendaEntry
from app.models.project import Project, ProjectAssignment, ProjectTask
from app.models.user import User
from app.modules.projects.service import ProjectManagementError, update_project_task


TASK_COMPLETED_STATUSES = {"done", "completed"}
TERMINAL_PROJECT_STATUSES = {"completed", "final_acceptance", "archived", "cancelled"}


class PlanningError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _ensure_timezone(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _validate_entry_dates(start_at: datetime | None, end_at: datetime | None) -> None:
    if start_at is None:
        raise PlanningError("start_at is required", status_code=400)
    if end_at is not None and end_at < start_at:
        raise PlanningError("end_at cannot be before start_at", status_code=400)


def _serialize_user(user: User | None) -> dict[str, Any] | None:
    if user is None:
        return None
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip() or user.email
    return {
        "id": user.id,
        "full_name": full_name,
        "email": user.email,
        "job_title": user.job_title,
        "department": user.department,
    }


def _serialize_project(project: Project | None) -> dict[str, Any] | None:
    if project is None:
        return None
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "progress_percent": float(project.progress_percent or 0),
    }


def _task_deadline(task: ProjectTask) -> date | None:
    return task.due_date or task.end_date


def _serialize_task(task: ProjectTask, user_id: int, *, can_manage_projects: bool = False) -> dict[str, Any]:
    project = Project.query.filter_by(id=task.project_id).first()
    assigned_user = User.query.filter_by(id=task.assigned_to_user_id).first() if task.assigned_to_user_id else None
    responsible_user = User.query.filter_by(id=task.responsible_user_id).first() if task.responsible_user_id else None
    deadline = _task_deadline(task)
    today = date.today()
    is_completed = task.status in TASK_COMPLETED_STATUSES

    return {
        "id": task.id,
        "project_id": task.project_id,
        "project": _serialize_project(project),
        "parent_task_id": task.parent_task_id,
        "task_type": task.task_type,
        "title": task.title,
        "description": task.description,
        "assigned_to_user_id": task.assigned_to_user_id,
        "responsible_user_id": task.responsible_user_id,
        "assigned_user": _serialize_user(assigned_user),
        "responsible_user": _serialize_user(responsible_user),
        "start_date": task.start_date.isoformat() if task.start_date else None,
        "end_date": task.end_date.isoformat() if task.end_date else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "priority": task.priority,
        "status": task.status,
        "progress_percent": float(task.progress_percent or 0),
        "responsibility": task.responsibility,
        "is_completed": is_completed,
        "is_overdue": bool(deadline and deadline < today and not is_completed),
        "can_update": can_manage_projects or task.assigned_to_user_id == user_id or task.responsible_user_id == user_id,
    }


def _serialize_agenda_entry(entry: AgendaEntry) -> dict[str, Any]:
    project = Project.query.filter_by(id=entry.project_id).first() if entry.project_id else None
    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "user_id": entry.user_id,
        "project_id": entry.project_id,
        "project": _serialize_project(project),
        "title": entry.title,
        "description": entry.description,
        "location": entry.location,
        "category": entry.category,
        "start_at": entry.start_at.isoformat() if entry.start_at else None,
        "end_at": entry.end_at.isoformat() if entry.end_at else None,
        "all_day": bool(entry.all_day),
        "is_completed": bool(entry.is_completed),
        "source": entry.source,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def _resolve_owned_entry(user_id: int, entry_id: int) -> AgendaEntry:
    entry = AgendaEntry.query.filter_by(id=entry_id, user_id=user_id).first()
    if entry is None:
        raise PlanningError("Agenda entry not found", status_code=404)
    return entry


def _ensure_project_matches_company(company_id: int | None, project_id: int | None) -> Project | None:
    if project_id in (None, ""):
        return None

    project = Project.query.filter(Project.id == int(project_id), Project.deleted_at.is_(None)).first()
    if project is None:
        raise PlanningError("Project not found", status_code=404)
    if company_id is not None and project.company_id != company_id:
        raise PlanningError("Project does not belong to the active company", status_code=403)
    return project


def list_agenda_entries(
    *,
    user_id: int,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    include_completed: bool = True,
) -> list[dict[str, Any]]:
    query = AgendaEntry.query.filter(AgendaEntry.user_id == user_id)

    if not include_completed:
        query = query.filter(AgendaEntry.is_completed.is_(False))

    if date_from is not None:
        query = query.filter(or_(AgendaEntry.end_at.is_(None), AgendaEntry.end_at >= date_from))

    if date_to is not None:
        query = query.filter(AgendaEntry.start_at <= date_to)

    rows = query.order_by(AgendaEntry.start_at.asc(), AgendaEntry.created_at.asc()).all()
    return [_serialize_agenda_entry(row) for row in rows]


def create_agenda_entry(*, user_id: int, company_id: int | None, payload: dict[str, Any]) -> dict[str, Any]:
    project = _ensure_project_matches_company(company_id, payload.get("project_id"))
    start_at = _ensure_timezone(payload.get("start_at"))
    end_at = _ensure_timezone(payload.get("end_at"))
    _validate_entry_dates(start_at, end_at)

    title = _normalize_text(payload.get("title"))
    if not title:
        raise PlanningError("title is required", status_code=400)

    entry = AgendaEntry(
        company_id=company_id if company_id is not None else (project.company_id if project else None),
        user_id=user_id,
        project_id=project.id if project else None,
        title=title,
        description=_normalize_text(payload.get("description")),
        location=_normalize_text(payload.get("location")),
        category=str(payload.get("category") or "personal").strip().lower() or "personal",
        start_at=start_at,
        end_at=end_at,
        all_day=bool(payload.get("all_day", False)),
        is_completed=bool(payload.get("is_completed", False)),
        source="manual",
    )
    db.session.add(entry)
    db.session.commit()
    return _serialize_agenda_entry(entry)


def update_agenda_entry(*, user_id: int, company_id: int | None, entry_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    entry = _resolve_owned_entry(user_id, entry_id)
    project_id = payload.get("project_id") if "project_id" in payload else entry.project_id
    project = _ensure_project_matches_company(company_id or entry.company_id, project_id)

    if "title" in payload:
        title = _normalize_text(payload.get("title"))
        if not title:
            raise PlanningError("title cannot be empty", status_code=400)
        entry.title = title
    if "description" in payload:
        entry.description = _normalize_text(payload.get("description"))
    if "location" in payload:
        entry.location = _normalize_text(payload.get("location"))
    if "category" in payload and payload.get("category") is not None:
        entry.category = str(payload.get("category") or "").strip().lower()
    if "project_id" in payload:
        entry.project_id = project.id if project else None
        if project is not None:
            entry.company_id = project.company_id
    if "start_at" in payload:
        entry.start_at = _ensure_timezone(payload.get("start_at"))
    if "end_at" in payload:
        entry.end_at = _ensure_timezone(payload.get("end_at"))
    if "all_day" in payload and payload.get("all_day") is not None:
        entry.all_day = bool(payload.get("all_day"))
    if "is_completed" in payload and payload.get("is_completed") is not None:
        entry.is_completed = bool(payload.get("is_completed"))

    _validate_entry_dates(entry.start_at, entry.end_at)
    db.session.commit()
    return _serialize_agenda_entry(entry)


def delete_agenda_entry(*, user_id: int, entry_id: int) -> None:
    entry = _resolve_owned_entry(user_id, entry_id)
    db.session.delete(entry)
    db.session.commit()


def build_planning_overview(
    *,
    user_id: int,
    company_id: int | None,
    permission_codes: list[str] | set[str] | None,
    lookahead_days: int = 21,
) -> dict[str, Any]:
    permissions = set(permission_codes or [])
    can_read_projects = company_id is not None and ("projects.read" in permissions or "projects.manage" in permissions)
    can_manage_projects = company_id is not None and "projects.manage" in permissions
    now = datetime.now(timezone.utc)
    start_of_today = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end_of_today = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)
    end_of_window = start_of_today + timedelta(days=max(1, lookahead_days))

    agenda_entries = (
        AgendaEntry.query.filter(
            AgendaEntry.user_id == user_id,
            AgendaEntry.start_at >= start_of_today,
            AgendaEntry.start_at <= end_of_window,
        )
        .order_by(AgendaEntry.start_at.asc(), AgendaEntry.created_at.asc())
        .all()
    )

    agenda_summary = {
        "today_count": sum(1 for entry in agenda_entries if start_of_today <= entry.start_at <= end_of_today),
        "upcoming_count": sum(1 for entry in agenda_entries if entry.start_at > end_of_today),
        "completed_count": sum(1 for entry in agenda_entries if entry.is_completed),
    }

    my_tasks: list[dict[str, Any]] = []
    projects_summary: list[dict[str, Any]] = []

    if can_read_projects:
        task_rows = (
            ProjectTask.query.filter(
                ProjectTask.company_id == company_id,
                ProjectTask.deleted_at.is_(None),
                or_(ProjectTask.assigned_to_user_id == user_id, ProjectTask.responsible_user_id == user_id),
            )
            .order_by(ProjectTask.due_date.is_(None), ProjectTask.due_date.asc(), ProjectTask.created_at.asc())
            .all()
        )
        my_tasks = [_serialize_task(task, user_id, can_manage_projects=can_manage_projects) for task in task_rows]

        project_rows = (
            Project.query.filter(
                Project.company_id == company_id,
                Project.deleted_at.is_(None),
                Project.status.notin_(TERMINAL_PROJECT_STATUSES),
            )
            .order_by(Project.end_date.is_(None), Project.end_date.asc(), Project.name.asc())
            .limit(8)
            .all()
        )

        assignment_counts = {
            row.project_id: row.count
            for row in db.session.query(
                ProjectAssignment.project_id,
                db.func.count(ProjectAssignment.id).label("count"),
            )
            .filter(ProjectAssignment.company_id == company_id, ProjectAssignment.is_active.is_(True))
            .group_by(ProjectAssignment.project_id)
            .all()
        }

        project_ids = [project.id for project in project_rows]
        project_tasks = (
            ProjectTask.query.filter(
                ProjectTask.company_id == company_id,
                ProjectTask.project_id.in_(project_ids) if project_ids else False,
                ProjectTask.deleted_at.is_(None),
            )
            .all()
            if project_ids
            else []
        )
        tasks_by_project: dict[int, list[ProjectTask]] = {project_id: [] for project_id in project_ids}
        for task in project_tasks:
            tasks_by_project.setdefault(task.project_id, []).append(task)

        today = date.today()
        for project in project_rows:
            tasks = tasks_by_project.get(project.id, [])
            open_tasks = [task for task in tasks if task.status not in TASK_COMPLETED_STATUSES]
            completed_tasks = [task for task in tasks if task.status in TASK_COMPLETED_STATUSES]
            deadlines = [deadline for deadline in (_task_deadline(task) for task in open_tasks) if deadline is not None]
            delayed_tasks = [deadline for deadline in deadlines if deadline < today]

            projects_summary.append(
                {
                    **(_serialize_project(project) or {}),
                    "assigned_people_count": assignment_counts.get(project.id, 0),
                    "task_count": len(tasks),
                    "open_task_count": len(open_tasks),
                    "completed_task_count": len(completed_tasks),
                    "delayed_task_count": len(delayed_tasks),
                    "next_deadline": min(deadlines).isoformat() if deadlines else None,
                }
            )

    return {
        "company_id": company_id,
        "permissions": {
            "can_read_projects": can_read_projects,
            "can_manage_projects": can_manage_projects,
        },
        "agenda_summary": agenda_summary,
        "my_tasks": my_tasks,
        "projects": projects_summary,
    }


def update_planning_task_status(
    *,
    company_id: int,
    task_id: int,
    user_id: int,
    permission_codes: list[str] | set[str] | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    permissions = set(permission_codes or [])
    task = ProjectTask.query.filter(
        ProjectTask.id == task_id,
        ProjectTask.company_id == company_id,
        ProjectTask.deleted_at.is_(None),
    ).first()
    if task is None:
        raise PlanningError("Task not found", status_code=404)

    can_manage_projects = "projects.manage" in permissions
    is_task_owner = task.assigned_to_user_id == user_id or task.responsible_user_id == user_id
    if not can_manage_projects and not is_task_owner:
        raise PlanningError("You cannot update this task", status_code=403, code="planning_task_forbidden")

    status = str(payload.get("status") or "").strip().lower()
    progress_percent = payload.get("progress_percent")

    if status == "completed":
        progress_percent = 100
    elif status == "not_started" and progress_percent is None:
        progress_percent = 0
    elif status == "in_progress" and progress_percent is None:
        progress_percent = max(float(task.progress_percent or 0), 50.0)

    try:
        return update_project_task(
            company_id=company_id,
            task_id=task_id,
            payload={
                "status": status,
                "progress_percent": progress_percent,
            },
        )
    except ProjectManagementError as exc:
        raise PlanningError(exc.message, status_code=exc.status_code) from exc
