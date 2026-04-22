from __future__ import annotations

from collections import defaultdict
from datetime import date, time
from typing import Any

from app.core.audit import log_audit_event
from app.extensions import db
from app.models.attendance import AttendancePolicy, AttendanceRecord
from app.models.project import Project
from app.models.user import User


TERMINAL_PROJECT_STATUSES = {"completed", "final_acceptance", "archived", "cancelled"}
DEFAULT_START_TIME = time(7, 30)
DEFAULT_END_TIME = time(17, 15)
DEFAULT_GRACE_MINUTES = 10
DEFAULT_OVERTIME_THRESHOLD_MINUTES = 60


class AttendanceError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _serialize_time(value: time | None) -> str | None:
    return value.strftime("%H:%M") if value is not None else None


def _time_to_minutes(value: time | None) -> int:
    if value is None:
        return 0
    return value.hour * 60 + value.minute


def _full_name(user: User) -> str:
    return " ".join(part for part in [user.first_name, user.last_name] if part).strip() or user.email


def _serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "full_name": _full_name(user),
        "email": user.email,
        "employee_number": user.employee_number,
        "job_title": user.job_title,
        "department": user.department,
        "account_status": user.account_status,
    }


def _serialize_project(project: Project | None) -> dict[str, Any] | None:
    if project is None:
        return None
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "status": project.status,
    }


def _serialize_policy(policy: AttendancePolicy) -> dict[str, Any]:
    return {
        "id": policy.id,
        "company_id": policy.company_id,
        "default_start_time": _serialize_time(policy.default_start_time),
        "default_end_time": _serialize_time(policy.default_end_time),
        "grace_minutes": policy.grace_minutes,
        "overtime_threshold_minutes": policy.overtime_threshold_minutes,
        "timezone": policy.timezone,
        "created_at": policy.created_at.isoformat() if policy.created_at else None,
        "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
    }


def _empty_status_counts() -> dict[str, int]:
    return {"present": 0, "late": 0, "absent": 0, "overtime": 0}


