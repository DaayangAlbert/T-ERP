from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from app.extensions import db
from app.models.attendance import AttendanceRecord
from app.models.finance import BusinessPartner, ExpenseRecord, FinanceEntry, Invoice, ProjectBudget, ProjectBudgetLine, RevenueRecord
from app.models.inventory import InventoryItem, ProjectStockAllocation
from app.models.project import (
    Project,
    ProjectAssignment,
    ProjectChangeOrder,
    ProjectDocument,
    ProjectReport,
    ProjectRisk,
    ProjectTask,
    Team,
    TeamMember,
)
from app.models.user import Role, User, UserRole
from app.modules.projects.schemas import (
    ASSIGNMENT_MODES,
    CHANGE_ORDER_STATUSES,
    DOCUMENT_CATEGORIES,
    PROJECT_STATUSES,
    PROJECT_TYPES,
    REPORT_TYPES,
    RISK_SEVERITIES,
    RISK_STATUSES,
    TASK_PRIORITIES,
    TASK_STATUSES,
    TASK_TYPES,
)


TERMINAL_PROJECT_STATUSES = {"completed", "final_acceptance", "archived", "cancelled"}
ACTIVE_PROJECT_STATUSES = {"preparation", "submitted", "awarded", "in_progress", "suspended", "planned", "on_hold", "draft"}
TASK_COMPLETED_STATUSES = {"done", "completed"}
ALERT_LOOKAHEAD_DAYS = 7
WORKER_ROLE_CODES = {"ouvrier", "collaborateur_terrain"}
BUDGET_PROGRESS_ALERT_THRESHOLD = 10.0
RECOMMENDED_ACTIVE_PROJECTS_PER_PERSON = 2
WORK_MINUTES_PER_DAY = 8 * 60
WORK_MINUTES_PER_WEEK = 48 * 60


class ProjectManagementError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_date(raw_value: Any, field_name: str) -> date | None:
    if raw_value in (None, ""):
        return None
    if isinstance(raw_value, date):
        return raw_value
    try:
        return date.fromisoformat(str(raw_value))
    except ValueError as exc:
        raise ProjectManagementError(f"{field_name} must be in YYYY-MM-DD format", status_code=400) from exc