def _serialize_record(record: AttendanceRecord, *, user: User | None = None, project: Project | None = None) -> dict[str, Any]:
    resolved_user = user or User.query.filter_by(id=record.user_id).first()
    resolved_project = project or (Project.query.filter_by(id=record.project_id).first() if record.project_id else None)
    return {
        "id": record.id,
        "company_id": record.company_id,
        "user_id": record.user_id,
        "user": _serialize_user(resolved_user) if resolved_user else None,
        "project_id": record.project_id,
        "project": _serialize_project(resolved_project),
        "attendance_date": record.attendance_date.isoformat() if record.attendance_date else None,
        "status": record.status,
        "arrival_time": _serialize_time(record.arrival_time),
        "departure_time": _serialize_time(record.departure_time),
        "minutes_late": record.minutes_late,
        "overtime_minutes": record.overtime_minutes,
        "notes": record.notes,
        "source": record.source,
        "created_by_user_id": record.created_by_user_id,
        "updated_by_user_id": record.updated_by_user_id,
        "validated_by_user_id": record.validated_by_user_id,
        "validated_at": record.validated_at.isoformat() if record.validated_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


def _get_or_create_policy(company_id: int) -> AttendancePolicy:
    policy = AttendancePolicy.query.filter_by(company_id=company_id).first()
    if policy is not None:
        return policy

    policy = AttendancePolicy(
        company_id=company_id,
        default_start_time=DEFAULT_START_TIME,
        default_end_time=DEFAULT_END_TIME,
        grace_minutes=DEFAULT_GRACE_MINUTES,
        overtime_threshold_minutes=DEFAULT_OVERTIME_THRESHOLD_MINUTES,
    )
    db.session.add(policy)
    db.session.flush()
    return policy


def _ensure_company_user(company_id: int, user_id: int) -> User:
    row = User.query.filter(
        User.id == int(user_id),
        User.company_id == company_id,
        User.deleted_at.is_(None),
    ).first()
    if row is None:
        raise AttendanceError("User not found in the active company", status_code=404, code="attendance_user_not_found")
    return row


def _ensure_project(company_id: int, project_id: int | None) -> Project | None:
    if project_id in (None, ""):
        return None

    row = Project.query.filter(
        Project.id == int(project_id),
        Project.company_id == company_id,
        Project.deleted_at.is_(None),
    ).first()
    if row is None:
        raise AttendanceError("Project not found in the active company", status_code=404, code="attendance_project_not_found")
    return row


def _derive_status_and_metrics(
    *,
    policy: AttendancePolicy,
    status: str | None,
    arrival_time: time | None,
    departure_time: time | None,
) -> tuple[str, int, int, time | None, time | None]:
    if status == "absent":
        return "absent", 0, 0, None, None

    if arrival_time is None:
        raise AttendanceError(
            "arrival_time is required unless status is absent",
            status_code=400,
            code="attendance_arrival_required",
        )

    baseline_arrival = _time_to_minutes(policy.default_start_time) + int(policy.grace_minutes or 0)
    baseline_departure = _time_to_minutes(policy.default_end_time)
    arrival_minutes = _time_to_minutes(arrival_time)
    departure_minutes = _time_to_minutes(departure_time) if departure_time is not None else 0

    minutes_late = max(0, arrival_minutes - baseline_arrival)
    overtime_minutes = max(0, departure_minutes - baseline_departure) if departure_time is not None else 0

    if departure_time is not None and overtime_minutes >= int(policy.overtime_threshold_minutes or 0) and overtime_minutes > 0:
        resolved_status = "overtime"
    elif minutes_late > 0:
        resolved_status = "late"
    else:
        resolved_status = "present"

    return resolved_status, minutes_late, overtime_minutes, arrival_time, departure_time


def _build_query(
    *,
    company_id: int,
    user_id: int | None = None,
    project_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = AttendanceRecord.query.filter(AttendanceRecord.company_id == company_id)

    if user_id is not None:
        query = query.filter(AttendanceRecord.user_id == user_id)
    if project_id is not None:
        query = query.filter(AttendanceRecord.project_id == project_id)
    if status:
        query = query.filter(AttendanceRecord.status == status)
    if date_from is not None:
        query = query.filter(AttendanceRecord.attendance_date >= date_from)
    if date_to is not None:
        query = query.filter(AttendanceRecord.attendance_date <= date_to)

    return query


def get_attendance_policy(*, company_id: int) -> dict[str, Any]:
    policy = _get_or_create_policy(company_id)
    db.session.commit()
    return _serialize_policy(policy)


def update_attendance_policy(*, company_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    policy = _get_or_create_policy(company_id)

    if payload.get("default_start_time") is not None:
        policy.default_start_time = payload["default_start_time"]
    if payload.get("default_end_time") is not None:
        policy.default_end_time = payload["default_end_time"]
    if payload.get("grace_minutes") is not None:
        policy.grace_minutes = int(payload["grace_minutes"])
    if payload.get("overtime_threshold_minutes") is not None:
        policy.overtime_threshold_minutes = int(payload["overtime_threshold_minutes"])
    if "timezone" in payload:
        policy.timezone = _normalize_text(payload.get("timezone"))

    log_audit_event(
        module="attendance",
        action="policy_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="attendance_policy",
        target_id=policy.id,
        description="Attendance policy updated",
        details=_serialize_policy(policy),
    )
    db.session.commit()
    return _serialize_policy(policy)


def list_attendance_records(
    *,
    company_id: int,
    user_id: int | None = None,
    project_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, Any]]:
    rows = (
        _build_query(
            company_id=company_id,
            user_id=user_id,
            project_id=project_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        .order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.created_at.desc())
        .all()
    )

    user_ids = sorted({row.user_id for row in rows})
    project_ids = sorted({row.project_id for row in rows if row.project_id is not None})
    users_by_id = {
        row.id: row for row in User.query.filter(User.id.in_(user_ids)).all()
    } if user_ids else {}
    projects_by_id = {
        row.id: row for row in Project.query.filter(Project.id.in_(project_ids)).all()
    } if project_ids else {}

    return [
        _serialize_record(row, user=users_by_id.get(row.user_id), project=projects_by_id.get(row.project_id))
        for row in rows
    ]


def create_attendance_record(*, company_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    policy = _get_or_create_policy(company_id)
    user = _ensure_company_user(company_id, int(payload["user_id"]))
    project = _ensure_project(company_id, payload.get("project_id"))
    attendance_date = payload.get("attendance_date")

    existing = AttendanceRecord.query.filter_by(
        company_id=company_id,
        user_id=user.id,
        attendance_date=attendance_date,
    ).first()
    if existing is not None:
        raise AttendanceError(
            "An attendance record already exists for this employee and date",
            status_code=409,
            code="attendance_duplicate_record",
        )

    status, minutes_late, overtime_minutes, arrival_time, departure_time = _derive_status_and_metrics(
        policy=policy,
        status=payload.get("status"),
        arrival_time=payload.get("arrival_time"),
        departure_time=payload.get("departure_time"),
    )

    row = AttendanceRecord(
        company_id=company_id,
        user_id=user.id,
        project_id=project.id if project else None,
        attendance_date=attendance_date,
        status=status,
        arrival_time=arrival_time,
        departure_time=departure_time,
        minutes_late=minutes_late,
        overtime_minutes=overtime_minutes,
        notes=_normalize_text(payload.get("notes")),
        source=str(payload.get("source") or "manual").strip().lower() or "manual",
        created_by_user_id=actor_user_id,
        updated_by_user_id=actor_user_id,
    )
    db.session.add(row)
    db.session.flush()

    log_audit_event(
        module="attendance",
        action="record_created",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="attendance_record",
        target_id=row.id,
        description="Attendance record created",
        details={
            "user_id": user.id,
            "project_id": project.id if project else None,
            "attendance_date": attendance_date.isoformat() if attendance_date else None,
            "status": status,
            "minutes_late": minutes_late,
            "overtime_minutes": overtime_minutes,
        },
    )
    db.session.commit()
    return _serialize_record(row, user=user, project=project)


def update_attendance_record(*, company_id: int, actor_user_id: int, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = AttendanceRecord.query.filter_by(company_id=company_id, id=record_id).first()
    if row is None:
        raise AttendanceError("Attendance record not found", status_code=404, code="attendance_record_not_found")

    policy = _get_or_create_policy(company_id)
    user = _ensure_company_user(company_id, int(payload.get("user_id") or row.user_id))
    project = _ensure_project(company_id, payload.get("project_id") if "project_id" in payload else row.project_id)
    attendance_date = payload.get("attendance_date") if "attendance_date" in payload else row.attendance_date

    duplicate = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.attendance_date == attendance_date,
            AttendanceRecord.id != row.id,
        ).first()
    )
    if duplicate is not None:
        raise AttendanceError(
            "Another attendance record already exists for this employee and date",
            status_code=409,
            code="attendance_duplicate_record",
        )

    next_status, minutes_late, overtime_minutes, arrival_time, departure_time = _derive_status_and_metrics(
        policy=policy,
        status=payload.get("status") if "status" in payload else row.status,
        arrival_time=payload.get("arrival_time") if "arrival_time" in payload else row.arrival_time,
        departure_time=payload.get("departure_time") if "departure_time" in payload else row.departure_time,
    )

    row.user_id = user.id
    row.project_id = project.id if project else None
    row.attendance_date = attendance_date
    row.status = next_status
    row.arrival_time = arrival_time
    row.departure_time = departure_time
    row.minutes_late = minutes_late
    row.overtime_minutes = overtime_minutes
    if "notes" in payload:
        row.notes = _normalize_text(payload.get("notes"))
    if "source" in payload and payload.get("source") is not None:
        row.source = str(payload.get("source") or "").strip().lower() or row.source
    row.updated_by_user_id = actor_user_id

    log_audit_event(
        module="attendance",
        action="record_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="attendance_record",
        target_id=row.id,
        description="Attendance record updated",
        details={
            "user_id": row.user_id,
            "project_id": row.project_id,
            "attendance_date": row.attendance_date.isoformat() if row.attendance_date else None,
            "status": row.status,
            "minutes_late": row.minutes_late,
            "overtime_minutes": row.overtime_minutes,
        },
    )
    db.session.commit()
    return _serialize_record(row, user=user, project=project)


def get_attendance_summary(
    *,
    company_id: int,
    user_id: int | None = None,
    project_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    rows = (
        _build_query(
            company_id=company_id,
            user_id=user_id,
            project_id=project_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        .order_by(AttendanceRecord.attendance_date.asc(), AttendanceRecord.created_at.asc())
        .all()
    )

    counts = _empty_status_counts()
    trend_map: dict[str, dict[str, Any]] = defaultdict(
        _empty_status_counts
    )
    project_groups: dict[int | str, dict[str, Any]] = defaultdict(
        lambda: {
            "total_records": 0,
            "counts": _empty_status_counts(),
            "late_minutes_total": 0,
            "overtime_minutes_total": 0,
            "tracked_users": set(),
            "rows": [],
        }
    )
    late_minutes_total = 0
    overtime_minutes_total = 0
    tracked_users: set[int] = set()
    user_ids: set[int] = set()
    project_ids: set[int] = set()

    for row in rows:
        counts[row.status] = counts.get(row.status, 0) + 1
        tracked_users.add(row.user_id)
        user_ids.add(row.user_id)
        if row.project_id is not None:
            project_ids.add(row.project_id)
        late_minutes_total += int(row.minutes_late or 0)
        overtime_minutes_total += int(row.overtime_minutes or 0)
        key = row.attendance_date.isoformat()
        trend_map[key][row.status] = trend_map[key].get(row.status, 0) + 1

        project_key: int | str = row.project_id if row.project_id is not None else "__unassigned__"
        bucket = project_groups[project_key]
        bucket["total_records"] += 1
        bucket["counts"][row.status] = bucket["counts"].get(row.status, 0) + 1
        bucket["late_minutes_total"] += int(row.minutes_late or 0)
        bucket["overtime_minutes_total"] += int(row.overtime_minutes or 0)
        bucket["tracked_users"].add(row.user_id)
        bucket["rows"].append(row)

    trend = [
        {
            "date": day,
            "label": day[5:].replace("-", "/"),
            **values,
        }
        for day, values in sorted(trend_map.items())[-7:]
    ]

    users_by_id = {
        row.id: row for row in User.query.filter(User.id.in_(sorted(user_ids))).all()
    } if user_ids else {}
    projects_by_id = {
        row.id: row for row in Project.query.filter(Project.id.in_(sorted(project_ids))).all()
    } if project_ids else {}

    by_project = []
    for project_key, bucket in project_groups.items():
        grouped_rows = sorted(
            bucket["rows"],
            key=lambda item: (
                item.attendance_date.isoformat() if item.attendance_date else "",
                item.created_at.isoformat() if item.created_at else "",
            ),
            reverse=True,
        )
        project = projects_by_id.get(project_key) if isinstance(project_key, int) else None
        by_project.append(
            {
                "project_id": project.id if project is not None else None,
                "project": _serialize_project(project),
                "label": project.name if project is not None else "unassigned",
                "total_records": bucket["total_records"],
                "employees_tracked": len(bucket["tracked_users"]),
                "present_count": bucket["counts"]["present"],
                "late_count": bucket["counts"]["late"],
                "absent_count": bucket["counts"]["absent"],
                "overtime_count": bucket["counts"]["overtime"],
                "late_minutes_total": bucket["late_minutes_total"],
                "overtime_minutes_total": bucket["overtime_minutes_total"],
                "latest_attendance_date": grouped_rows[0].attendance_date.isoformat() if grouped_rows else None,
                "recent_records": [
                    _serialize_record(
                        grouped_row,
                        user=users_by_id.get(grouped_row.user_id),
                        project=projects_by_id.get(grouped_row.project_id),
                    )
                    for grouped_row in grouped_rows[:4]
                ],
            }
        )

    by_project.sort(
        key=lambda item: (
            item["project"] is None,
            (item["project"] or {}).get("name", item["label"]).lower(),
        )
    )

    policy = _get_or_create_policy(company_id)
    db.session.commit()

    return {
        "company_id": company_id,
        "policy": _serialize_policy(policy),
        "summary": {
            "total_records": len(rows),
            "employees_tracked": len(tracked_users),
            "present_count": counts["present"],
            "late_count": counts["late"],
            "absent_count": counts["absent"],
            "overtime_count": counts["overtime"],
            "late_minutes_total": late_minutes_total,
            "overtime_minutes_total": overtime_minutes_total,
        },
        "by_status": counts,
        "trend": trend,
        "by_project": by_project,
    }


def get_attendance_support_data(*, company_id: int) -> dict[str, Any]:
    policy = _get_or_create_policy(company_id)

    users = (
        User.query.filter(
            User.company_id == company_id,
            User.deleted_at.is_(None),
            User.user_type.in_(("company_admin", "employee")),
        )
        .order_by(User.first_name.asc(), User.last_name.asc(), User.email.asc())
        .all()
    )
    projects = (
        Project.query.filter(
            Project.company_id == company_id,
            Project.deleted_at.is_(None),
            Project.status.notin_(TERMINAL_PROJECT_STATUSES),
        )
        .order_by(Project.name.asc())
        .all()
    )
    db.session.commit()

    return {
        "policy": _serialize_policy(policy),
        "employees": [_serialize_user(row) for row in users],
        "projects": [_serialize_project(row) for row in projects],
        "statuses": ["present", "late", "absent", "overtime"],
        "sources": ["manual", "manager", "import"],
    }