def _parse_decimal(
    raw_value: Any,
    field_name: str,
    *,
    minimum: Decimal | None = None,
    maximum: Decimal | None = None,
) -> Decimal | None:
    if raw_value in (None, ""):
        return None
    try:
        parsed = Decimal(str(raw_value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ProjectManagementError(f"{field_name} must be numeric", status_code=400) from exc
    if minimum is not None and parsed < minimum:
        raise ProjectManagementError(f"{field_name} cannot be less than {minimum}", status_code=400)
    if maximum is not None and parsed > maximum:
        raise ProjectManagementError(f"{field_name} cannot be greater than {maximum}", status_code=400)
    return parsed


def _parse_non_negative_int(raw_value: Any, field_name: str) -> int | None:
    if raw_value in (None, ""):
        return None
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ProjectManagementError(f"{field_name} must be an integer", status_code=400) from exc
    if value < 0:
        raise ProjectManagementError(f"{field_name} cannot be negative", status_code=400)
    return value


def _serialize_amount(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def _parse_time_field(raw_value: Any, field_name: str) -> time | None:
    if raw_value in (None, ""):
        return None
    if isinstance(raw_value, time):
        return raw_value.replace(second=0, microsecond=0)
    value = str(raw_value).strip()
    try:
        parsed = time.fromisoformat(value)
    except ValueError as exc:
        raise ProjectManagementError(f"{field_name} must be in HH:MM format", status_code=400) from exc
    return parsed.replace(second=0, microsecond=0)


def _serialize_time_field(value: time | None) -> str | None:
    return value.strftime("%H:%M") if value is not None else None


def _time_to_minutes(value: time | None) -> int:
    if value is None:
        return 0
    return value.hour * 60 + value.minute


def _hours_from_minutes(minutes: int) -> float:
    return round(minutes / 60, 2)


def _compute_work_metrics(*, status: str, arrival_time: time | None, departure_time: time | None, strict: bool = False) -> dict[str, int]:
    normalized_status = str(status or "present").strip().lower()
    if normalized_status == "absent":
        return {
            "worked_minutes": 0,
            "daily_regular_minutes": 0,
            "daily_overtime_minutes": 0,
            "daily_missing_minutes": WORK_MINUTES_PER_DAY,
            "status": "absent",
        }

    if arrival_time is None or departure_time is None:
        if not strict:
            return {
                "worked_minutes": 0,
                "daily_regular_minutes": 0,
                "daily_overtime_minutes": 0,
                "daily_missing_minutes": WORK_MINUTES_PER_DAY,
                "status": "present",
            }
        raise ProjectManagementError("arrival_time and departure_time are required unless entry_type is absence", status_code=400)

    arrival_minutes = _time_to_minutes(arrival_time)
    departure_minutes = _time_to_minutes(departure_time)
    if departure_minutes <= arrival_minutes:
        raise ProjectManagementError("departure_time must be greater than arrival_time", status_code=400)

    worked_minutes = departure_minutes - arrival_minutes
    daily_regular_minutes = min(worked_minutes, WORK_MINUTES_PER_DAY)
    daily_overtime_minutes = max(0, worked_minutes - WORK_MINUTES_PER_DAY)
    daily_missing_minutes = max(0, WORK_MINUTES_PER_DAY - worked_minutes)
    derived_status = "overtime" if daily_overtime_minutes > 0 else "present"

    return {
        "worked_minutes": worked_minutes,
        "daily_regular_minutes": daily_regular_minutes,
        "daily_overtime_minutes": daily_overtime_minutes,
        "daily_missing_minutes": daily_missing_minutes,
        "status": derived_status,
    }


def _user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    return full_name or user.email


def _serialize_user(user: User | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "full_name": _user_display_name(user),
        "email": user.email,
        "phone": user.phone,
        "job_title": user.job_title,
        "department": user.department,
    }


def _load_user_role_codes(company_id: int, user_id: int) -> set[str]:
    rows = (
        db.session.query(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(
            UserRole.user_id == user_id,
            UserRole.company_id == company_id,
            (Role.company_id == company_id) | (Role.company_id.is_(None)),
        )
        .all()
    )
    return {str(code).strip().lower() for (code,) in rows if code}


def _normalized_role_codes(company_id: int, user_id: int, role_codes: list[str] | set[str] | None = None) -> set[str]:
    if role_codes:
        return {str(code).strip().lower() for code in role_codes if code}
    return _load_user_role_codes(company_id, user_id)


def _is_worker_scope(company_id: int, user_id: int | None, role_codes: list[str] | set[str] | None = None) -> bool:
    if user_id is None:
        return False
    return bool(_normalized_role_codes(company_id, user_id, role_codes) & WORKER_ROLE_CODES)


def _resolve_worker_project_ids(
    company_id: int,
    *,
    user_id: int,
    role_codes: list[str] | set[str] | None = None,
) -> list[int]:
    if not _is_worker_scope(company_id, user_id, role_codes):
        return []

    latest_assignment = (
        ProjectAssignment.query.filter(
            ProjectAssignment.company_id == company_id,
            ProjectAssignment.user_id == user_id,
            ProjectAssignment.is_active.is_(True),
        )
        .order_by(ProjectAssignment.start_date.desc(), ProjectAssignment.created_at.desc(), ProjectAssignment.id.desc())
        .first()
    )
    if latest_assignment is None:
        return []
    return [latest_assignment.project_id]


def _enforce_project_scope(
    company_id: int,
    project_id: int,
    *,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
) -> None:
    if not _is_worker_scope(company_id, user_id, role_codes):
        return

    allowed_project_ids = set(_resolve_worker_project_ids(company_id, user_id=user_id or 0, role_codes=role_codes))
    if project_id not in allowed_project_ids:
        raise ProjectManagementError("Project not available in current worker scope", status_code=403)


def _require_company_user(company_id: int, user_id: int | None, *, allow_none: bool = False) -> User | None:
    if user_id is None:
        if allow_none:
            return None
        raise ProjectManagementError("user_id is required", status_code=400)

    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise ProjectManagementError("User not found in company", status_code=404)
    return user


def _get_project(company_id: int, project_id: int, include_deleted: bool = False) -> Project:
    query = Project.query.filter(Project.id == project_id, Project.company_id == company_id)
    if not include_deleted:
        query = query.filter(Project.deleted_at.is_(None))
    project = query.first()
    if project is None:
        raise ProjectManagementError("Project not found", status_code=404)
    return project


def _get_task(company_id: int, task_id: int) -> ProjectTask:
    task = ProjectTask.query.filter_by(id=task_id, company_id=company_id).first()
    if task is None or task.deleted_at is not None:
        raise ProjectManagementError("Task not found", status_code=404)
    return task


def _get_assignment(company_id: int, assignment_id: int) -> ProjectAssignment:
    assignment = ProjectAssignment.query.filter_by(id=assignment_id, company_id=company_id).first()
    if assignment is None:
        raise ProjectManagementError("Assignment not found", status_code=404)
    return assignment


def _get_risk(company_id: int, risk_id: int) -> ProjectRisk:
    risk = ProjectRisk.query.filter_by(id=risk_id, company_id=company_id).first()
    if risk is None:
        raise ProjectManagementError("Risk not found", status_code=404)
    return risk


def _get_document(company_id: int, document_id: int) -> ProjectDocument:
    row = ProjectDocument.query.filter_by(id=document_id, company_id=company_id).first()
    if row is None:
        raise ProjectManagementError("Document not found", status_code=404)
    return row


def _get_change_order(company_id: int, change_order_id: int) -> ProjectChangeOrder:
    row = ProjectChangeOrder.query.filter_by(id=change_order_id, company_id=company_id).first()
    if row is None:
        raise ProjectManagementError("Change order not found", status_code=404)
    return row


def _get_presence_record(company_id: int, presence_id: int) -> AttendanceRecord:
    row = AttendanceRecord.query.filter_by(id=presence_id, company_id=company_id).first()
    if row is None:
        raise ProjectManagementError("Presence entry not found", status_code=404)
    return row


def _get_budget(company_id: int, budget_id: int) -> ProjectBudget:
    budget = ProjectBudget.query.filter_by(id=budget_id, company_id=company_id).first()
    if budget is None or budget.deleted_at is not None:
        raise ProjectManagementError("Budget not found", status_code=404)
    return budget


def _task_deadline(task: ProjectTask) -> date | None:
    return task.end_date or task.due_date


def _task_progress_value(task: ProjectTask) -> float:
    if task.progress_percent is not None:
        return float(task.progress_percent)
    if task.status in TASK_COMPLETED_STATUSES:
        return 100.0
    if task.status == "in_progress":
        return 50.0
    return 0.0


def _refresh_project_progress_snapshot(company_id: int, project_id: int) -> None:
    project = _get_project(company_id=company_id, project_id=project_id)
    tasks = ProjectTask.query.filter(
        ProjectTask.company_id == company_id,
        ProjectTask.project_id == project_id,
        ProjectTask.deleted_at.is_(None),
    ).all()
    if not tasks:
        return

    average_progress = round(sum(_task_progress_value(task) for task in tasks) / len(tasks), 2)
    project.progress_percent = Decimal(str(average_progress))
    project.physical_progress_percent = Decimal(str(average_progress))


def _validate_project_dates(project: Project) -> None:
    if project.start_date and project.end_date and project.end_date < project.start_date:
        raise ProjectManagementError("end_date cannot be before start_date", status_code=400)
    if project.publication_date and project.submission_date and project.submission_date < project.publication_date:
        raise ProjectManagementError("submission_date cannot be before publication_date", status_code=400)
    if project.submission_date and project.award_date and project.award_date < project.submission_date:
        raise ProjectManagementError("award_date cannot be before submission_date", status_code=400)


def _serialize_project(project: Project) -> dict[str, Any]:
    days_remaining = (project.end_date - date.today()).days if project.end_date else None
    return {
        "id": project.id,
        "company_id": project.company_id,
        "code": project.code,
        "name": project.name,
        "market_reference": project.market_reference,
        "project_type": project.project_type,
        "description": project.description,
        "location": project.location,
        "client_name": project.client_name,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "estimated_duration_days": project.estimated_duration_days,
        "status": project.status,
        "budget_amount": _serialize_amount(project.budget_amount),
        "contract_amount": _serialize_amount(project.contract_amount),
        "progress_percent": _serialize_amount(project.progress_percent) or 0.0,
        "physical_progress_percent": _serialize_amount(project.physical_progress_percent) or 0.0,
        "financial_progress_percent": _serialize_amount(project.financial_progress_percent) or 0.0,
        "document_url": project.document_url,
        "dao_number": project.dao_number,
        "contracting_authority": project.contracting_authority,
        "publication_date": project.publication_date.isoformat() if project.publication_date else None,
        "submission_date": project.submission_date.isoformat() if project.submission_date else None,
        "award_date": project.award_date.isoformat() if project.award_date else None,
        "contract_duration_days": project.contract_duration_days,
        "funding_source": project.funding_source,
        "site_latitude": _serialize_amount(project.site_latitude),
        "site_longitude": _serialize_amount(project.site_longitude),
        "final_cost_amount": _serialize_amount(project.final_cost_amount),
        "actual_duration_days": project.actual_duration_days,
        "closing_observations": project.closing_observations,
        "days_remaining": days_remaining,
        "is_archived": project.deleted_at is not None,
    }


def _serialize_team(team: Team) -> dict[str, Any]:
    supervisor = User.query.filter_by(id=team.supervisor_user_id).first() if team.supervisor_user_id else None
    return {
        "id": team.id,
        "company_id": team.company_id,
        "project_id": team.project_id,
        "name": team.name,
        "supervisor_user_id": team.supervisor_user_id,
        "supervisor": _serialize_user(supervisor),
    }


def serialize_project(project: Project) -> dict[str, Any]:
    return _serialize_project(project)


def build_projects_query(
    company_id: int,
    status: str | None = None,
    project_type: str | None = None,
    include_archived: bool = False,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
):
    query = Project.query.filter(Project.company_id == company_id)
    if not include_archived:
        query = query.filter(Project.deleted_at.is_(None))
    if status:
        query = query.filter(Project.status == status)
    if project_type:
        query = query.filter(Project.project_type == project_type)
    if _is_worker_scope(company_id, user_id, role_codes):
        scoped_project_ids = _resolve_worker_project_ids(company_id, user_id=user_id or 0, role_codes=role_codes) or [-1]
        query = query.filter(Project.id.in_(scoped_project_ids))
    return query.order_by(Project.created_at.desc())


def list_projects(
    company_id: int,
    status: str | None = None,
    project_type: str | None = None,
    include_archived: bool = False,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
) -> list[dict[str, Any]]:
    rows = build_projects_query(
        company_id=company_id,
        status=status,
        project_type=project_type,
        include_archived=include_archived,
        user_id=user_id,
        role_codes=role_codes,
    ).all()
    return [serialize_project(row) for row in rows]


def create_project(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    code = _normalize_text(payload.get("code"))
    name = _normalize_text(payload.get("name"))
    if not code:
        raise ProjectManagementError("Missing field: code", status_code=400)
    if not name:
        raise ProjectManagementError("Missing field: name", status_code=400)

    code = code.upper()
    if len(code) < 2:
        raise ProjectManagementError("Project code must have at least 2 characters", status_code=400)
    if Project.query.filter(Project.company_id == company_id, Project.code == code, Project.deleted_at.is_(None)).first():
        raise ProjectManagementError("Project code already exists", status_code=409)

    status = str(payload.get("status") or "draft").strip().lower()
    if status not in PROJECT_STATUSES:
        raise ProjectManagementError("Invalid project status", status_code=400)
    project_type = str(payload.get("project_type") or "internal_project").strip().lower()
    if project_type not in PROJECT_TYPES:
        raise ProjectManagementError("Invalid project type", status_code=400)

    project = Project(
        company_id=company_id,
        code=code,
        name=name,
        market_reference=_normalize_text(payload.get("market_reference")),
        project_type=project_type,
        description=_normalize_text(payload.get("description")),
        location=_normalize_text(payload.get("location")),
        client_name=_normalize_text(payload.get("client_name")),
        start_date=_parse_date(payload.get("start_date"), "start_date"),
        end_date=_parse_date(payload.get("end_date"), "end_date"),
        estimated_duration_days=_parse_non_negative_int(payload.get("estimated_duration_days"), "estimated_duration_days"),
        status=status,
        budget_amount=_parse_decimal(payload.get("budget_amount"), "budget_amount", minimum=Decimal("0")),
        contract_amount=_parse_decimal(payload.get("contract_amount"), "contract_amount", minimum=Decimal("0")),
        progress_percent=_parse_decimal(payload.get("progress_percent", 0), "progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0"),
        physical_progress_percent=_parse_decimal(payload.get("physical_progress_percent", 0), "physical_progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0"),
        financial_progress_percent=_parse_decimal(payload.get("financial_progress_percent", 0), "financial_progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0"),
        document_url=_normalize_text(payload.get("document_url")),
        dao_number=_normalize_text(payload.get("dao_number")),
        contracting_authority=_normalize_text(payload.get("contracting_authority")),
        publication_date=_parse_date(payload.get("publication_date"), "publication_date"),
        submission_date=_parse_date(payload.get("submission_date"), "submission_date"),
        award_date=_parse_date(payload.get("award_date"), "award_date"),
        contract_duration_days=_parse_non_negative_int(payload.get("contract_duration_days"), "contract_duration_days"),
        funding_source=_normalize_text(payload.get("funding_source")),
        site_latitude=_parse_decimal(payload.get("site_latitude"), "site_latitude"),
        site_longitude=_parse_decimal(payload.get("site_longitude"), "site_longitude"),
        final_cost_amount=_parse_decimal(payload.get("final_cost_amount"), "final_cost_amount", minimum=Decimal("0")),
        actual_duration_days=_parse_non_negative_int(payload.get("actual_duration_days"), "actual_duration_days"),
        closing_observations=_normalize_text(payload.get("closing_observations")),
    )
    _validate_project_dates(project)
    db.session.add(project)
    db.session.commit()
    return _serialize_project(project)


def get_project(
    company_id: int,
    project_id: int,
    *,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
) -> dict[str, Any]:
    _enforce_project_scope(company_id, project_id, user_id=user_id, role_codes=role_codes)
    return _serialize_project(_get_project(company_id=company_id, project_id=project_id))


def update_project(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    project = _get_project(company_id=company_id, project_id=project_id)

    if "name" in payload:
        name = _normalize_text(payload.get("name"))
        if not name:
            raise ProjectManagementError("name cannot be empty", status_code=400)
        project.name = name
    if "market_reference" in payload:
        project.market_reference = _normalize_text(payload.get("market_reference"))
    if "project_type" in payload:
        project_type = str(payload.get("project_type") or "").strip().lower()
        if project_type not in PROJECT_TYPES:
            raise ProjectManagementError("Invalid project type", status_code=400)
        project.project_type = project_type
    if "description" in payload:
        project.description = _normalize_text(payload.get("description"))
    if "location" in payload:
        project.location = _normalize_text(payload.get("location"))
    if "client_name" in payload:
        project.client_name = _normalize_text(payload.get("client_name"))
    if "start_date" in payload:
        project.start_date = _parse_date(payload.get("start_date"), "start_date")
    if "end_date" in payload:
        project.end_date = _parse_date(payload.get("end_date"), "end_date")
    if "estimated_duration_days" in payload:
        project.estimated_duration_days = _parse_non_negative_int(payload.get("estimated_duration_days"), "estimated_duration_days")
    if "status" in payload:
        status = str(payload.get("status") or "").strip().lower()
        if status not in PROJECT_STATUSES:
            raise ProjectManagementError("Invalid project status", status_code=400)
        project.status = status
    if "budget_amount" in payload:
        project.budget_amount = _parse_decimal(payload.get("budget_amount"), "budget_amount", minimum=Decimal("0"))
    if "contract_amount" in payload:
        project.contract_amount = _parse_decimal(payload.get("contract_amount"), "contract_amount", minimum=Decimal("0"))
    if "progress_percent" in payload:
        project.progress_percent = _parse_decimal(payload.get("progress_percent"), "progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0")
    if "physical_progress_percent" in payload:
        project.physical_progress_percent = _parse_decimal(payload.get("physical_progress_percent"), "physical_progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0")
    if "financial_progress_percent" in payload:
        project.financial_progress_percent = _parse_decimal(payload.get("financial_progress_percent"), "financial_progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0")
    if "document_url" in payload:
        project.document_url = _normalize_text(payload.get("document_url"))
    if "dao_number" in payload:
        project.dao_number = _normalize_text(payload.get("dao_number"))
    if "contracting_authority" in payload:
        project.contracting_authority = _normalize_text(payload.get("contracting_authority"))
    if "publication_date" in payload:
        project.publication_date = _parse_date(payload.get("publication_date"), "publication_date")
    if "submission_date" in payload:
        project.submission_date = _parse_date(payload.get("submission_date"), "submission_date")
    if "award_date" in payload:
        project.award_date = _parse_date(payload.get("award_date"), "award_date")
    if "contract_duration_days" in payload:
        project.contract_duration_days = _parse_non_negative_int(payload.get("contract_duration_days"), "contract_duration_days")
    if "funding_source" in payload:
        project.funding_source = _normalize_text(payload.get("funding_source"))
    if "site_latitude" in payload:
        project.site_latitude = _parse_decimal(payload.get("site_latitude"), "site_latitude")
    if "site_longitude" in payload:
        project.site_longitude = _parse_decimal(payload.get("site_longitude"), "site_longitude")
    if "final_cost_amount" in payload:
        project.final_cost_amount = _parse_decimal(payload.get("final_cost_amount"), "final_cost_amount", minimum=Decimal("0"))
    if "actual_duration_days" in payload:
        project.actual_duration_days = _parse_non_negative_int(payload.get("actual_duration_days"), "actual_duration_days")
    if "closing_observations" in payload:
        project.closing_observations = _normalize_text(payload.get("closing_observations"))

    _validate_project_dates(project)
    db.session.commit()
    return _serialize_project(project)


def archive_project(company_id: int, project_id: int) -> None:
    project = _get_project(company_id=company_id, project_id=project_id)
    project.status = "archived"
    project.deleted_at = datetime.now(timezone.utc)
    db.session.commit()


def list_teams(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = Team.query.filter_by(company_id=company_id, project_id=project_id).order_by(Team.name.asc()).all()
    return [_serialize_team(row) for row in rows]


def create_team(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ProjectManagementError("Missing field: name", status_code=400)

    supervisor_user_id = payload.get("supervisor_user_id")
    _require_company_user(company_id=company_id, user_id=supervisor_user_id, allow_none=True)

    existing = Team.query.filter_by(company_id=company_id, project_id=project_id, name=name).first()
    if existing:
        raise ProjectManagementError("Team name already exists for this project", status_code=409)

    team = Team(
        company_id=company_id,
        project_id=project_id,
        name=name,
        supervisor_user_id=supervisor_user_id,
    )
    db.session.add(team)
    db.session.commit()
    return _serialize_team(team)


def add_team_member(company_id: int, team_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    team = Team.query.filter_by(id=team_id, company_id=company_id).first()
    if team is None:
        raise ProjectManagementError("Team not found", status_code=404)

    user_id = payload.get("user_id")
    if user_id is None:
        raise ProjectManagementError("Missing field: user_id", status_code=400)
    user = _require_company_user(company_id=company_id, user_id=user_id)

    exists = TeamMember.query.filter_by(company_id=company_id, team_id=team_id, user_id=user_id).first()
    if exists:
        raise ProjectManagementError("User is already in this team", status_code=409)

    member = TeamMember(
        company_id=company_id,
        team_id=team_id,
        user_id=user_id,
        role_on_team=_normalize_text(payload.get("role_on_team")),
    )
    db.session.add(member)
    db.session.commit()

    return {
        "id": member.id,
        "company_id": member.company_id,
        "team_id": member.team_id,
        "user_id": member.user_id,
        "user": _serialize_user(user),
        "role_on_team": member.role_on_team,
    }


def _serialize_assignment(row: ProjectAssignment) -> dict[str, Any]:
    user = User.query.filter_by(id=row.user_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "user_id": row.user_id,
        "user": _serialize_user(user),
        "project_role": row.project_role,
        "assignment_mode": row.assignment_mode,
        "start_date": row.start_date.isoformat() if row.start_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "responsibility": row.responsibility,
        "notes": row.notes,
        "is_active": row.is_active,
    }


def list_project_assignments(company_id: int, project_id: int, active_only: bool = False) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    query = ProjectAssignment.query.filter_by(company_id=company_id, project_id=project_id)
    if active_only:
        query = query.filter(ProjectAssignment.is_active.is_(True))
    rows = query.order_by(ProjectAssignment.start_date.asc(), ProjectAssignment.created_at.asc()).all()
    return [_serialize_assignment(row) for row in rows]


def create_project_assignment(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    user = _require_company_user(company_id=company_id, user_id=payload.get("user_id"))
    project_role = _normalize_text(payload.get("project_role"))
    if not project_role:
        raise ProjectManagementError("Missing field: project_role", status_code=400)

    assignment_mode = str(payload.get("assignment_mode") or "immediate").strip().lower()
    if assignment_mode not in ASSIGNMENT_MODES:
        raise ProjectManagementError("Invalid assignment mode", status_code=400)

    start_date = _parse_date(payload.get("start_date"), "start_date")
    end_date = _parse_date(payload.get("end_date"), "end_date")
    if start_date and end_date and end_date < start_date:
        raise ProjectManagementError("end_date cannot be before start_date", status_code=400)

    user_role_codes = _load_user_role_codes(company_id, user.id)
    should_single_scope_worker = bool(user_role_codes & WORKER_ROLE_CODES)
    next_is_active = bool(payload.get("is_active", True))

    if should_single_scope_worker and next_is_active:
        current_assignments = ProjectAssignment.query.filter(
            ProjectAssignment.company_id == company_id,
            ProjectAssignment.user_id == user.id,
            ProjectAssignment.is_active.is_(True),
            ProjectAssignment.project_id != project_id,
        ).all()
        for current_assignment in current_assignments:
            current_assignment.is_active = False
            if current_assignment.end_date is None:
                current_assignment.end_date = start_date or date.today()

    row = ProjectAssignment(
        company_id=company_id,
        project_id=project_id,
        user_id=user.id,
        project_role=project_role,
        assignment_mode=assignment_mode,
        start_date=start_date,
        end_date=end_date,
        responsibility=_normalize_text(payload.get("responsibility")),
        notes=_normalize_text(payload.get("notes")),
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_assignment(row)


def update_project_assignment(company_id: int, assignment_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _get_assignment(company_id=company_id, assignment_id=assignment_id)
    _get_project(company_id=company_id, project_id=row.project_id)

    if "project_role" in payload:
        project_role = _normalize_text(payload.get("project_role"))
        if not project_role:
            raise ProjectManagementError("project_role cannot be empty", status_code=400)
        row.project_role = project_role

    if "assignment_mode" in payload:
        assignment_mode = str(payload.get("assignment_mode") or "").strip().lower()
        if assignment_mode not in ASSIGNMENT_MODES:
            raise ProjectManagementError("Invalid assignment mode", status_code=400)
        row.assignment_mode = assignment_mode

    if "start_date" in payload:
        row.start_date = _parse_date(payload.get("start_date"), "start_date")
    if "end_date" in payload:
        row.end_date = _parse_date(payload.get("end_date"), "end_date")
    if row.start_date and row.end_date and row.end_date < row.start_date:
        raise ProjectManagementError("end_date cannot be before start_date", status_code=400)

    if "responsibility" in payload:
        row.responsibility = _normalize_text(payload.get("responsibility"))
    if "notes" in payload:
        row.notes = _normalize_text(payload.get("notes"))

    if "is_active" in payload:
        row.is_active = bool(payload.get("is_active"))
        if not row.is_active and row.end_date is None:
            row.end_date = date.today()

    if row.is_active:
        user_role_codes = _load_user_role_codes(company_id, row.user_id)
        should_single_scope_worker = bool(user_role_codes & WORKER_ROLE_CODES)
        if should_single_scope_worker:
            current_assignments = ProjectAssignment.query.filter(
                ProjectAssignment.company_id == company_id,
                ProjectAssignment.user_id == row.user_id,
                ProjectAssignment.is_active.is_(True),
                ProjectAssignment.id != row.id,
            ).all()
            for current_assignment in current_assignments:
                current_assignment.is_active = False
                if current_assignment.end_date is None:
                    current_assignment.end_date = row.start_date or date.today()

    db.session.commit()
    return _serialize_assignment(row)


def _serialize_task(task: ProjectTask) -> dict[str, Any]:
    assigned_user = User.query.filter_by(id=task.assigned_to_user_id).first() if task.assigned_to_user_id else None
    responsible_user = User.query.filter_by(id=task.responsible_user_id).first() if task.responsible_user_id else None
    return {
        "id": task.id,
        "company_id": task.company_id,
        "project_id": task.project_id,
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
        "progress_percent": _serialize_amount(task.progress_percent) or 0.0,
        "responsibility": task.responsibility,
    }


def list_project_tasks(company_id: int, project_id: int, status: str | None = None) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    query = ProjectTask.query.filter(
        ProjectTask.company_id == company_id,
        ProjectTask.project_id == project_id,
        ProjectTask.deleted_at.is_(None),
    )
    if status:
        query = query.filter(ProjectTask.status == status)
    rows = query.order_by(ProjectTask.created_at.asc()).all()
    return [_serialize_task(row) for row in rows]


def create_project_task(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    title = _normalize_text(payload.get("title"))
    if not title:
        raise ProjectManagementError("Missing field: title", status_code=400)

    task_type = str(payload.get("task_type") or "task").strip().lower()
    if task_type not in TASK_TYPES:
        raise ProjectManagementError("Invalid task type", status_code=400)

    parent_task_id = payload.get("parent_task_id")
    if parent_task_id is not None:
        parent_task = _get_task(company_id=company_id, task_id=parent_task_id)
        if parent_task.project_id != project_id:
            raise ProjectManagementError("parent_task_id must belong to the same project", status_code=400)
        if task_type == "task":
            task_type = "subtask"

    _require_company_user(company_id=company_id, user_id=payload.get("assigned_to_user_id"), allow_none=True)
    _require_company_user(company_id=company_id, user_id=payload.get("responsible_user_id"), allow_none=True)

    priority = str(payload.get("priority") or "medium").strip().lower()
    if priority not in TASK_PRIORITIES:
        raise ProjectManagementError("Invalid task priority", status_code=400)

    status = str(payload.get("status") or "not_started").strip().lower()
    if status not in TASK_STATUSES:
        raise ProjectManagementError("Invalid task status", status_code=400)

    start_date = _parse_date(payload.get("start_date"), "start_date")
    end_date = _parse_date(payload.get("end_date"), "end_date")
    due_date = _parse_date(payload.get("due_date"), "due_date")
    if end_date is None and due_date is not None:
        end_date = due_date
    if due_date is None and end_date is not None:
        due_date = end_date
    if start_date and end_date and end_date < start_date:
        raise ProjectManagementError("end_date cannot be before start_date", status_code=400)

    progress = _parse_decimal(
        payload.get("progress_percent", 100 if status in TASK_COMPLETED_STATUSES else 0),
        "progress_percent",
        minimum=Decimal("0"),
        maximum=Decimal("100"),
    ) or Decimal("0")

    task = ProjectTask(
        company_id=company_id,
        project_id=project_id,
        parent_task_id=parent_task_id,
        task_type=task_type,
        title=title,
        description=_normalize_text(payload.get("description")),
        assigned_to_user_id=payload.get("assigned_to_user_id"),
        responsible_user_id=payload.get("responsible_user_id"),
        start_date=start_date,
        end_date=end_date,
        due_date=due_date,
        priority=priority,
        status=status,
        progress_percent=progress,
        responsibility=_normalize_text(payload.get("responsibility")),
    )
    db.session.add(task)
    db.session.commit()
    _refresh_project_progress_snapshot(company_id=company_id, project_id=project_id)
    db.session.commit()
    return _serialize_task(task)


def update_project_task(company_id: int, task_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    task = _get_task(company_id=company_id, task_id=task_id)

    if "parent_task_id" in payload:
        parent_task_id = payload.get("parent_task_id")
        if parent_task_id is None:
            task.parent_task_id = None
        else:
            parent_task = _get_task(company_id=company_id, task_id=parent_task_id)
            if parent_task.id == task.id:
                raise ProjectManagementError("A task cannot be its own parent", status_code=400)
            if parent_task.project_id != task.project_id:
                raise ProjectManagementError("parent_task_id must belong to the same project", status_code=400)
            task.parent_task_id = parent_task_id

    if "task_type" in payload:
        task_type = str(payload.get("task_type") or "").strip().lower()
        if task_type not in TASK_TYPES:
            raise ProjectManagementError("Invalid task type", status_code=400)
        task.task_type = task_type
    if "title" in payload:
        title = _normalize_text(payload.get("title"))
        if not title:
            raise ProjectManagementError("title cannot be empty", status_code=400)
        task.title = title
    if "description" in payload:
        task.description = _normalize_text(payload.get("description"))
    if "assigned_to_user_id" in payload:
        _require_company_user(company_id=company_id, user_id=payload.get("assigned_to_user_id"), allow_none=True)
        task.assigned_to_user_id = payload.get("assigned_to_user_id")
    if "responsible_user_id" in payload:
        _require_company_user(company_id=company_id, user_id=payload.get("responsible_user_id"), allow_none=True)
        task.responsible_user_id = payload.get("responsible_user_id")
    if "start_date" in payload:
        task.start_date = _parse_date(payload.get("start_date"), "start_date")
    if "end_date" in payload:
        task.end_date = _parse_date(payload.get("end_date"), "end_date")
    if "due_date" in payload:
        task.due_date = _parse_date(payload.get("due_date"), "due_date")
    if task.end_date is None and task.due_date is not None:
        task.end_date = task.due_date
    if task.due_date is None and task.end_date is not None:
        task.due_date = task.end_date
    if task.start_date and task.end_date and task.end_date < task.start_date:
        raise ProjectManagementError("end_date cannot be before start_date", status_code=400)
    if "priority" in payload:
        priority = str(payload.get("priority") or "").strip().lower()
        if priority not in TASK_PRIORITIES:
            raise ProjectManagementError("Invalid task priority", status_code=400)
        task.priority = priority
    if "status" in payload:
        status = str(payload.get("status") or "").strip().lower()
        if status not in TASK_STATUSES:
            raise ProjectManagementError("Invalid task status", status_code=400)
        task.status = status
    if "progress_percent" in payload:
        task.progress_percent = _parse_decimal(payload.get("progress_percent"), "progress_percent", minimum=Decimal("0"), maximum=Decimal("100")) or Decimal("0")
    elif task.status in TASK_COMPLETED_STATUSES:
        task.progress_percent = Decimal("100")
    if "responsibility" in payload:
        task.responsibility = _normalize_text(payload.get("responsibility"))

    db.session.commit()
    _refresh_project_progress_snapshot(company_id=company_id, project_id=task.project_id)
    db.session.commit()
    return _serialize_task(task)


def _serialize_report(report: ProjectReport) -> dict[str, Any]:
    author = User.query.filter_by(id=report.author_user_id).first()
    return {
        "id": report.id,
        "company_id": report.company_id,
        "project_id": report.project_id,
        "author_user_id": report.author_user_id,
        "author": _serialize_user(author),
        "report_date": report.report_date.isoformat(),
        "report_type": report.report_type,
        "weather": report.weather,
        "summary": report.summary,
        "activities_summary": report.activities_summary,
        "personnel_present": report.personnel_present,
        "incidents": report.incidents,
        "observations": report.observations,
        "photo_urls": report.photo_urls or [],
        "blockers": report.blockers,
        "attachment_url": report.attachment_url,
    }


def list_project_reports(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = (
        ProjectReport.query.filter_by(company_id=company_id, project_id=project_id)
        .order_by(ProjectReport.report_date.desc(), ProjectReport.created_at.desc())
        .all()
    )
    return [_serialize_report(row) for row in rows]


def create_project_report(company_id: int, project_id: int, author_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    _require_company_user(company_id=company_id, user_id=author_user_id)

    report_date = _parse_date(payload.get("report_date"), "report_date")
    if report_date is None:
        raise ProjectManagementError("Missing field: report_date", status_code=400)
    summary = _normalize_text(payload.get("summary"))
    if not summary:
        raise ProjectManagementError("Missing field: summary", status_code=400)

    report_type = str(payload.get("report_type") or "daily").strip().lower()
    if report_type not in REPORT_TYPES:
        raise ProjectManagementError("Invalid report type", status_code=400)
    if ProjectReport.query.filter_by(company_id=company_id, project_id=project_id, report_date=report_date).first():
        raise ProjectManagementError("A report already exists for this date", status_code=409)

    row = ProjectReport(
        company_id=company_id,
        project_id=project_id,
        author_user_id=author_user_id,
        report_date=report_date,
        report_type=report_type,
        weather=_normalize_text(payload.get("weather")),
        summary=summary,
        activities_summary=_normalize_text(payload.get("activities_summary")),
        personnel_present=_parse_non_negative_int(payload.get("personnel_present"), "personnel_present") or 0,
        incidents=_normalize_text(payload.get("incidents")),
        observations=_normalize_text(payload.get("observations")),
        photo_urls=payload.get("photo_urls") or [],
        blockers=_normalize_text(payload.get("blockers")),
        attachment_url=_normalize_text(payload.get("attachment_url")),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_report(row)


def _serialize_document(row: ProjectDocument) -> dict[str, Any]:
    uploader = User.query.filter_by(id=row.uploaded_by_user_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "uploaded_by_user_id": row.uploaded_by_user_id,
        "uploaded_by": _serialize_user(uploader),
        "category": row.category,
        "title": row.title,
        "file_url": row.file_url,
        "document_date": row.document_date.isoformat() if row.document_date else None,
        "notes": row.notes,
    }


def list_project_documents(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = (
        ProjectDocument.query.filter_by(company_id=company_id, project_id=project_id)
        .order_by(ProjectDocument.document_date.desc(), ProjectDocument.created_at.desc())
        .all()
    )
    return [_serialize_document(row) for row in rows]


def create_project_document(company_id: int, project_id: int, uploaded_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    _require_company_user(company_id=company_id, user_id=uploaded_by_user_id)

    title = _normalize_text(payload.get("title"))
    file_url = _normalize_text(payload.get("file_url"))
    if not title:
        raise ProjectManagementError("Missing field: title", status_code=400)
    if not file_url:
        raise ProjectManagementError("Missing field: file_url", status_code=400)

    category = str(payload.get("category") or "other").strip().lower()
    if category not in DOCUMENT_CATEGORIES:
        raise ProjectManagementError("Invalid document category", status_code=400)

    row = ProjectDocument(
        company_id=company_id,
        project_id=project_id,
        uploaded_by_user_id=uploaded_by_user_id,
        category=category,
        title=title,
        file_url=file_url,
        document_date=_parse_date(payload.get("document_date"), "document_date"),
        notes=_normalize_text(payload.get("notes")),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_document(row)


def update_project_document(company_id: int, document_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _get_document(company_id=company_id, document_id=document_id)

    if "category" in payload:
        category = str(payload.get("category") or "").strip().lower()
        if category not in DOCUMENT_CATEGORIES:
            raise ProjectManagementError("Invalid document category", status_code=400)
        row.category = category
    if "title" in payload:
        title = _normalize_text(payload.get("title"))
        if not title:
            raise ProjectManagementError("title cannot be empty", status_code=400)
        row.title = title
    if "file_url" in payload:
        file_url = _normalize_text(payload.get("file_url"))
        if not file_url:
            raise ProjectManagementError("file_url cannot be empty", status_code=400)
        row.file_url = file_url
    if "document_date" in payload:
        row.document_date = _parse_date(payload.get("document_date"), "document_date")
    if "notes" in payload:
        row.notes = _normalize_text(payload.get("notes"))

    db.session.commit()
    return _serialize_document(row)


def delete_project_document(company_id: int, document_id: int) -> None:
    row = _get_document(company_id=company_id, document_id=document_id)
    db.session.delete(row)
    db.session.commit()


def _serialize_risk(row: ProjectRisk) -> dict[str, Any]:
    owner = User.query.filter_by(id=row.owner_user_id).first() if row.owner_user_id else None
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "owner_user_id": row.owner_user_id,
        "owner": _serialize_user(owner),
        "title": row.title,
        "description": row.description,
        "severity": row.severity,
        "status": row.status,
        "mitigation_plan": row.mitigation_plan,
        "due_date": row.due_date.isoformat() if row.due_date else None,
    }


def list_project_risks(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = ProjectRisk.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectRisk.created_at.desc()).all()
    return [_serialize_risk(row) for row in rows]


def create_project_risk(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    _require_company_user(company_id=company_id, user_id=payload.get("owner_user_id"), allow_none=True)

    title = _normalize_text(payload.get("title"))
    if not title:
        raise ProjectManagementError("Missing field: title", status_code=400)
    severity = str(payload.get("severity") or "medium").strip().lower()
    status = str(payload.get("status") or "open").strip().lower()
    if severity not in RISK_SEVERITIES:
        raise ProjectManagementError("Invalid risk severity", status_code=400)
    if status not in RISK_STATUSES:
        raise ProjectManagementError("Invalid risk status", status_code=400)

    row = ProjectRisk(
        company_id=company_id,
        project_id=project_id,
        owner_user_id=payload.get("owner_user_id"),
        title=title,
        description=_normalize_text(payload.get("description")),
        severity=severity,
        status=status,
        mitigation_plan=_normalize_text(payload.get("mitigation_plan")),
        due_date=_parse_date(payload.get("due_date"), "due_date"),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_risk(row)


def update_project_risk(company_id: int, risk_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _get_risk(company_id=company_id, risk_id=risk_id)

    if "owner_user_id" in payload:
        _require_company_user(company_id=company_id, user_id=payload.get("owner_user_id"), allow_none=True)
        row.owner_user_id = payload.get("owner_user_id")
    if "title" in payload:
        title = _normalize_text(payload.get("title"))
        if not title:
            raise ProjectManagementError("title cannot be empty", status_code=400)
        row.title = title
    if "description" in payload:
        row.description = _normalize_text(payload.get("description"))
    if "severity" in payload:
        severity = str(payload.get("severity") or "").strip().lower()
        if severity not in RISK_SEVERITIES:
            raise ProjectManagementError("Invalid risk severity", status_code=400)
        row.severity = severity
    if "status" in payload:
        status = str(payload.get("status") or "").strip().lower()
        if status not in RISK_STATUSES:
            raise ProjectManagementError("Invalid risk status", status_code=400)
        row.status = status
    if "mitigation_plan" in payload:
        row.mitigation_plan = _normalize_text(payload.get("mitigation_plan"))
    if "due_date" in payload:
        row.due_date = _parse_date(payload.get("due_date"), "due_date")

    db.session.commit()
    return _serialize_risk(row)


def _serialize_change_order(row: ProjectChangeOrder) -> dict[str, Any]:
    requester = User.query.filter_by(id=row.requested_by_user_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "requested_by_user_id": row.requested_by_user_id,
        "requested_by": _serialize_user(requester),
        "reference": row.reference,
        "title": row.title,
        "description": row.description,
        "amount_delta": _serialize_amount(row.amount_delta) or 0.0,
        "delay_delta_days": row.delay_delta_days,
        "status": row.status,
        "effective_date": row.effective_date.isoformat() if row.effective_date else None,
    }


def list_project_change_orders(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = ProjectChangeOrder.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectChangeOrder.created_at.desc()).all()
    return [_serialize_change_order(row) for row in rows]


def create_project_change_order(company_id: int, project_id: int, requested_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    _require_company_user(company_id=company_id, user_id=requested_by_user_id)

    reference = _normalize_text(payload.get("reference"))
    title = _normalize_text(payload.get("title"))
    if not reference:
        raise ProjectManagementError("Missing field: reference", status_code=400)
    if not title:
        raise ProjectManagementError("Missing field: title", status_code=400)
    if ProjectChangeOrder.query.filter_by(company_id=company_id, project_id=project_id, reference=reference).first():
        raise ProjectManagementError("reference already exists for this project", status_code=409)

    status = str(payload.get("status") or "draft").strip().lower()
    if status not in CHANGE_ORDER_STATUSES:
        raise ProjectManagementError("Invalid change order status", status_code=400)

    row = ProjectChangeOrder(
        company_id=company_id,
        project_id=project_id,
        requested_by_user_id=requested_by_user_id,
        reference=reference,
        title=title,
        description=_normalize_text(payload.get("description")),
        amount_delta=_parse_decimal(payload.get("amount_delta", 0), "amount_delta") or Decimal("0"),
        delay_delta_days=_parse_non_negative_int(payload.get("delay_delta_days"), "delay_delta_days") or 0,
        status=status,
        effective_date=_parse_date(payload.get("effective_date"), "effective_date"),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_change_order(row)


def update_project_change_order(company_id: int, change_order_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _get_change_order(company_id=company_id, change_order_id=change_order_id)

    if "reference" in payload:
        reference = _normalize_text(payload.get("reference"))
        if not reference:
            raise ProjectManagementError("reference cannot be empty", status_code=400)
        existing = ProjectChangeOrder.query.filter_by(
            company_id=company_id,
            project_id=row.project_id,
            reference=reference,
        ).first()
        if existing and existing.id != row.id:
            raise ProjectManagementError("reference already exists for this project", status_code=409)
        row.reference = reference
    if "title" in payload:
        title = _normalize_text(payload.get("title"))
        if not title:
            raise ProjectManagementError("title cannot be empty", status_code=400)
        row.title = title
    if "description" in payload:
        row.description = _normalize_text(payload.get("description"))
    if "amount_delta" in payload:
        row.amount_delta = _parse_decimal(payload.get("amount_delta", 0), "amount_delta") or Decimal("0")
    if "delay_delta_days" in payload:
        row.delay_delta_days = _parse_non_negative_int(payload.get("delay_delta_days"), "delay_delta_days") or 0
    if "status" in payload:
        status = str(payload.get("status") or "").strip().lower()
        if status not in CHANGE_ORDER_STATUSES:
            raise ProjectManagementError("Invalid change order status", status_code=400)
        row.status = status
    if "effective_date" in payload:
        row.effective_date = _parse_date(payload.get("effective_date"), "effective_date")

    db.session.commit()
    return _serialize_change_order(row)


def delete_project_change_order(company_id: int, change_order_id: int) -> None:
    row = _get_change_order(company_id=company_id, change_order_id=change_order_id)
    db.session.delete(row)
    db.session.commit()


def _serialize_presence_rows(rows: list[AttendanceRecord]) -> list[dict[str, Any]]:
    if not rows:
        return []

    user_ids = sorted({row.user_id for row in rows})
    users_by_id = {user.id: user for user in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}

    grouped_by_user_week: dict[tuple[int, int, int], list[AttendanceRecord]] = {}
    for row in rows:
        if row.attendance_date is None:
            continue
        iso = row.attendance_date.isocalendar()
        key = (row.user_id, int(iso[0]), int(iso[1]))
        grouped_by_user_week.setdefault(key, []).append(row)

    weekly_totals: dict[tuple[int, int, int], int] = {}
    for key, grouped_rows in grouped_by_user_week.items():
        total_minutes = 0
        for grouped_row in grouped_rows:
            metrics = _compute_work_metrics(
                status=grouped_row.status,
                arrival_time=grouped_row.arrival_time,
                departure_time=grouped_row.departure_time,
            )
            total_minutes += metrics["worked_minutes"]
        weekly_totals[key] = total_minutes

    serialized: list[dict[str, Any]] = []
    for row in rows:
        worker = users_by_id.get(row.user_id)
        worker_name = _user_display_name(worker)
        metrics = _compute_work_metrics(
            status=row.status,
            arrival_time=row.arrival_time,
            departure_time=row.departure_time,
        )
        iso = row.attendance_date.isocalendar() if row.attendance_date else (None, None, None)
        week_key = (row.user_id, int(iso[0]), int(iso[1])) if row.attendance_date else None
        week_worked_minutes = weekly_totals.get(week_key, metrics["worked_minutes"]) if week_key else metrics["worked_minutes"]
        weekly_overtime_minutes = max(0, week_worked_minutes - WORK_MINUTES_PER_WEEK)
        weekly_missing_minutes = max(0, WORK_MINUTES_PER_WEEK - week_worked_minutes)

        entry_type = "absence" if row.status == "absent" else "overtime" if row.status == "overtime" else "presence"
        serialized.append(
            {
                "id": row.id,
                "company_id": row.company_id,
                "project_id": row.project_id,
                "worker_user_id": row.user_id,
                "worker_name": worker_name,
                "work_date": row.attendance_date.isoformat() if row.attendance_date else None,
                "entry_type": entry_type,
                "status": row.status,
                "arrival_time": _serialize_time_field(row.arrival_time),
                "departure_time": _serialize_time_field(row.departure_time),
                "hours_worked": _hours_from_minutes(metrics["worked_minutes"]),
                "extra_hours": _hours_from_minutes(metrics["daily_overtime_minutes"]),
                "missing_hours": _hours_from_minutes(metrics["daily_missing_minutes"]),
                "weekly_hours_worked": _hours_from_minutes(week_worked_minutes),
                "weekly_extra_hours": _hours_from_minutes(weekly_overtime_minutes),
                "weekly_missing_hours": _hours_from_minutes(weekly_missing_minutes),
                "notes": row.notes,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )

    return serialized


def list_project_presence_entries(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    rows = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.project_id == project_id,
        )
        .order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.created_at.desc())
        .all()
    )
    return _serialize_presence_rows(rows)


def create_project_presence_entry(company_id: int, project_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    worker_user_id = payload.get("worker_user_id") or payload.get("user_id")
    worker = _require_company_user(company_id=company_id, user_id=int(worker_user_id) if worker_user_id else None)

    work_date = _parse_date(payload.get("work_date") or payload.get("attendance_date"), "work_date")
    if work_date is None:
        raise ProjectManagementError("work_date is required", status_code=400)

    entry_type = str(payload.get("entry_type") or "presence").strip().lower()
    status_hint = str(payload.get("status") or "").strip().lower()
    status = "absent" if entry_type == "absence" or status_hint == "absent" else "present"
    arrival_time = _parse_time_field(payload.get("arrival_time"), "arrival_time")
    departure_time = _parse_time_field(payload.get("departure_time"), "departure_time")

    metrics = _compute_work_metrics(status=status, arrival_time=arrival_time, departure_time=departure_time, strict=True)

    duplicate = AttendanceRecord.query.filter_by(
        company_id=company_id,
        user_id=worker.id,
        attendance_date=work_date,
    ).first()
    if duplicate is not None:
        raise ProjectManagementError("An attendance record already exists for this employee and date", status_code=409)

    row = AttendanceRecord(
        company_id=company_id,
        user_id=worker.id,
        project_id=project_id,
        attendance_date=work_date,
        status=metrics["status"],
        arrival_time=None if metrics["status"] == "absent" else arrival_time,
        departure_time=None if metrics["status"] == "absent" else departure_time,
        minutes_late=0,
        overtime_minutes=metrics["daily_overtime_minutes"],
        notes=_normalize_text(payload.get("notes")),
        source="manager",
        created_by_user_id=actor_user_id,
        updated_by_user_id=actor_user_id,
    )
    db.session.add(row)
    db.session.commit()

    return _serialize_presence_rows([row])[0]


def update_project_presence_entry(company_id: int, presence_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _get_presence_record(company_id=company_id, presence_id=presence_id)
    _get_project(company_id=company_id, project_id=row.project_id)

    worker_user_id = payload.get("worker_user_id") or payload.get("user_id")
    worker_id = int(worker_user_id) if worker_user_id is not None else row.user_id
    worker = _require_company_user(company_id=company_id, user_id=worker_id)

    work_date = _parse_date(payload.get("work_date") or payload.get("attendance_date"), "work_date") if (
        "work_date" in payload or "attendance_date" in payload
    ) else row.attendance_date
    if work_date is None:
        raise ProjectManagementError("work_date is required", status_code=400)

    entry_type = str(payload.get("entry_type") or ("absence" if row.status == "absent" else "presence")).strip().lower()
    status_hint = str(payload.get("status") or row.status or "").strip().lower()
    status = "absent" if entry_type == "absence" or status_hint == "absent" else "present"

    if "arrival_time" in payload:
        arrival_time = _parse_time_field(payload.get("arrival_time"), "arrival_time")
    else:
        arrival_time = row.arrival_time
    if "departure_time" in payload:
        departure_time = _parse_time_field(payload.get("departure_time"), "departure_time")
    else:
        departure_time = row.departure_time

    metrics = _compute_work_metrics(status=status, arrival_time=arrival_time, departure_time=departure_time, strict=True)

    duplicate = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.user_id == worker.id,
            AttendanceRecord.attendance_date == work_date,
            AttendanceRecord.id != row.id,
        ).first()
    )
    if duplicate is not None:
        raise ProjectManagementError("Another attendance record already exists for this employee and date", status_code=409)

    row.user_id = worker.id
    row.attendance_date = work_date
    row.status = metrics["status"]
    row.arrival_time = None if metrics["status"] == "absent" else arrival_time
    row.departure_time = None if metrics["status"] == "absent" else departure_time
    row.minutes_late = 0
    row.overtime_minutes = metrics["daily_overtime_minutes"]
    if "notes" in payload:
        row.notes = _normalize_text(payload.get("notes"))
    row.updated_by_user_id = actor_user_id

    db.session.commit()
    return _serialize_presence_rows([row])[0]


def delete_project_presence_entry(company_id: int, presence_id: int) -> None:
    row = _get_presence_record(company_id=company_id, presence_id=presence_id)
    db.session.delete(row)
    db.session.commit()


def _serialize_budget_line(line: ProjectBudgetLine) -> dict[str, Any]:
    planned = _serialize_amount(line.planned_amount) or 0.0
    actual = _serialize_amount(line.actual_amount) or 0.0
    return {
        "id": line.id,
        "company_id": line.company_id,
        "budget_id": line.budget_id,
        "account_id": line.account_id,
        "category": line.category,
        "label": line.label,
        "planned_amount": planned,
        "committed_amount": _serialize_amount(line.committed_amount) or 0.0,
        "actual_amount": actual,
        "variance_amount": round(planned - actual, 2),
    }


def _serialize_budget(row: ProjectBudget, lines: list[ProjectBudgetLine] | None = None) -> dict[str, Any]:
    lines = lines if lines is not None else ProjectBudgetLine.query.filter_by(company_id=row.company_id, budget_id=row.id).all()
    serialized_lines = [_serialize_budget_line(line) for line in lines]
    actual_total = round(sum(item["actual_amount"] for item in serialized_lines), 2)
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "version_label": row.version_label,
        "status": row.status,
        "total_budget": _serialize_amount(row.total_budget) or 0.0,
        "notes": row.notes,
        "lines": serialized_lines,
        "variance_amount": round((_serialize_amount(row.total_budget) or 0.0) - actual_total, 2),
    }


def list_project_budgets(company_id: int, project_id: int) -> list[dict[str, Any]]:
    _get_project(company_id=company_id, project_id=project_id)
    budgets = (
        ProjectBudget.query.filter(
            ProjectBudget.company_id == company_id,
            ProjectBudget.project_id == project_id,
            ProjectBudget.deleted_at.is_(None),
        )
        .order_by(ProjectBudget.created_at.desc())
        .all()
    )
    budget_ids = [row.id for row in budgets] or [-1]
    lines = ProjectBudgetLine.query.filter(ProjectBudgetLine.company_id == company_id, ProjectBudgetLine.budget_id.in_(budget_ids)).all()
    lines_by_budget: dict[int, list[ProjectBudgetLine]] = {}
    for line in lines:
        lines_by_budget.setdefault(line.budget_id, []).append(line)
    return [_serialize_budget(row, lines_by_budget.get(row.id, [])) for row in budgets]


def create_project_budget(company_id: int, project_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _get_project(company_id=company_id, project_id=project_id)
    version_label = _normalize_text(payload.get("version_label"))
    if not version_label:
        raise ProjectManagementError("Missing field: version_label", status_code=400)
    if ProjectBudget.query.filter_by(company_id=company_id, project_id=project_id, version_label=version_label).first():
        raise ProjectManagementError("Budget version already exists", status_code=409)

    status = str(payload.get("status") or "draft").strip().lower()
    if status not in {"draft", "approved", "archived"}:
        raise ProjectManagementError("Invalid budget status", status_code=400)

    row = ProjectBudget(
        company_id=company_id,
        project_id=project_id,
        version_label=version_label,
        status=status,
        total_budget=_parse_decimal(payload.get("total_budget", 0), "total_budget", minimum=Decimal("0")) or Decimal("0"),
        notes=_normalize_text(payload.get("notes")),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_budget(row, [])


def create_project_budget_line(company_id: int, budget_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    budget = _get_budget(company_id=company_id, budget_id=budget_id)
    category = _normalize_text(payload.get("category"))
    label = _normalize_text(payload.get("label"))
    if not category:
        raise ProjectManagementError("Missing field: category", status_code=400)
    if not label:
        raise ProjectManagementError("Missing field: label", status_code=400)

    row = ProjectBudgetLine(
        company_id=company_id,
        budget_id=budget.id,
        account_id=payload.get("account_id"),
        category=category,
        label=label,
        planned_amount=_parse_decimal(payload.get("planned_amount"), "planned_amount", minimum=Decimal("0")) or Decimal("0"),
        committed_amount=_parse_decimal(payload.get("committed_amount", 0), "committed_amount", minimum=Decimal("0")) or Decimal("0"),
        actual_amount=_parse_decimal(payload.get("actual_amount", 0), "actual_amount", minimum=Decimal("0")) or Decimal("0"),
    )
    db.session.add(row)
    db.session.commit()

    total_planned = sum(
        float(line.planned_amount)
        for line in ProjectBudgetLine.query.filter_by(company_id=company_id, budget_id=budget.id).all()
    )
    budget.total_budget = Decimal(str(round(total_planned, 2)))
    db.session.commit()
    return _serialize_budget_line(row)


def _financial_summary_for_project(company_id: int, project_id: int, *, project: Project | None = None) -> dict[str, Any]:
    project = project or _get_project(company_id=company_id, project_id=project_id)
    legacy_entries = FinanceEntry.query.filter(
        FinanceEntry.company_id == company_id,
        FinanceEntry.project_id == project_id,
        FinanceEntry.deleted_at.is_(None),
    ).all()
    approved_expenses = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.project_id == project_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.approval_status == "approved",
    ).all()
    revenues_records = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.project_id == project_id,
        RevenueRecord.deleted_at.is_(None),
    ).all()
    invoices = Invoice.query.filter(
        Invoice.company_id == company_id,
        Invoice.project_id == project_id,
        Invoice.deleted_at.is_(None),
    ).all()
    budgets = (
        ProjectBudget.query.filter(
            ProjectBudget.company_id == company_id,
            ProjectBudget.project_id == project_id,
            ProjectBudget.deleted_at.is_(None),
        )
        .order_by(ProjectBudget.created_at.desc())
        .all()
    )

    expenses = round(
        sum(float(row.amount) for row in approved_expenses)
        + sum(float(row.amount) for row in legacy_entries if row.entry_type == "expense"),
        2,
    )
    revenues = round(
        sum(float(row.amount) for row in revenues_records)
        + sum(float(row.amount) for row in legacy_entries if row.entry_type == "revenue"),
        2,
    )
    invoiced = round(sum(float(row.amount_total) for row in invoices), 2)
    collected = round(sum(float(row.amount_paid) for row in invoices), 2)
    outstanding = round(sum(max(float(row.amount_total) - float(row.amount_paid), 0) for row in invoices), 2)

    approved_budget = next((row for row in budgets if row.status == "approved"), None)
    latest_budget = budgets[0] if budgets else None
    budget_amount = (
        float(approved_budget.total_budget)
        if approved_budget is not None
        else float(latest_budget.total_budget)
        if latest_budget is not None
        else float(project.budget_amount)
        if project.budget_amount is not None
        else 0.0
    )
    consumed = round((expenses / budget_amount) * 100, 2) if budget_amount else 0.0

    return {
        "budget_amount": round(budget_amount, 2),
        "expenses": expenses,
        "revenues": revenues,
        "margin": round(revenues - expenses, 2),
        "invoiced": invoiced,
        "collected": collected,
        "outstanding": outstanding,
        "budget_consumed_percent": consumed,
        "variance_amount": round(budget_amount - expenses, 2),
    }


def _serialize_project_expense_row(row: ExpenseRecord) -> dict[str, Any]:
    partner = BusinessPartner.query.filter_by(id=row.partner_id).first() if row.partner_id else None
    return {
        "id": row.id,
        "expense_number": row.expense_number,
        "category": row.category,
        "amount": _serialize_amount(row.amount) or 0.0,
        "expense_date": row.expense_date.isoformat() if row.expense_date else None,
        "description": row.description,
        "approval_status": row.approval_status,
        "payment_status": row.payment_status,
        "paid_amount": _serialize_amount(row.paid_amount) or 0.0,
        "outstanding_amount": round(max(float(row.amount or 0) - float(row.paid_amount or 0), 0.0), 2),
        "partner_name": partner.legal_name if partner else None,
        "partner_contact_name": partner.contact_name if partner else None,
        "partner_phone": partner.phone if partner else None,
    }


def _serialize_project_revenue_row(row: RevenueRecord) -> dict[str, Any]:
    partner = BusinessPartner.query.filter_by(id=row.partner_id).first() if row.partner_id else None
    return {
        "id": row.id,
        "revenue_number": row.revenue_number,
        "revenue_type": row.revenue_type,
        "amount": _serialize_amount(row.amount) or 0.0,
        "revenue_date": row.revenue_date.isoformat() if row.revenue_date else None,
        "description": row.description,
        "collection_status": row.collection_status,
        "collected_amount": _serialize_amount(row.collected_amount) or 0.0,
        "partner_name": partner.legal_name if partner else None,
        "partner_contact_name": partner.contact_name if partner else None,
        "partner_phone": partner.phone if partner else None,
    }


def _serialize_project_invoice_row(row: Invoice) -> dict[str, Any]:
    balance_amount = round(max(float(row.amount_total or 0) - float(row.amount_paid or 0), 0.0), 2)
    return {
        "id": row.id,
        "invoice_number": row.invoice_number,
        "customer_name": row.customer_name,
        "amount_total": _serialize_amount(row.amount_total) or 0.0,
        "amount_paid": _serialize_amount(row.amount_paid) or 0.0,
        "balance_amount": balance_amount,
        "status": row.status,
        "issued_on": row.issued_on.isoformat() if row.issued_on else None,
        "due_on": row.due_on.isoformat() if row.due_on else None,
        "paid_on": row.paid_on.isoformat() if row.paid_on else None,
        "notes": row.notes,
    }


def _build_project_finance_detail_items(company_id: int, project_id: int) -> dict[str, list[dict[str, Any]]]:
    approved_expenses = (
        ExpenseRecord.query.filter(
            ExpenseRecord.company_id == company_id,
            ExpenseRecord.project_id == project_id,
            ExpenseRecord.deleted_at.is_(None),
            ExpenseRecord.approval_status == "approved",
        )
        .order_by(ExpenseRecord.expense_date.desc(), ExpenseRecord.created_at.desc())
        .all()
    )
    revenues = (
        RevenueRecord.query.filter(
            RevenueRecord.company_id == company_id,
            RevenueRecord.project_id == project_id,
            RevenueRecord.deleted_at.is_(None),
        )
        .order_by(RevenueRecord.revenue_date.desc(), RevenueRecord.created_at.desc())
        .all()
    )
    invoices = (
        Invoice.query.filter(
            Invoice.company_id == company_id,
            Invoice.project_id == project_id,
            Invoice.deleted_at.is_(None),
        )
        .order_by(Invoice.issued_on.desc(), Invoice.created_at.desc())
        .all()
    )

    expense_items = [_serialize_project_expense_row(row) for row in approved_expenses]
    revenue_items = [_serialize_project_revenue_row(row) for row in revenues]
    invoice_items = [_serialize_project_invoice_row(row) for row in invoices]

    return {
        "expense_items": expense_items[:10],
        "revenue_items": revenue_items[:10],
        "unpaid_invoice_items": [item for item in invoice_items if item["balance_amount"] > 0][:10],
        "debt_items": [item for item in expense_items if item["outstanding_amount"] > 0][:10],
    }


def _resource_summary_for_project(company_id: int, project_id: int) -> dict[str, Any]:
    allocations = ProjectStockAllocation.query.filter_by(company_id=company_id, project_id=project_id).all()
    item_ids = [row.item_id for row in allocations] or [-1]
    items = InventoryItem.query.filter(InventoryItem.id.in_(item_ids)).all()
    items_by_id = {row.id: row for row in items}

    materials = 0.0
    equipment = 0.0
    consumables = 0.0
    by_category: dict[str, float] = {}
    for allocation in allocations:
        item = items_by_id.get(allocation.item_id)
        category = item.category if item is not None else "unknown"
        quantity = float(allocation.quantity_allocated)
        by_category[category] = round(by_category.get(category, 0.0) + quantity, 2)
        if category == "material":
            materials += quantity
        elif category == "equipment":
            equipment += quantity
        elif category == "consumable":
            consumables += quantity

    return {
        "allocations_count": len(allocations),
        "materials_quantity": round(materials, 2),
        "equipment_quantity": round(equipment, 2),
        "consumables_quantity": round(consumables, 2),
        "by_category": by_category,
    }


def _build_project_alerts(project: Project, tasks: list[ProjectTask], risks: list[ProjectRisk], financials: dict[str, Any]) -> list[dict[str, Any]]:
    today = date.today()
    threshold = today + timedelta(days=ALERT_LOOKAHEAD_DAYS)
    alerts: list[dict[str, Any]] = []

    overdue_tasks = [task for task in tasks if task.status not in TASK_COMPLETED_STATUSES and _task_deadline(task) and _task_deadline(task) < today]
    if overdue_tasks:
        alerts.append({"code": "overdue_tasks", "severity": "warning", "value": len(overdue_tasks)})
    if financials["budget_amount"] and financials["expenses"] > financials["budget_amount"]:
        alerts.append({"code": "budget_overrun", "severity": "danger", "value": round(financials["expenses"] - financials["budget_amount"], 2)})
    if project.submission_date and today <= project.submission_date <= threshold and project.status in {"draft", "preparation"}:
        alerts.append({"code": "submission_deadline", "severity": "warning", "value": project.submission_date.isoformat()})
    if project.end_date and today <= project.end_date <= threshold and project.status not in TERMINAL_PROJECT_STATUSES:
        alerts.append({"code": "project_end_deadline", "severity": "info", "value": project.end_date.isoformat()})
    critical_risks = [risk for risk in risks if risk.status in {"open", "monitoring"} and risk.severity == "critical"]
    if critical_risks:
        alerts.append({"code": "critical_risks", "severity": "danger", "value": len(critical_risks)})
    return alerts


def _project_financial_revenue_basis(project: Project, financials: dict[str, Any]) -> float:
    revenues = float(financials.get("revenues") or 0)
    if revenues:
        return revenues
    return float(project.contract_amount or 0)


def _build_profitability_cockpit_items(projects: list[Project], financials_by_project_id: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for project in projects:
        financials = financials_by_project_id.get(project.id, {})
        initial_budget = float(project.budget_amount or 0)
        steering_budget = float(financials.get("budget_amount") or initial_budget)
        actual_cost = float(project.final_cost_amount or financials.get("expenses") or 0)
        revenue_basis = _project_financial_revenue_basis(project, financials)
        budget_variance = round(initial_budget - actual_cost, 2)
        final_margin = round(revenue_basis - actual_cost, 2)
        consumed_percent = float(financials.get("budget_consumed_percent") or 0)
        progress_percent = float(project.progress_percent or project.physical_progress_percent or 0)
        budget_progress_gap = round(consumed_percent - progress_percent, 2)

        items.append(
            {
                "project_id": project.id,
                "project_code": project.code,
                "project_name": project.name,
                "status": project.status,
                "initial_budget": round(initial_budget, 2),
                "steering_budget": round(steering_budget, 2),
                "actual_cost": round(actual_cost, 2),
                "revenue_basis": round(revenue_basis, 2),
                "budget_variance": budget_variance,
                "final_margin": final_margin,
                "budget_consumed_percent": round(consumed_percent, 2),
                "progress_percent": round(progress_percent, 2),
                "budget_progress_gap": budget_progress_gap,
                "health": "danger"
                if budget_variance < 0 or final_margin < 0
                else "warning"
                if budget_progress_gap > BUDGET_PROGRESS_ALERT_THRESHOLD
                else "success",
            }
        )

    return sorted(
        items,
        key=lambda row: (
            0 if row["health"] == "danger" else 1 if row["health"] == "warning" else 2,
            row["budget_variance"],
            -row["budget_progress_gap"],
        ),
    )


def _build_budget_progress_alert_items(projects: list[Project], financials_by_project_id: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []

    for project in projects:
        if project.status in TERMINAL_PROJECT_STATUSES:
            continue

        financials = financials_by_project_id.get(project.id, {})
        consumed_percent = float(financials.get("budget_consumed_percent") or 0)
        progress_percent = float(project.progress_percent or project.physical_progress_percent or 0)
        gap = round(consumed_percent - progress_percent, 2)

        if gap <= BUDGET_PROGRESS_ALERT_THRESHOLD:
            continue

        alerts.append(
            {
                "project_id": project.id,
                "project_code": project.code,
                "project_name": project.name,
                "severity": "danger" if gap >= BUDGET_PROGRESS_ALERT_THRESHOLD * 2 else "warning",
                "progress_percent": round(progress_percent, 2),
                "budget_consumed_percent": round(consumed_percent, 2),
                "gap_percent": gap,
                "budget_amount": round(float(financials.get("budget_amount") or project.budget_amount or 0), 2),
                "expenses": round(float(financials.get("expenses") or 0), 2),
            }
        )

    return sorted(alerts, key=lambda row: row["gap_percent"], reverse=True)


def _active_assignment_project_payload(assignment: ProjectAssignment, project: Project | None) -> dict[str, Any]:
    return {
        "assignment_id": assignment.id,
        "project_id": assignment.project_id,
        "project_code": project.code if project else None,
        "project_name": project.name if project else None,
        "project_status": project.status if project else None,
        "project_role": assignment.project_role,
        "responsibility": assignment.responsibility,
        "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
        "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
    }


def _build_capacity_cockpit(
    company_id: int,
    assignments: list[ProjectAssignment],
    projects_by_id: dict[int, Project],
    *,
    scoped_project_ids: set[int],
) -> dict[str, Any]:
    assignments_by_user_id: dict[int, list[ProjectAssignment]] = {}
    for assignment in assignments:
        assignments_by_user_id.setdefault(assignment.user_id, []).append(assignment)

    users = User.query.filter(
        User.company_id == company_id,
        User.deleted_at.is_(None),
        User.is_active.is_(True),
    ).all()

    if scoped_project_ids:
        visible_user_ids = set(assignments_by_user_id)
        users = [user for user in users if user.id in visible_user_ids]

    rows: list[dict[str, Any]] = []
    for user in users:
        user_assignments = assignments_by_user_id.get(user.id, [])
        active_count = len(user_assignments)
        if active_count > RECOMMENDED_ACTIVE_PROJECTS_PER_PERSON:
            status = "overloaded"
        elif active_count == RECOMMENDED_ACTIVE_PROJECTS_PER_PERSON:
            status = "busy"
        elif active_count == 1:
            status = "allocated"
        else:
            status = "available"

        rows.append(
            {
                "user_id": user.id,
                "full_name": _user_display_name(user),
                "email": user.email,
                "job_title": user.job_title,
                "department": user.department,
                "active_assignments": active_count,
                "recommended_capacity": RECOMMENDED_ACTIVE_PROJECTS_PER_PERSON,
                "load_percent": round((active_count / RECOMMENDED_ACTIVE_PROJECTS_PER_PERSON) * 100, 2),
                "status": status,
                "assignments": [
                    _active_assignment_project_payload(assignment, projects_by_id.get(assignment.project_id))
                    for assignment in user_assignments
                ],
            }
        )

    status_rank = {"overloaded": 0, "available": 1, "busy": 2, "allocated": 3}
    rows = sorted(rows, key=lambda row: (status_rank.get(row["status"], 4), -row["active_assignments"], row["full_name"] or ""))
    summary = {
        "overloaded": len([row for row in rows if row["status"] == "overloaded"]),
        "available": len([row for row in rows if row["status"] == "available"]),
        "busy": len([row for row in rows if row["status"] == "busy"]),
        "allocated": len([row for row in rows if row["status"] == "allocated"]),
    }

    return {"count": len(rows), "summary": summary, "items": rows[:16]}


def _document_matches_reception_keywords(document: ProjectDocument) -> bool:
    searchable_text = f"{document.title or ''} {document.notes or ''}".lower()
    return "reception" in searchable_text


def _validation_date_payload(value: date | datetime | None) -> str | None:
    return value.isoformat() if value else None


def _validation_project_payload(projects_by_id: dict[int, Project], project_id: int) -> dict[str, Any]:
    project = projects_by_id.get(project_id)
    return {
        "project_id": project_id,
        "project_code": project.code if project else None,
        "project_name": project.name if project else None,
    }


def _build_validation_queue_cockpit(company_id: int, projects_by_id: dict[int, Project], scoped_project_ids: set[int]) -> dict[str, Any]:
    project_ids = set(projects_by_id)

    documents = ProjectDocument.query.filter(ProjectDocument.company_id == company_id).all()
    change_orders = ProjectChangeOrder.query.filter(ProjectChangeOrder.company_id == company_id).all()
    reports = ProjectReport.query.filter(ProjectReport.company_id == company_id).all()
    invoices = Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None)).all()

    if scoped_project_ids:
        project_ids = project_ids & scoped_project_ids

    documents = [row for row in documents if row.project_id in project_ids]
    change_orders = [row for row in change_orders if row.project_id in project_ids]
    reports = [row for row in reports if row.project_id in project_ids]
    invoices = [row for row in invoices if row.project_id in project_ids]

    queue: list[dict[str, Any]] = []
    for document in documents:
        if document.category not in {"pv", "invoice", "report"} and not _document_matches_reception_keywords(document):
            continue

        stage = "validation"
        queue.append(
            {
                "id": f"document-{document.id}",
                "source_type": "document",
                "document_type": document.category,
                "title": document.title,
                "status": "pending_review",
                "stage": stage,
                "severity": "warning",
                "date": _validation_date_payload(document.document_date or document.created_at),
                **_validation_project_payload(projects_by_id, document.project_id),
            }
        )

    for report in reports:
        if report.report_type != "final" and not report.attachment_url:
            continue

        queue.append(
            {
                "id": f"report-{report.id}",
                "source_type": "report",
                "document_type": report.report_type,
                "title": report.summary,
                "status": "pending_review",
                "stage": "validation",
                "severity": "warning",
                "date": _validation_date_payload(report.report_date),
                **_validation_project_payload(projects_by_id, report.project_id),
            }
        )

    for change_order in change_orders:
        if change_order.status in {"implemented"}:
            continue

        queue.append(
            {
                "id": f"change-order-{change_order.id}",
                "source_type": "change_order",
                "document_type": "change_order",
                "title": change_order.title,
                "reference": change_order.reference,
                "status": change_order.status,
                "stage": "qualification" if change_order.status == "draft" else "execution" if change_order.status == "approved" else "validation",
                "severity": "danger" if change_order.status == "rejected" else "info" if change_order.status == "approved" else "warning",
                "date": _validation_date_payload(change_order.effective_date or change_order.created_at),
                **_validation_project_payload(projects_by_id, change_order.project_id),
            }
        )

    today = date.today()
    for invoice in invoices:
        invoice_status = invoice.status
        if invoice.status not in {"draft", "sent", "partially_paid", "overdue"}:
            continue
        if invoice.status == "sent" and invoice.due_on and invoice.due_on < today and invoice.amount_paid < invoice.amount_total:
            invoice_status = "overdue"

        queue.append(
            {
                "id": f"invoice-{invoice.id}",
                "source_type": "invoice",
                "document_type": "invoice",
                "title": invoice.invoice_number,
                "status": invoice_status,
                "stage": "qualification" if invoice_status == "draft" else "validation" if invoice_status == "overdue" else "execution",
                "severity": "danger" if invoice_status == "overdue" else "warning" if invoice_status == "draft" else "info",
                "date": _validation_date_payload(invoice.issued_on),
                **_validation_project_payload(projects_by_id, invoice.project_id),
            }
        )

    severity_rank = {"danger": 0, "warning": 1, "info": 2}
    queue = sorted(queue, key=lambda row: (severity_rank.get(row["severity"], 3), row.get("date") or ""), reverse=False)
    summary: dict[str, int] = {}
    for row in queue:
        summary[row["stage"]] = summary.get(row["stage"], 0) + 1

    return {
        "count": len(queue),
        "summary": summary,
        "items": queue[:16],
    }


def _build_recent_documents(company_id: int, projects_by_id: dict[int, Project], scoped_project_ids: set[int]) -> dict[str, Any]:
    project_ids = set(projects_by_id)
    if scoped_project_ids:
        project_ids = project_ids & scoped_project_ids

    if not project_ids:
        return {"count": 0, "items": []}

    project_id_list = list(project_ids)
    documents = (
        ProjectDocument.query.filter(
            ProjectDocument.company_id == company_id,
            ProjectDocument.project_id.in_(project_id_list),
        )
        .order_by(ProjectDocument.created_at.desc())
        .limit(120)
        .all()
    )
    reports = (
        ProjectReport.query.filter(
            ProjectReport.company_id == company_id,
            ProjectReport.project_id.in_(project_id_list),
        )
        .order_by(ProjectReport.created_at.desc())
        .limit(120)
        .all()
    )
    change_orders = (
        ProjectChangeOrder.query.filter(
            ProjectChangeOrder.company_id == company_id,
            ProjectChangeOrder.project_id.in_(project_id_list),
        )
        .order_by(ProjectChangeOrder.created_at.desc())
        .limit(120)
        .all()
    )

    rows: list[dict[str, Any]] = []
    for document in documents:
        uploader = User.query.filter_by(id=document.uploaded_by_user_id).first()
        rows.append(
            {
                "id": f"document-{document.id}",
                "source_type": "document",
                "document_type": document.category,
                "reference": f"DOC-{document.id}",
                "title": document.title,
                "status": "available",
                "document_date": _validation_date_payload(document.document_date),
                "added_at": _validation_date_payload(document.created_at),
                "uploaded_by": _serialize_user(uploader),
                "file_url": document.file_url,
                "notes": document.notes,
                **_validation_project_payload(projects_by_id, document.project_id),
            }
        )

    for report in reports:
        author = User.query.filter_by(id=report.author_user_id).first()
        rows.append(
            {
                "id": f"report-{report.id}",
                "source_type": "report",
                "document_type": "report",
                "reference": f"RAP-{report.id}",
                "title": report.summary,
                "status": report.report_type,
                "document_date": _validation_date_payload(report.report_date),
                "added_at": _validation_date_payload(report.created_at),
                "uploaded_by": _serialize_user(author),
                "file_url": report.attachment_url,
                "notes": report.observations,
                **_validation_project_payload(projects_by_id, report.project_id),
            }
        )

    for change_order in change_orders:
        requester = User.query.filter_by(id=change_order.requested_by_user_id).first()
        rows.append(
            {
                "id": f"change-order-{change_order.id}",
                "source_type": "change_order",
                "document_type": "change_order",
                "reference": change_order.reference,
                "title": change_order.title,
                "status": change_order.status,
                "document_date": _validation_date_payload(change_order.effective_date),
                "added_at": _validation_date_payload(change_order.created_at),
                "uploaded_by": _serialize_user(requester),
                "file_url": None,
                "notes": change_order.description,
                "amount_delta": _serialize_amount(change_order.amount_delta) or 0.0,
                "delay_delta_days": change_order.delay_delta_days,
                **_validation_project_payload(projects_by_id, change_order.project_id),
            }
        )

    rows = sorted(rows, key=lambda row: (row.get("added_at") or "", row.get("document_date") or "", row.get("id") or ""), reverse=True)
    return {"count": len(rows), "items": rows[:160]}


def get_project_workspace(
    company_id: int,
    project_id: int,
    *,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
) -> dict[str, Any]:
    _enforce_project_scope(company_id, project_id, user_id=user_id, role_codes=role_codes)
    project = _get_project(company_id=company_id, project_id=project_id)
    tasks = ProjectTask.query.filter(ProjectTask.company_id == company_id, ProjectTask.project_id == project_id, ProjectTask.deleted_at.is_(None)).all()
    reports = ProjectReport.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectReport.report_date.desc()).all()
    assignments = ProjectAssignment.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectAssignment.created_at.asc()).all()
    documents = ProjectDocument.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectDocument.created_at.desc()).all()
    risks = ProjectRisk.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectRisk.created_at.desc()).all()
    change_orders = ProjectChangeOrder.query.filter_by(company_id=company_id, project_id=project_id).order_by(ProjectChangeOrder.created_at.desc()).all()
    presence_rows = (
        AttendanceRecord.query.filter_by(company_id=company_id, project_id=project_id)
        .order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.created_at.desc())
        .all()
    )

    financials = _financial_summary_for_project(company_id=company_id, project_id=project_id, project=project)
    financial_detail_items = _build_project_finance_detail_items(company_id=company_id, project_id=project_id)
    resources = _resource_summary_for_project(company_id=company_id, project_id=project_id)
    task_items = [_serialize_task(task) for task in tasks]
    overdue_tasks = [task for task in tasks if task.status not in TASK_COMPLETED_STATUSES and _task_deadline(task) and _task_deadline(task) < date.today()]

    return {
        "project": _serialize_project(project),
        "kpis": {
            "assignments_count": len(assignments),
            "tasks_total": len(tasks),
            "tasks_completed": len([task for task in tasks if task.status in TASK_COMPLETED_STATUSES]),
            "tasks_blocked": len([task for task in tasks if task.status == "blocked"]),
            "overdue_tasks": len(overdue_tasks),
            "reports_count": len(reports),
            "documents_count": len(documents),
            "open_risks": len([risk for risk in risks if risk.status in {"open", "monitoring"}]),
            "change_orders_count": len(change_orders),
        },
        "finance": {
            **financials,
            **financial_detail_items,
        },
        "resources": resources,
        "assignments": {"count": len(assignments), "items": [_serialize_assignment(row) for row in assignments]},
        "tasks": {
            "count": len(task_items),
            "items": task_items,
            "gantt": [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "task_type": row["task_type"],
                    "start_date": row["start_date"],
                    "end_date": row["end_date"] or row["due_date"],
                    "status": row["status"],
                    "progress_percent": row["progress_percent"],
                }
                for row in task_items
                if row["start_date"] or row["end_date"] or row["due_date"]
            ],
        },
        "reports": {"count": len(reports), "items": [_serialize_report(row) for row in reports[:10]]},
        "documents": {"count": len(documents), "items": [_serialize_document(row) for row in documents[:10]]},
        "risks": {"count": len(risks), "items": [_serialize_risk(row) for row in risks[:10]]},
        "change_orders": {"count": len(change_orders), "items": [_serialize_change_order(row) for row in change_orders[:10]]},
        "presence_entries": _serialize_presence_rows(presence_rows)[:120],
        "budgets": {"count": len(list_project_budgets(company_id=company_id, project_id=project_id)), "items": list_project_budgets(company_id=company_id, project_id=project_id)},
        "alerts": _build_project_alerts(project=project, tasks=tasks, risks=risks, financials=financials),
    }


def project_dashboard(
    company_id: int,
    *,
    user_id: int | None = None,
    role_codes: list[str] | set[str] | None = None,
) -> dict[str, Any]:
    scoped_project_ids = set(_resolve_worker_project_ids(company_id, user_id=user_id, role_codes=role_codes)) if _is_worker_scope(company_id, user_id, role_codes) else set()
    projects = build_projects_query(company_id=company_id, include_archived=False, user_id=user_id, role_codes=role_codes).all()
    tasks = ProjectTask.query.filter(ProjectTask.company_id == company_id, ProjectTask.deleted_at.is_(None)).all()
    risks = ProjectRisk.query.filter(ProjectRisk.company_id == company_id, ProjectRisk.status.in_(["open", "monitoring"])).all()
    finance_entries = FinanceEntry.query.filter(
        FinanceEntry.company_id == company_id,
        FinanceEntry.deleted_at.is_(None),
        FinanceEntry.project_id.isnot(None),
    ).all()
    approved_expenses = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.project_id.isnot(None),
        ExpenseRecord.approval_status == "approved",
    ).all()
    revenues = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
        RevenueRecord.project_id.isnot(None),
    ).all()
    assignments = ProjectAssignment.query.filter_by(company_id=company_id, is_active=True).all()

    if scoped_project_ids:
        tasks = [task for task in tasks if task.project_id in scoped_project_ids]
        risks = [risk for risk in risks if risk.project_id in scoped_project_ids]
        finance_entries = [row for row in finance_entries if row.project_id in scoped_project_ids]
        approved_expenses = [row for row in approved_expenses if row.project_id in scoped_project_ids]
        revenues = [row for row in revenues if row.project_id in scoped_project_ids]
        assignments = [row for row in assignments if row.project_id in scoped_project_ids]

    expenses_total = round(
        sum(float(row.amount) for row in approved_expenses)
        + sum(float(row.amount) for row in finance_entries if row.entry_type == "expense"),
        2,
    )
    revenues_total = round(
        sum(float(row.amount) for row in revenues)
        + sum(float(row.amount) for row in finance_entries if row.entry_type == "revenue"),
        2,
    )
    budget_total = round(sum(float(project.budget_amount or 0) for project in projects), 2)
    delayed_projects = [project for project in projects if project.end_date and project.end_date < date.today() and project.status not in TERMINAL_PROJECT_STATUSES]
    overdue_tasks = [task for task in tasks if task.status not in TASK_COMPLETED_STATUSES and _task_deadline(task) and _task_deadline(task) < date.today()]
    upcoming_submissions = [
        project
        for project in projects
        if project.submission_date and date.today() <= project.submission_date <= date.today() + timedelta(days=ALERT_LOOKAHEAD_DAYS)
    ]
    projects_by_id = {project.id: project for project in projects}
    financials_by_project_id: dict[int, dict[str, Any]] = {}

    def financials_for(project: Project) -> dict[str, Any]:
        if project.id not in financials_by_project_id:
            financials_by_project_id[project.id] = _financial_summary_for_project(
                company_id=company_id,
                project_id=project.id,
                project=project,
            )
        return financials_by_project_id[project.id]

    items = []
    for project in projects[:8]:
        financials = financials_for(project)
        serialized = _serialize_project(project)
        serialized.update(
            {
                "overdue_tasks": len([task for task in tasks if task.project_id == project.id and task.status not in TASK_COMPLETED_STATUSES and _task_deadline(task) and _task_deadline(task) < date.today()]),
                "open_risks": len([risk for risk in risks if risk.project_id == project.id]),
                "expenses": financials["expenses"],
                "revenues": financials["revenues"],
                "budget_consumed_percent": financials["budget_consumed_percent"],
            }
        )
        items.append(serialized)

    for project in projects:
        financials_for(project)

    profitability_items = _build_profitability_cockpit_items(projects, financials_by_project_id)
    budget_progress_alert_items = _build_budget_progress_alert_items(projects, financials_by_project_id)
    capacity_cockpit = _build_capacity_cockpit(
        company_id=company_id,
        assignments=assignments,
        projects_by_id=projects_by_id,
        scoped_project_ids=scoped_project_ids,
    )
    validation_queue_cockpit = _build_validation_queue_cockpit(
        company_id=company_id,
        projects_by_id=projects_by_id,
        scoped_project_ids=scoped_project_ids,
    )
    recent_documents = _build_recent_documents(
        company_id=company_id,
        projects_by_id=projects_by_id,
        scoped_project_ids=scoped_project_ids,
    )

    return {
        "company_id": company_id,
        "counts": {
            "projects_total": len(projects),
            "active_projects": len([project for project in projects if project.status in ACTIVE_PROJECT_STATUSES]),
            "delayed_projects": len(delayed_projects),
            "completed_projects": len([project for project in projects if project.status in {"completed", "final_acceptance"}]),
            "projects_in_preparation": len([project for project in projects if project.status in {"draft", "preparation", "submitted"}]),
            "assignments": len(assignments),
            "overdue_tasks": len(overdue_tasks),
            "critical_risks": len([risk for risk in risks if risk.severity == "critical"]),
            "upcoming_submissions": len(upcoming_submissions),
        },
        "financials": {
            "budget_total": budget_total,
            "expenses_total": expenses_total,
            "revenues_total": revenues_total,
            "margin_total": round(revenues_total - expenses_total, 2),
            "budget_consumed_percent": round((expenses_total / budget_total) * 100, 2) if budget_total else 0.0,
        },
        "alerts": {
            "budget_overruns": len([item for item in items if item["budget_consumed_percent"] > 100]),
            "overdue_tasks": len(overdue_tasks),
            "critical_risks": len([risk for risk in risks if risk.severity == "critical"]),
            "upcoming_submissions": len(upcoming_submissions),
        },
        "recent_documents": recent_documents,
        "cockpit": {
            "profitability": {
                "count": len(profitability_items),
                "items": profitability_items[:16],
            },
            "capacity": capacity_cockpit,
            "budget_progress_alerts": {
                "count": len(budget_progress_alert_items),
                "items": budget_progress_alert_items[:16],
            },
            "validation_queue": validation_queue_cockpit,
        },
        "items": items,
    }
